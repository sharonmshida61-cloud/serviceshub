const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const prisma = new PrismaClient();

const TIER_THRESHOLDS = {
  member: 0,
  silver: 500,
  gold: 1500,
  platinum: 3000,
  diamond: 5000,
};

const REDEMPTION_VALUES = {
  100: 100,   // 100 points = $1
  500: 550,   // 500 points = $5.50 (10% bonus)
  1000: 1200, // 1000 points = $12 (20% bonus)
};

function calculateTier(points) {
  if (points >= TIER_THRESHOLDS.diamond) return "diamond";
  if (points >= TIER_THRESHOLDS.platinum) return "platinum";
  if (points >= TIER_THRESHOLDS.gold) return "gold";
  if (points >= TIER_THRESHOLDS.silver) return "silver";
  return "member";
}

// Get user's platform loyalty account
router.get("/", authenticate, async (req, res, next) => {
  try {
    let account = await prisma.platformLoyaltyAccount.findUnique({
      where: { userId: req.user.id },
      include: {
        transactions: {
          include: {
            business: true,
            booking: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    // Create account if doesn't exist
    if (!account) {
      account = await prisma.platformLoyaltyAccount.create({
        data: { userId: req.user.id },
        include: { transactions: true },
      });
    }

    res.json(account);
  } catch (err) {
    next(err);
  }
});

// Award points (called internally when booking is completed)
router.post("/award", authenticate, async (req, res, next) => {
  try {
    const { userId, bookingId, businessId, points, description } = req.body;

    // Only system/admin can award points, or the business owner/employee
    if (req.user.role !== "ADMIN") {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      const isOwner = business.ownerId === req.user.id;
      const isEmployee = await prisma.businessEmployee.findFirst({
        where: {
          businessId,
          userId: req.user.id,
          active: true,
        },
      });

      if (!isOwner && !isEmployee) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    const targetUserId = userId || req.user.id;

    // Get or create account
    let account = await prisma.platformLoyaltyAccount.findUnique({
      where: { userId: targetUserId },
    });

    if (!account) {
      account = await prisma.platformLoyaltyAccount.create({
        data: { userId: targetUserId },
      });
    }

    // Create transaction
    const transaction = await prisma.platformLoyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: "EARNED",
        points: points || 10,
        businessId,
        bookingId,
        description: description || "Points earned from booking",
      },
    });

    // Update account totals and tier
    const newTotal = account.totalPoints + (points || 10);
    const newLifetime = account.lifetimePoints + (points || 10);
    const newTier = calculateTier(newLifetime);

    const updated = await prisma.platformLoyaltyAccount.update({
      where: { id: account.id },
      data: {
        totalPoints: newTotal,
        lifetimePoints: newLifetime,
        tier: newTier,
      },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    res.json({ account: updated, transaction });
  } catch (err) {
    next(err);
  }
});

// Redeem points
router.post("/redeem", authenticate, async (req, res, next) => {
  try {
    const { points, businessId } = req.body;

    if (!points || points < 100) {
      return res.status(400).json({ error: "Minimum 100 points required to redeem" });
    }

    const account = await prisma.platformLoyaltyAccount.findUnique({
      where: { userId: req.user.id },
    });

    if (!account || account.totalPoints < points) {
      return res.status(400).json({ error: "Insufficient points" });
    }

    // Calculate value with bonuses
    let valueCents = points; // Base: 1 point = 1 cent
    if (points >= 1000) {
      valueCents = Math.floor((points / 1000) * REDEMPTION_VALUES[1000]);
    } else if (points >= 500) {
      valueCents = Math.floor((points / 500) * REDEMPTION_VALUES[500]);
    } else if (points >= 100) {
      valueCents = Math.floor((points / 100) * REDEMPTION_VALUES[100]);
    }

    // Create redemption transaction
    const transaction = await prisma.platformLoyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: "REDEEMED",
        points: -points,
        businessId,
        description: `Redeemed ${points} points for $${(valueCents / 100).toFixed(2)} value`,
      },
    });

    // Update account
    const updated = await prisma.platformLoyaltyAccount.update({
      where: { id: account.id },
      data: {
        totalPoints: account.totalPoints - points,
      },
    });

    res.json({
      success: true,
      account: updated,
      transaction,
      valueCents,
      message: `Redeemed ${points} points for $${(valueCents / 100).toFixed(2)}`,
    });
  } catch (err) {
    next(err);
  }
});

// Get platform loyalty statistics (admin)
router.get("/stats", authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const totalAccounts = await prisma.platformLoyaltyAccount.count();
    
    const accountsByTier = await prisma.platformLoyaltyAccount.groupBy({
      by: ["tier"],
      _count: { id: true },
      _sum: { totalPoints: true, lifetimePoints: true },
    });

    const totalPointsIssued = await prisma.platformLoyaltyTransaction.aggregate({
      where: { type: "EARNED" },
      _sum: { points: true },
    });

    const totalPointsRedeemed = await prisma.platformLoyaltyTransaction.aggregate({
      where: { type: "REDEEMED" },
      _sum: { points: true },
    });

    res.json({
      totalAccounts,
      accountsByTier,
      totalPointsIssued: totalPointsIssued._sum.points || 0,
      totalPointsRedeemed: Math.abs(totalPointsRedeemed._sum.points || 0),
      tierThresholds: TIER_THRESHOLDS,
      redemptionValues: REDEMPTION_VALUES,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
