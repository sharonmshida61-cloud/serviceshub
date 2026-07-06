const express = require("express");
const prisma = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();
router.use(requireAuth, requireRole("ADMIN"));

router.get("/stats", async (req, res) => {
  const [users, businesses, bookings, revenue] = await Promise.all([
    prisma.user.count(),
    prisma.business.count(),
    prisma.booking.count(),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
  ]);
  const byStatus = await prisma.business.groupBy({ by: ["status"], _count: true });
  res.json({
    users,
    businesses,
    bookings,
    revenueCents: revenue._sum.amountCents || 0,
    businessesByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
  });
});

router.get("/businesses/pending", async (req, res) => {
  const pending = await prisma.business.findMany({
    where: { status: "PENDING" },
    include: { category: true, owner: true },
  });
  res.json(pending);
});

router.patch("/businesses/:id/status", async (req, res) => {
  const { status } = req.body || {};
  if (!["APPROVED", "REJECTED", "SUSPENDED", "PENDING"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const business = await prisma.business.update({ where: { id: req.params.id }, data: { status } });
  res.json(business);
});

router.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  res.json(users.map(({ passwordHash, ...u }) => u));
});

router.patch("/users/:id/role", async (req, res) => {
  const { role } = req.body || {};
  if (!["CUSTOMER", "BUSINESS_OWNER", "EMPLOYEE", "ADMIN"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

module.exports = router;
