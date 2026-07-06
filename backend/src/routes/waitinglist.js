const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const prisma = new PrismaClient();

// Join waiting list
router.post("/", authenticate, async (req, res, next) => {
  try {
    const { businessId, serviceId, preferredDate, preferredTimeStart, preferredTimeEnd } = req.body;
    
    if (!businessId) {
      return res.status(400).json({ error: "businessId is required" });
    }

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const waitingList = await prisma.waitingList.create({
      data: {
        userId: req.user.id,
        businessId,
        serviceId,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        preferredTimeStart,
        preferredTimeEnd,
        expiresAt,
      },
      include: {
        business: {
          include: { category: true },
        },
        service: true,
      },
    });

    res.status(201).json(waitingList);
  } catch (err) {
    next(err);
  }
});

// Get user's waiting lists
router.get("/mine", authenticate, async (req, res, next) => {
  try {
    const waitingLists = await prisma.waitingList.findMany({
      where: {
        userId: req.user.id,
        status: { in: ["ACTIVE", "NOTIFIED"] },
      },
      include: {
        business: {
          include: { category: true },
        },
        service: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(waitingLists);
  } catch (err) {
    next(err);
  }
});

// Notify waiting list (called when a booking is cancelled)
router.post("/notify/:businessId", authenticate, async (req, res, next) => {
  try {
    const { serviceId, availableSlot } = req.body;

    // Verify user is business owner or employee
    const business = await prisma.business.findUnique({
      where: { id: req.params.businessId },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const isOwner = business.ownerId === req.user.id;
    const isEmployee = await prisma.businessEmployee.findFirst({
      where: {
        businessId: req.params.businessId,
        userId: req.user.id,
        active: true,
      },
    });

    if (!isOwner && !isEmployee && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Find waiting customers
    const waiting = await prisma.waitingList.findMany({
      where: {
        businessId: req.params.businessId,
        status: "ACTIVE",
        ...(serviceId && { serviceId }),
      },
      include: {
        user: true,
        service: true,
      },
      orderBy: { createdAt: "asc" }, // First come, first served
      take: 5,
    });

    // Notify each waiting customer
    const notifications = await Promise.all(
      waiting.map(async (w) => {
        await prisma.waitingList.update({
          where: { id: w.id },
          data: { status: "NOTIFIED", notifiedAt: new Date() },
        });

        return prisma.notification.create({
          data: {
            userId: w.userId,
            type: "BOOKING_REMINDER",
            channel: "in-app",
            subject: "Booking slot available!",
            message: `A slot is now available at ${business.name}${w.service ? ` for ${w.service.name}` : ""}${availableSlot ? ` on ${availableSlot}` : ""}. Book now!`,
            metadata: JSON.stringify({ businessId: business.id, serviceId: w.serviceId }),
            status: "SENT",
            sentAt: new Date(),
          },
        });
      })
    );

    res.json({ notified: notifications.length, customers: waiting.map(w => w.user.name) });
  } catch (err) {
    next(err);
  }
});

// Remove from waiting list
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const waitingList = await prisma.waitingList.findUnique({
      where: { id: req.params.id },
    });

    if (!waitingList || waitingList.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.waitingList.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED" },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
