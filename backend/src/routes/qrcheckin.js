const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { requireAuth } = require("../middleware/auth");
const crypto = require("crypto");
const QRCode = require("qrcode");

const prisma = new PrismaClient();

// Generate QR code for a booking (customer or business can call this)
router.post("/generate/:bookingId", requireAuth, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
      include: { business: true },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check authorization
    const isCustomer = booking.customerId === req.user.id;
    const isBusinessOwner = booking.business.ownerId === req.user.id;
    
    if (!isCustomer && !isBusinessOwner && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Check if QR code already exists for this booking
    let qrCheckIn = await prisma.qRCheckIn.findFirst({
      where: { bookingId: req.params.bookingId },
    });

    if (!qrCheckIn) {
      // Generate unique QR code
      const qrCode = crypto.randomBytes(16).toString("hex");
      
      // Set expiration to 24 hours after scheduled time
      const expiresAt = new Date(booking.scheduledAt);
      expiresAt.setHours(expiresAt.getHours() + 24);

      qrCheckIn = await prisma.qRCheckIn.create({
        data: {
          bookingId: req.params.bookingId,
          qrCode,
          expiresAt,
        },
      });
    }

    // Generate QR code image as base64 data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrCheckIn.qrCode, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
    });

    res.json({
      ...qrCheckIn,
      qrCodeImage: qrCodeDataUrl, // Base64 data URL for display
    });
  } catch (err) {
    next(err);
  }
});

// Check-in using QR code (employee scans customer's QR)
router.post("/checkin", requireAuth, async (req, res, next) => {
  try {
    const { qrCode } = req.body;

    if (!qrCode) {
      return res.status(400).json({ error: "qrCode is required" });
    }

    const qrCheckIn = await prisma.qRCheckIn.findUnique({
      where: { qrCode },
      include: {
        booking: {
          include: {
            business: true,
            customer: true,
          },
        },
      },
    });

    if (!qrCheckIn) {
      return res.status(404).json({ error: "Invalid QR code" });
    }

    // Check if expired
    if (new Date() > qrCheckIn.expiresAt) {
      return res.status(400).json({ error: "QR code has expired" });
    }

    // Check if already checked in
    if (qrCheckIn.checkedInAt) {
      return res.status(400).json({ error: "Already checked in", qrCheckIn });
    }

    // Verify employee works at this business
    const isEmployee = await prisma.businessEmployee.findFirst({
      where: {
        businessId: qrCheckIn.booking.businessId,
        userId: req.user.id,
        active: true,
      },
    });

    const isOwner = qrCheckIn.booking.business.ownerId === req.user.id;

    if (!isEmployee && !isOwner && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized - not an employee of this business" });
    }

    // Mark as checked in
    const updated = await prisma.qRCheckIn.update({
      where: { id: qrCheckIn.id },
      data: {
        checkedInAt: new Date(),
        checkedInBy: req.user.id,
      },
      include: {
        booking: {
          include: {
            customer: true,
            service: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Get QR check-in status for a booking
router.get("/status/:bookingId", requireAuth, async (req, res, next) => {
  try {
    const qrCheckIn = await prisma.qRCheckIn.findFirst({
      where: { bookingId: req.params.bookingId },
      include: {
        booking: {
          include: {
            business: true,
            customer: true,
          },
        },
      },
    });

    if (!qrCheckIn) {
      return res.status(404).json({ error: "No QR check-in found for this booking" });
    }

    // Check authorization
    const isCustomer = qrCheckIn.booking.customerId === req.user.id;
    const isBusinessOwner = qrCheckIn.booking.business.ownerId === req.user.id;
    
    if (!isCustomer && !isBusinessOwner && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(qrCheckIn);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
