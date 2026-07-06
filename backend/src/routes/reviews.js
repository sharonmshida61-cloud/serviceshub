const express = require("express");
const prisma = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();

async function recomputeRating(businessId) {
  const agg = await prisma.review.aggregate({
    where: { businessId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.business.update({
    where: { id: businessId },
    data: { avgRating: agg._avg.rating || 0, reviewCount: agg._count.rating },
  });
}

// Leave a review — only for a booking you completed, one review per booking.
router.post("/", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  const { bookingId, rating, comment } = req.body || {};
  if (!bookingId || !rating) return res.status(400).json({ error: "bookingId and rating are required" });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: "rating must be between 1 and 5" });

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.customerId !== req.user.id) return res.status(403).json({ error: "This is not your booking" });
  if (booking.status !== "COMPLETED") return res.status(400).json({ error: "You can only review completed bookings" });

  const existing = await prisma.review.findUnique({ where: { bookingId } });
  if (existing) return res.status(409).json({ error: "You already reviewed this booking" });

  const review = await prisma.review.create({
    data: { bookingId, businessId: booking.businessId, customerId: req.user.id, rating, comment },
  });
  await recomputeRating(booking.businessId);
  res.status(201).json(review);
});

router.get("/business/:businessId", async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { businessId: req.params.businessId },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(reviews);
});

// Business owner can reply once to a review
router.patch("/:id/reply", requireAuth, requireRole("BUSINESS_OWNER", "ADMIN"), async (req, res) => {
  const { ownerReply } = req.body || {};
  const review = await prisma.review.findUnique({ where: { id: req.params.id }, include: { business: true } });
  if (!review) return res.status(404).json({ error: "Review not found" });
  if (review.business.ownerId !== req.user.id && req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Only the business owner can reply to this review" });
  }
  const updated = await prisma.review.update({ where: { id: req.params.id }, data: { ownerReply } });
  res.json(updated);
});

module.exports = router;
