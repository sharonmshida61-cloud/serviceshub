const express = require("express");
const prisma = require("../utils/prisma");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();

function parseJsonFields(biz) {
  return { ...biz, attributes: JSON.parse(biz.attributes || "{}") };
}

// ---------------------------------------------------------------------------
// DISCOVERY: search + filter + compare. This single endpoint powers the
// "discover" and "compare" experience across every category.
// Query params: category=slug, city=, minRating=, sort=rating|price|newest
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  const { category, city, minRating, q, sort = "rating" } = req.query;
  const where = { status: "APPROVED" };

  if (category) {
    const cat = await prisma.category.findUnique({ where: { slug: category } });
    if (!cat) return res.json([]);
    where.categoryId = cat.id;
  }
  if (minRating) where.avgRating = { gte: Number(minRating) };

  let businesses = await prisma.business.findMany({
    where,
    include: { category: true, services: { where: { active: true } } },
  });

  // Case-insensitive JS filtering (SQLite doesn't support Prisma mode: insensitive)
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    businesses = businesses.filter(
      (b) =>
        b.name.toLowerCase().includes(term) ||
        (b.description && b.description.toLowerCase().includes(term)) ||
        (b.city && b.city.toLowerCase().includes(term))
    );
  }
  if (city && city.trim()) {
    const cityTerm = city.trim().toLowerCase();
    businesses = businesses.filter(
      (b) => b.city && b.city.toLowerCase().includes(cityTerm)
    );
  }

  // Sorting
  if (sort === "rating") businesses.sort((a, b) => b.avgRating - a.avgRating);
  else if (sort === "newest") businesses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  else if (sort === "price") {
    const minPrice = (b) =>
      b.services.length ? Math.min(...b.services.map((s) => s.priceCents)) : Infinity;
    businesses.sort((a, b) => minPrice(a) - minPrice(b));
  }

  res.json(businesses.map(parseJsonFields));
});

// Businesses owned by the current user (for the Business Owner dashboard)
router.get("/mine", requireAuth, requireRole("BUSINESS_OWNER", "ADMIN"), async (req, res) => {
  const businesses = await prisma.business.findMany({
    where: { ownerId: req.user.id },
    include: { category: true, services: true, employees: { include: { user: true } } },
  });
  res.json(businesses.map(parseJsonFields));
});

// ---------------------------------------------------------------------------
// CUSTOMERS: all customers who have booked this business, with full history
// Only the business owner or an admin can access this.
// ---------------------------------------------------------------------------
router.get("/:id/customers", requireAuth, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business) return res.status(404).json({ error: "Business not found" });

  const activeRole = req.user.currentRole || req.user.role;
  if (business.ownerId !== req.user.id && activeRole !== "ADMIN") {
    return res.status(403).json({ error: "Only the business owner can view customer details" });
  }

  // Pull every booking for this business, including the customer profile and payment
  const bookings = await prisma.booking.findMany({
    where: { businessId: req.params.id },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          bannedAt: true,
          banReason: true,
        },
      },
      service: { select: { id: true, name: true, priceCents: true, durationMinutes: true } },
      payment: true,
      review: { select: { id: true, rating: true, comment: true, createdAt: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });

  // Group bookings by customer so the owner sees one card per customer
  const customerMap = new Map();
  for (const booking of bookings) {
    const cid = booking.customer.id;
    if (!customerMap.has(cid)) {
      customerMap.set(cid, {
        customer: booking.customer,
        bookings: [],
        totalSpentCents: 0,
        paidCount: 0,
        unpaidCount: 0,
        completedCount: 0,
        cancelledCount: 0,
      });
    }
    const entry = customerMap.get(cid);
    entry.bookings.push(booking);

    if (booking.payment?.status === "PAID") {
      entry.totalSpentCents += booking.payment.amountCents;
      entry.paidCount++;
    } else if (["PENDING", "CONFIRMED"].includes(booking.status) && !booking.payment) {
      entry.unpaidCount++;
    }
    if (booking.status === "COMPLETED") entry.completedCount++;
    if (booking.status === "CANCELLED" || booking.status === "DECLINED") entry.cancelledCount++;
  }

  res.json(Array.from(customerMap.values()));
});

