const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { requireAuth } = require("../middleware/auth");

const prisma = new PrismaClient();

// Get enhanced portfolio for a business
router.get("/business/:businessId", async (req, res, next) => {
  try {
    const { type } = req.query;
    
    const items = await prisma.enhancedPortfolio.findMany({
      where: {
        businessId: req.params.businessId,
        ...(type && { type }),
      },
      orderBy: { displayOrder: "asc" },
    });

    res.json(items);
  } catch (err) {
    next(err);
  }
});

// Add enhanced portfolio item (business owner only)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { businessId, type, title, description, mediaUrl, thumbnailUrl, metadata, displayOrder } = req.body;

    if (!businessId || !type || !mediaUrl) {
      return res.status(400).json({ error: "businessId, type, and mediaUrl are required" });
    }

    // Validate type
    const validTypes = ["PHOTO", "VIDEO", "CERTIFICATE", "LICENSE", "PROJECT"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid type. Must be one of: " + validTypes.join(", ") });
    }

    // Check ownership
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || business.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const item = await prisma.enhancedPortfolio.create({
      data: {
        businessId,
        type,
        title,
        description,
        mediaUrl,
        thumbnailUrl,
        metadata: metadata ? JSON.stringify(metadata) : "{}",
        displayOrder: displayOrder || 0,
      },
    });

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// Update enhanced portfolio item
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const item = await prisma.enhancedPortfolio.findUnique({
      where: { id: req.params.id },
      include: { business: true },
    });

    if (!item || item.business.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { type, title, description, mediaUrl, thumbnailUrl, metadata, displayOrder } = req.body;

    const updated = await prisma.enhancedPortfolio.update({
      where: { id: req.params.id },
      data: {
        ...(type && { type }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(mediaUrl && { mediaUrl }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
        ...(metadata && { metadata: JSON.stringify(metadata) }),
        ...(displayOrder !== undefined && { displayOrder }),
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete enhanced portfolio item
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const item = await prisma.enhancedPortfolio.findUnique({
      where: { id: req.params.id },
      include: { business: true },
    });

    if (!item || item.business.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.enhancedPortfolio.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Verify certificate/license (admin only)
router.post("/:id/verify", requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized - admin only" });
    }

    const item = await prisma.enhancedPortfolio.findUnique({
      where: { id: req.params.id },
    });

    if (!item) {
      return res.status(404).json({ error: "Portfolio item not found" });
    }

    if (item.type !== "CERTIFICATE" && item.type !== "LICENSE") {
      return res.status(400).json({ error: "Only certificates and licenses can be verified" });
    }

    const updated = await prisma.enhancedPortfolio.update({
      where: { id: req.params.id },
      data: { verified: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Get portfolio statistics (for business owner)
router.get("/business/:businessId/stats", requireAuth, async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.businessId },
    });

    if (!business || (business.ownerId !== req.user.id && req.user.role !== "ADMIN")) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const stats = await prisma.enhancedPortfolio.groupBy({
      by: ["type"],
      where: { businessId: req.params.businessId },
      _count: { id: true },
    });

    const verified = await prisma.enhancedPortfolio.count({
      where: {
        businessId: req.params.businessId,
        verified: true,
      },
    });

    res.json({ byType: stats, totalVerified: verified });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
