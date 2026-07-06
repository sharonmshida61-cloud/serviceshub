const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { requireAuth } = require("../middleware/auth");

const prisma = new PrismaClient();

// Get user's notifications
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { unreadOnly } = req.query;
    
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
        ...(unreadOnly === "true" && { readAt: null }),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

// Mark notification as read
router.put("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification || notification.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { readAt: new Date() },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Mark all notifications as read
router.put("/read-all", requireAuth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Create notification (internal use - typically called by other services)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { userId, type, channel, subject, message, metadata } = req.body;

    if (!userId || !type || !message) {
      return res.status(400).json({ error: "userId, type, and message are required" });
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        channel: channel || "in-app",
        subject,
        message,
        metadata: metadata ? JSON.stringify(metadata) : "{}",
      },
    });

    // TODO: Implement actual email/SMS sending based on channel
    // For now, just mark in-app notifications as sent
    if (channel === "in-app") {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: "SENT", sentAt: new Date() },
      });
    }

    res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
});

// Get unread count
router.get("/unread-count", requireAuth, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user.id,
        readAt: null,
      },
    });

    res.json({ count });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
