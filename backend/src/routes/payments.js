const express = require("express");
const prisma = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");
const { charge } = require("../utils/payments");

const router = express.Router();

// Pay for a booking. In production this would create a client-side payment
// intent (e.g. Stripe) first; here the mock provider settles instantly so
// the full flow is demonstrable without external keys.
router.post("/bookings/:bookingId/pay", requireAuth, async (req, res) => {
  const { method } = req.body || {};
  const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.customerId !== req.user.id) return res.status(403).json({ error: "This is not your booking" });

  const existing = await prisma.payment.findUnique({ where: { bookingId: booking.id } });
  if (existing && existing.status === "PAID") return res.status(409).json({ error: "This booking is already paid" });

  const result = await charge({ amountCents: booking.priceCents, method: method || "card" });

  const payment = await prisma.payment.upsert({
    where: { bookingId: booking.id },
    update: {
      status: result.success ? "PAID" : "FAILED",
      method: result.method,
      transactionRef: result.transactionRef,
      amountCents: result.amountCents,
    },
    create: {
      bookingId: booking.id,
      amountCents: result.amountCents,
      method: result.method,
      status: result.success ? "PAID" : "FAILED",
      transactionRef: result.transactionRef,
    },
  });

  if (result.success && booking.status === "PENDING") {
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
  }

  if (!result.success) return res.status(402).json({ error: "Payment failed, please try again", payment });
  res.json({ payment });
});

router.get("/bookings/:bookingId", requireAuth, async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { bookingId: req.params.bookingId } });
  if (!payment) return res.status(404).json({ error: "No payment found for this booking" });
  res.json(payment);
});

module.exports = router;