// Get a single business by ID
router.get("/:id", optionalAuth, async (req, res) => {
  const business = await prisma.business.findUnique({
    where: { id: req.params.id },
    include: {
      category: true,
      services: { where: { active: true } },
      reviews: { include: { customer: true }, orderBy: { createdAt: "desc" } },
      employees: { include: { user: true }, where: { active: true } },
      availability: true,
    },
  });
  if (!business) return res.status(404).json({ error: "Business not found" });

  // Non-approved listings are only visible to their owner or an admin
  if (business.status !== "APPROVED") {
    const activeRole = req.user?.currentRole || req.user?.role;
    const isOwner = req.user?.id === business.ownerId;
    const isAdmin = activeRole === "ADMIN";
    if (!isOwner && !isAdmin) {
      return res.status(404).json({ error: "Business not found" });
    }
  }

  res.json(parseJsonFields(business));
});

// Create a new business listing (defaults to PENDING until admin approves)
router.post("/", requireAuth, requireRole("BUSINESS_OWNER", "ADMIN"), async (req, res) => {
  const { name, description, categorySlug, address, city, phone, email, attributes } = req.body || {};
  if (!name || !categorySlug) return res.status(400).json({ error: "name and categorySlug are required" });

  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) return res.status(400).json({ error: "Unknown category" });

  const business = await prisma.business.create({
    data: {
      name,
      description,
      categoryId: category.id,
      ownerId: req.user.id,
      address,
      city,
      phone,
      email,
      attributes: JSON.stringify(attributes || {}),
      status: "PENDING",
    },
  });
  res.status(201).json(parseJsonFields(business));
});

router.patch("/:id", requireAuth, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business) return res.status(404).json({ error: "Business not found" });
  const activeRole = req.user.currentRole || req.user.role;
  if (business.ownerId !== req.user.id && activeRole !== "ADMIN") {
    return res.status(403).json({ error: "Only the business owner or an admin can edit this listing" });
  }

  const { name, description, address, city, phone, email, attributes } = req.body || {};
  const updated = await prisma.business.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(attributes !== undefined && { attributes: JSON.stringify(attributes) }),
    },
  });
  res.json(parseJsonFields(updated));
});

// -------------------- Employees (owner manages staff) ----------------------

router.post("/:id/employees", requireAuth, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business) return res.status(404).json({ error: "Business not found" });
  const activeRole = req.user.currentRole || req.user.role;
  if (business.ownerId !== req.user.id && activeRole !== "ADMIN") {
    return res.status(403).json({ error: "Only the business owner can add employees" });
  }
  const { userId, title } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId is required (the employee must already have an account)" });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "No user found with that id" });

  // Promote the user to EMPLOYEE role if they were a plain customer
  if (user.role === "CUSTOMER") {
    await prisma.user.update({ where: { id: userId }, data: { role: "EMPLOYEE" } });
  }

  const employee = await prisma.businessEmployee.create({
    data: { businessId: business.id, userId, title: title || "Staff" },
  });
  res.status(201).json(employee);
});

router.delete("/:id/employees/:employeeId", requireAuth, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business) return res.status(404).json({ error: "Business not found" });
  const activeRole = req.user.currentRole || req.user.role;
  if (business.ownerId !== req.user.id && activeRole !== "ADMIN") {
    return res.status(403).json({ error: "Only the business owner can remove employees" });
  }
  await prisma.businessEmployee.update({
    where: { id: req.params.employeeId },
    data: { active: false },
  });
  res.status(204).end();
});

// -------------------- Availability -----------------------------------------

router.post("/:id/availability", requireAuth, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business) return res.status(404).json({ error: "Business not found" });
  const activeRole = req.user.currentRole || req.user.role;
  if (business.ownerId !== req.user.id && activeRole !== "ADMIN") {
    return res.status(403).json({ error: "Only the business owner can set availability" });
  }
  const { dayOfWeek, startTime, endTime, employeeId } = req.body || {};
  const slot = await prisma.availability.create({
    data: { businessId: business.id, dayOfWeek, startTime, endTime, employeeId: employeeId || null },
  });
  res.status(201).json(slot);
});

module.exports = router;
