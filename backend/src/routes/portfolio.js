const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { requireAuth } = require("../middleware/auth");

const prisma = new PrismaClient();

// Get portfolio items for a business
router.get("/business/:businessId", async (req, res, next) => {
  try {
    const items = await prisma.portfolioItem.findMany({
      where: { businessId: req.params.businessId },
      orderBy: { displayOrder: "asc" },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// Add portfolio item (business owner only)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { businessId, title, description, imageUrl, displayOrder } = req.body;

    if (!businessId || !imageUrl) {
      return res.status(400).json({ error: "businessId and imageUrl are required" });
    }

    // Check ownership
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || business.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const item = await prisma.portfolioItem.create({
      data: {
        businessId,
        title,
        description,
        imageUrl,
        displayOrder: displayOrder || 0,
      },
    });

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// Update portfolio item
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const item = await prisma.portfolioItem.findUnique({
      where: { id: req.params.id },
      include: { business: true },
    });

    if (!item || item.business.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, description, imageUrl, displayOrder } = req.body;

    const updated = await prisma.portfolioItem.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(imageUrl && { imageUrl }),
        ...(displayOrder !== undefined && { displayOrder }),
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete portfolio item
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const item = await prisma.portfolioItem.findUnique({
      where: { id: req.params.id },
      include: { business: true },
    });

    if (!item || item.business.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.portfolioItem.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
