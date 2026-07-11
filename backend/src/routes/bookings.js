const express = require("express");
const prisma = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

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
    where: { customerId: req.user.id },
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
  if (activeRole === "EMPLOYEE") {
    const staffRecord = await prisma.businessEmployee.findFirst({
      where: { businessId: business.id, userId: req.user.id, active: true },
    });
    if (!staffRecord) return res.status(403).json({ error: "You are not staff at this business" });
  }

  const bookings = await prisma.booking.findMany({
    where: { businessId: business.id },
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
  let isStaff = false;
  if (activeRole === "EMPLOYEE") {
    isStaff = !!(await prisma.businessEmployee.findFirst({
      where: { businessId: booking.businessId, userId: req.user.id, active: true },
    }));
  }

  // Customers may only cancel their own pending/confirmed bookings.
  if (isCustomer && !isOwner && !isStaff && !isAdmin) {
    if (status !== "CANCELLED") return res.status(403).json({ error: "Customers can only cancel bookings" });
  } else if (!isOwner && !isStaff && !isAdmin) {
    return res.status(403).json({ error: "You do not have permission to update this booking" });
  }

  const updated = await prisma.booking.update({ where: { id: req.params.id }, data: { status } });
  res.json(updated);
});

module.exports = router;
