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
  const { category, city, minRating, q } = req.query;
  const where = { status: "APPROVED" };

  if (category) {
    const cat = await prisma.category.findUnique({ where: { slug: category } });
    if (!cat) return res.json([]);
    where.categoryId = cat.id;
  }
  if (city) where.city = { contains: city };
  if (minRating) where.avgRating = { gte: Number(minRating) };
  if (q) where.name = { contains: q };

  let businesses = await prisma.business.findMany({
    where,
    include: { category: true, services: { where: { active: true } } },
  });

  const sort = req.query.sort || "rating";
  if (sort === "rating") businesses.sort((a, b) => b.avgRating - a.avgRating);
  if (sort === "newest") businesses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (sort === "price") {
    const minPrice = (b) => Math.min(...b.services.map((s) => s.priceCents), Infinity);
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

router.get("/:id", async (req, res) => {
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
  if (business.ownerId !== req.user.id && req.user.role !== "ADMIN") {
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
  if (business.ownerId !== req.user.id && req.user.role !== "ADMIN") {
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
  if (business.ownerId !== req.user.id && req.user.role !== "ADMIN") {
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
  if (business.ownerId !== req.user.id && req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Only the business owner can set availability" });
  }
  const { dayOfWeek, startTime, endTime, employeeId } = req.body || {};
  const slot = await prisma.availability.create({
    data: { businessId: business.id, dayOfWeek, startTime, endTime, employeeId: employeeId || null },
  });
  res.status(201).json(slot);
});

module.exports = router;
