const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const prisma = new PrismaClient();

// Create emergency booking request
router.post("/", authenticate, async (req, res, next) => {
  try {
    const { categoryId, description, location, latitude, longitude, maxPriceCents } = req.body;

    if (!categoryId || !description) {
      return res.status(400).json({ error: "categoryId and description are required" });
    }

    // Emergency bookings expire in 2 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);

    const emergency = await prisma.emergencyBooking.create({
      data: {
        userId: req.user.id,
        categoryId,
        description,
        location,
        latitude,
        longitude,
        maxPriceCents,
        expiresAt,
      },
      include: {
        category: true,
        user: true,
      },
    });

    // Find nearby businesses in this category
    const businesses = await prisma.business.findMany({
      where: {
        categoryId,
        status: "APPROVED",
        ...(location && { city: { contains: location, mode: "insensitive" } }),
      },
      include: {
        owner: true,
        employees: {
          include: { user: true },
        },
      },
    });

    // Notify business owners and employees
    const notifications = [];
    for (const business of businesses) {
      // Notify owner
      notifications.push(
        prisma.notification.create({
          data: {
            userId: business.ownerId,
            type: "NEW_MESSAGE",
            channel: "in-app",
            subject: "🚨 Emergency booking request",
            message: `${req.user.name} needs urgent ${emergency.category.name} service: ${description}${location ? ` in ${location}` : ""}`,
            metadata: JSON.stringify({ emergencyBookingId: emergency.id, businessId: business.id }),
            status: "SENT",
            sentAt: new Date(),
          },
        })
      );

      // Notify active employees
      for (const emp of business.employees.filter(e => e.active)) {
        notifications.push(
          prisma.notification.create({
            data: {
              userId: emp.userId,
              type: "NEW_MESSAGE",
              channel: "in-app",
              subject: "🚨 Emergency booking request",
              message: `Emergency ${emergency.category.name} service needed: ${description}`,
              metadata: JSON.stringify({ emergencyBookingId: emergency.id, businessId: business.id }),
              status: "SENT",
              sentAt: new Date(),
            },
          })
        );
      }
    }

    await Promise.all(notifications);

    await prisma.emergencyBooking.update({
      where: { id: emergency.id },
      data: { status: "PROVIDER_NOTIFIED" },
    });

    res.status(201).json({
      ...emergency,
      providersNotified: businesses.length,
    });
  } catch (err) {
    next(err);
  }
});

// Get user's emergency bookings
router.get("/mine", authenticate, async (req, res, next) => {
  try {
    const emergencies = await prisma.emergencyBooking.findMany({
      where: { userId: req.user.id },
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(emergencies);
  } catch (err) {
    next(err);
  }
});

// Accept emergency booking (business owner)
router.post("/:id/accept", authenticate, async (req, res, next) => {
  try {
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({ error: "businessId is required" });
    }

    // Verify ownership or employee status
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

    const emergency = await prisma.emergencyBooking.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        category: true,
      },
    });

    if (!emergency) {
      return res.status(404).json({ error: "Emergency booking not found" });
    }

    if (emergency.status === "ACCEPTED") {
      return res.status(400).json({ error: "Already accepted by another provider" });
    }

    if (new Date() > emergency.expiresAt) {
      return res.status(400).json({ error: "Emergency booking has expired" });
    }

    // Accept the emergency
    await prisma.emergencyBooking.update({
      where: { id: emergency.id },
      data: {
        status: "ACCEPTED",
        acceptedById: businessId,
      },
    });

    // Notify the customer
    await prisma.notification.create({
      data: {
        userId: emergency.userId,
        type: "BOOKING_CONFIRMED",
        channel: "in-app",
        subject: "Emergency booking accepted!",
        message: `${business.name} has accepted your emergency ${emergency.category.name} request. They will contact you shortly.`,
        metadata: JSON.stringify({ emergencyBookingId: emergency.id, businessId }),
        status: "SENT",
        sentAt: new Date(),
      },
    });

    res.json({
      success: true,
      emergency,
      business,
      message: "Customer has been notified. Please contact them immediately.",
    });
  } catch (err) {
    next(err);
  }
});

// Get emergency bookings for business (owner/employee view)
router.get("/business/:businessId", authenticate, async (req, res, next) => {
  try {
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

    const emergencies = await prisma.emergencyBooking.findMany({
      where: {
        categoryId: business.categoryId,
        status: { in: ["PROVIDER_NOTIFIED", "REQUESTED"] },
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(emergencies);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
