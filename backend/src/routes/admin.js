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

// Ban a user (soft ban — account stays in DB, all requests blocked)
router.patch("/users/:id/ban", async (req, res) => {
  const { reason } = req.body || {};
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: "You cannot ban your own account" });
  }
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.role === "ADMIN") {
    return res.status(403).json({ error: "Admin accounts cannot be banned" });
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { bannedAt: new Date(), banReason: reason || null },
  });

  // Suspend all their businesses too so they stop appearing in search
  await prisma.business.updateMany({
    where: { ownerId: req.params.id, status: "APPROVED" },
    data: { status: "SUSPENDED" },
  });

  const { passwordHash, ...safe } = user;
  res.json(safe);
});

// Unban a user
router.patch("/users/:id/unban", async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "User not found" });

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { bannedAt: null, banReason: null },
  });

  const { passwordHash, ...safe } = user;
  res.json(safe);
});

// Permanently delete a user and all their data
router.delete("/users/:id", async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.role === "ADMIN") {
    return res.status(403).json({ error: "Admin accounts cannot be deleted this way" });
  }

  // Delete in dependency order to satisfy foreign-key constraints
  await prisma.platformLoyaltyTransaction.deleteMany({ where: { account: { userId: req.params.id } } });
  await prisma.platformLoyaltyAccount.deleteMany({ where: { userId: req.params.id } });
  await prisma.notification.deleteMany({ where: { userId: req.params.id } });
  await prisma.userSettings.deleteMany({ where: { userId: req.params.id } });
  await prisma.smartMatchRequest.deleteMany({ where: { userId: req.params.id } });
  await prisma.waitingList.deleteMany({ where: { userId: req.params.id } });
  await prisma.emergencyBooking.deleteMany({ where: { userId: req.params.id } });
  await prisma.favorite.deleteMany({ where: { userId: req.params.id } });
  await prisma.loyaltyCard.deleteMany({ where: { userId: req.params.id } });
  await prisma.message.deleteMany({ where: { senderId: req.params.id } });

  // Reviews and bookings: anonymise rather than hard-delete to preserve history
  await prisma.review.updateMany({ where: { customerId: req.params.id }, data: { customerId: req.params.id } });
  await prisma.businessEmployee.updateMany({ where: { userId: req.params.id }, data: { active: false } });

  // Suspend owned businesses
  await prisma.business.updateMany({ where: { ownerId: req.params.id }, data: { status: "SUSPENDED" } });

  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

module.exports = router;
