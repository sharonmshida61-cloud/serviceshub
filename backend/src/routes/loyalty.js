const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const prisma = new PrismaClient();

const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 100,
  gold: 250,
  platinum: 500,
};

function calculateTier(points) {
  if (points >= TIER_THRESHOLDS.platinum) return "platinum";
  if (points >= TIER_THRESHOLDS.gold) return "gold";
  if (points >= TIER_THRESHOLDS.silver) return "silver";
  return "bronze";
}

// Get user's loyalty cards
router.get("/", authenticate, async (req, res, next) => {
  try {
    const cards = await prisma.loyaltyCard.findMany({
      where: { userId: req.user.id },
      include: {
        business: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { points: "desc" },
    });
    res.json(cards);
  } catch (err) {
    next(err);
  }
});

// Get loyalty card for specific business
router.get("/:businessId", authenticate, async (req, res, next) => {
  try {
    const card = await prisma.loyaltyCard.findUnique({
      where: {
        userId_businessId: {
          userId: req.user.id,
          businessId: req.params.businessId,
        },
      },
      include: {
        business: {
          include: {
            category: true,
          },
        },
      },
    });
    res.json(card || null);
  } catch (err) {
    next(err);
  }
});

// Award points (called internally when booking is completed)
router.post("/award", authenticate, async (req, res, next) => {
  try {
    const { businessId, points, customerId } = req.body;
    
    // Only business owners/employees can award points
    if (req.user.role !== "BUSINESS_OWNER" && req.user.role !== "EMPLOYEE" && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const targetUserId = customerId || req.user.id;

    const card = await prisma.loyaltyCard.upsert({
      where: {
        userId_businessId: {
          userId: targetUserId,
          businessId,
        },
      },
      create: {
        userId: targetUserId,
        businessId,
        points: points || 10,
        visits: 1,
        tier: "bronze",
      },
      update: {
        points: { increment: points || 10 },
        visits: { increment: 1 },
      },
    });

    // Update tier based on new points total
    const newTier = calculateTier(card.points);
    if (newTier !== card.tier) {
      await prisma.loyaltyCard.update({
        where: { id: card.id },
        data: { tier: newTier },
      });
    }

    res.json(card);
  } catch (err) {
    next(err);
  }
});

// Get business loyalty statistics (for business owners)
router.get("/business/:businessId/stats", authenticate, async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.businessId },
    });

    if (!business || business.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const stats = await prisma.loyaltyCard.groupBy({
      by: ["tier"],
      where: { businessId: req.params.businessId },
      _count: { id: true },
      _sum: { points: true, visits: true },
    });

    const totalCustomers = await prisma.loyaltyCard.count({
      where: { businessId: req.params.businessId },
    });

    res.json({ stats, totalCustomers });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
