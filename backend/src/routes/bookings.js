const express = require("express");
const prisma = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { permissionsFor } = require("../utils/staffPermissions");

const router = express.Router();

// Customer creates a booking request for a service at a business.
router.post("/", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  const { serviceId, scheduledAt, notes, employeeId } = req.body || {};
  if (!serviceId || !scheduledAt) return res.status(400).json({ error: "serviceId and scheduledAt are required" });

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) return res.status(404).json({ error: "Service not found" });

  const booking = await prisma.booking.create({
    data: {
      customerId: req.user.id,
      businessId: service.businessId,
      serviceId: service.id,
      employeeId: employeeId || null,
      scheduledAt: new Date(scheduledAt),
      priceCents: service.priceCents,
      notes,
      status: "PENDING",
    },
    include: { service: true, business: true },
  });
  res.status(201).json(booking);
});

// Bookings for the logged-in customer
router.get("/mine", requireAuth, async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { customerId: req.user.id, customerDeletedAt: null },
    include: { service: true, business: true, payment: true, review: true },
    orderBy: { scheduledAt: "desc" },
  });
  res.json(bookings);
});

// Bookings for a business the user owns/works at (owner + employee dashboard)
router.get("/business/:businessId", requireAuth, requireRole("BUSINESS_OWNER", "EMPLOYEE", "ADMIN"), async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.businessId } });
  if (!business) return res.status(404).json({ error: "Business not found" });

  const activeRole = req.user.currentRole || req.user.role;
  if (activeRole === "BUSINESS_OWNER" && business.ownerId !== req.user.id) {
    return res.status(403).json({ error: "Not your business" });
  }

  const where = { businessId: business.id };
  if (activeRole === "EMPLOYEE") {
    const staffRecord = await prisma.businessEmployee.findFirst({
      where: { businessId: business.id, userId: req.user.id, active: true },
    });
    if (!staffRecord) return res.status(403).json({ error: "You are not staff at this business" });

    const perms = permissionsFor(staffRecord.title);
    if (perms.scope === "none") {
      return res.status(403).json({ error: `Your role (${staffRecord.title}) does not open the booking list` });
    }
    // A tradesperson works their own jobs plus whatever is on today's board and
    // not yet claimed, so nothing they need goes unnoticed.
    if (perms.scope === "mine") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      where.OR = [
        { employeeId: staffRecord.id },
        { employeeId: null, scheduledAt: { gte: startOfDay, lt: endOfDay } },
      ];
    }
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: { service: true, customer: true, payment: true },
    orderBy: { scheduledAt: "asc" },
  });
  res.json(bookings);
});

// Update booking status: confirm / decline / complete / cancel
router.patch("/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body || {};
  const allowed = ["CONFIRMED", "DECLINED", "COMPLETED", "CANCELLED"];
  if (!allowed.includes(status)) return res.status(400).json({ error: `status must be one of ${allowed.join(", ")}` });

  const booking = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { business: true } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const activeRole = req.user.currentRole || req.user.role;
  const isCustomer = req.user.id === booking.customerId;
  const isOwner = activeRole === "BUSINESS_OWNER" && req.user.id === booking.business.ownerId;
  const isAdmin = activeRole === "ADMIN";
  const staffRecord =
    activeRole === "EMPLOYEE"
      ? await prisma.businessEmployee.findFirst({
          where: { businessId: booking.businessId, userId: req.user.id, active: true },
        })
      : null;
  const isStaff = !!staffRecord;

  // Customers may only cancel their own pending/confirmed bookings.
  if (isCustomer && !isOwner && !isStaff && !isAdmin) {
    if (status !== "CANCELLED") return res.status(403).json({ error: "Customers can only cancel bookings" });
  } else if (!isOwner && !isStaff && !isAdmin) {
    return res.status(403).json({ error: "You do not have permission to update this booking" });
  }

  // Turning a booking down is the owner's call, or a manager's — a tradesperson
  // working the day can confirm and finish, not reject someone else's job.
  if (isStaff && !isOwner && !isAdmin) {
    const perms = permissionsFor(staffRecord.title);
    if (!perms.assign && ["DECLINED", "CANCELLED"].includes(status)) {
      return res.status(403).json({ error: `Your role (${staffRecord.title}) cannot decline or cancel bookings` });
    }
  }

  const updated = await prisma.booking.update({ where: { id: req.params.id }, data: { status } });
  res.json(updated);
});

