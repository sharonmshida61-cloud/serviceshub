const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { requireAuth } = require("../middleware/auth");

const prisma = new PrismaClient();

// Get user's favorite businesses
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      include: {
        business: {
          include: {
            category: true,
            services: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(favorites);
  } catch (err) {
    next(err);
  }
});

// Add business to favorites
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { businessId } = req.body;
    if (!businessId) {
      return res.status(400).json({ error: "businessId is required" });
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: req.user.id,
        businessId,
      },
      include: {
        business: {
          include: {
            category: true,
          },
        },
      },
    });
    res.status(201).json(favorite);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Business already in favorites" });
    }
    next(err);
  }
});

// Remove business from favorites
router.delete("/:businessId", requireAuth, async (req, res, next) => {
  try {
    await prisma.favorite.deleteMany({
      where: {
        userId: req.user.id,
        businessId: req.params.businessId,
      },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Check if business is favorited
router.get("/check/:businessId", requireAuth, async (req, res, next) => {
  try {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_businessId: {
          userId: req.user.id,
          businessId: req.params.businessId,
        },
      },
    });
    res.json({ isFavorite: !!favorite });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