// Hand a booking to a teammate — or back to the unclaimed pool.
router.patch("/:id/assign", requireAuth, async (req, res) => {
  const { employeeId } = req.body || {};
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { business: true } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const activeRole = req.user.currentRole || req.user.role;
  if (activeRole !== "ADMIN") {
    const isOwner = booking.business.ownerId === req.user.id;
    const membership = isOwner
      ? null
      : await prisma.businessEmployee.findFirst({
          where: { businessId: booking.businessId, userId: req.user.id, active: true },
        });
    if (!isOwner && !(membership && permissionsFor(membership.title).assign)) {
      return res.status(403).json({ error: "Only the owner or a manager can assign jobs" });
    }
  }

  let staff = null;
  const wanted = String(employeeId ?? "").trim();
  if (wanted) {
    staff = await prisma.businessEmployee.findFirst({
      where: { id: wanted, businessId: booking.businessId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    if (!staff) return res.status(400).json({ error: "That teammate is not on this listing" });
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { employeeId: staff ? staff.id : null },
    include: { service: true, customer: true, payment: true },
  });
  res.json({
    ...updated,
    assignedTo: staff
      ? { id: staff.id, name: staff.staffName || staff.user?.name || "Team member", title: staff.title }
      : null,
  });
});

// Customer moves their own booking to a new time, or reactivates a cancelled one.
router.patch("/:id", requireAuth, async (req, res) => {
  const { scheduledAt, notes } = req.body || {};
  if (!scheduledAt) return res.status(400).json({ error: "scheduledAt is required" });

  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime())) return res.status(400).json({ error: "scheduledAt is not a valid date" });

  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.customerId !== req.user.id) return res.status(403).json({ error: "Not your booking" });

  const recoverable = ["PENDING", "CONFIRMED", "CANCELLED"];
  if (!recoverable.includes(booking.status)) {
    return res.status(409).json({ error: `A ${booking.status.toLowerCase()} booking can no longer be moved` });
  }
  if (when.getTime() < Date.now()) return res.status(400).json({ error: "Choose a time in the future" });

  // Cancelled bookings are reactivated as PENDING so the provider approves the new slot.
  // Confirmed bookings also drop back to PENDING when the time changes.
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      scheduledAt: when,
      ...(notes !== undefined ? { notes } : {}),
      status: "PENDING",
    },
    include: { service: true, business: true, payment: true, review: true },
  });
  res.json(updated);
});

// Customer updates notes on their booking (any status).
router.patch("/:id/notes", requireAuth, async (req, res) => {
  const { notes } = req.body || {};
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.customerId !== req.user.id) return res.status(403).json({ error: "Not your booking" });

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { notes: notes ?? null },
    include: { service: true, business: true, payment: true, review: true },
  });
  res.json(updated);
});

// Customer removes a booking from their own list. The business keeps its record.
router.delete("/:id", requireAuth, async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.customerId !== req.user.id) return res.status(403).json({ error: "Not your booking" });

  // Completed bookings are soft-deleted from the customer's view only.
  // Non-completed bookings are also cancelled first so the provider is aware.
  const data = { customerDeletedAt: new Date() };
  if (!["COMPLETED", "CANCELLED", "DECLINED"].includes(booking.status)) {
    data.status = "CANCELLED";
  }

  await prisma.booking.update({ where: { id: booking.id }, data });
  res.json({ ok: true });
});

module.exports = router;
