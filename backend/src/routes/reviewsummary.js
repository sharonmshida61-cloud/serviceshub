const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Simple AI-powered review summarization
function generateReviewSummary(reviews) {
  if (reviews.length === 0) {
    return {
      summary: "No reviews yet.",
      sentiment: "neutral",
      keyTopics: [],
      strengths: [],
      concerns: [],
    };
  }

  // Calculate sentiment
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const sentiment = avgRating >= 4 ? "positive" : avgRating >= 3 ? "neutral" : "negative";

  // Extract key topics from comments (simple keyword extraction)
  const allText = reviews.map(r => r.comment?.toLowerCase() || "").join(" ");
  const positiveWords = ["great", "excellent", "professional", "friendly", "clean", "punctual", "skilled", "affordable", "quality", "recommend"];
  const negativeWords = ["late", "rude", "expensive", "poor", "disappointing", "unprofessional", "dirty", "slow"];

  const keyTopics = [];
  const strengths = [];
  const concerns = [];

  positiveWords.forEach(word => {
    if (allText.includes(word)) {
      keyTopics.push(word);
      strengths.push(`Customers appreciate the ${word} service`);
    }
  });

  negativeWords.forEach(word => {
    if (allText.includes(word)) {
      keyTopics.push(word);
      concerns.push(`Some customers mentioned "${word}"`);
    }
  });

  // Generate summary based on ratings distribution
  const ratings = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => ratings[r.rating]++);

  let summary = "";
  const total = reviews.length;
  const positive = ratings[5] + ratings[4];
  const negative = ratings[1] + ratings[2];

  if (positive / total > 0.8) {
    summary = `Highly rated with ${positive} out of ${total} customers giving 4-5 stars. `;
  } else if (positive / total > 0.6) {
    summary = `Generally positive with ${positive} out of ${total} customers satisfied. `;
  } else {
    summary = `Mixed reviews with ${positive} positive and ${negative} negative ratings out of ${total} total. `;
  }

  if (strengths.length > 0) {
    summary += strengths.slice(0, 2).join(". ") + ". ";
  }

  if (concerns.length > 0) {
    summary += `Areas for improvement: ${concerns.slice(0, 2).join(", ")}.`;
  }

  return {
    summary: summary.trim(),
    sentiment,
    keyTopics: [...new Set(keyTopics)].slice(0, 5),
    strengths: strengths.slice(0, 3),
    concerns: concerns.slice(0, 3),
  };
}

// Get AI review summary for a business
router.get("/:businessId", async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.businessId },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Check if summary exists and is recent (less than 24 hours old)
    let summary = await prisma.reviewSummary.findUnique({
      where: { businessId: req.params.businessId },
    });

    const shouldRegenerate = !summary || 
      (new Date() - new Date(summary.lastUpdated)) > 24 * 60 * 60 * 1000;

    if (shouldRegenerate) {
      // Get all reviews
      const reviews = await prisma.review.findMany({
        where: { businessId: req.params.businessId },
        include: { customer: true },
      });

      // Generate new summary
      const generated = generateReviewSummary(reviews);

      if (summary) {
        // Update existing
        summary = await prisma.reviewSummary.update({
          where: { businessId: req.params.businessId },
          data: {
            summary: generated.summary,
            sentiment: generated.sentiment,
            keyTopics: JSON.stringify(generated.keyTopics),
            strengths: JSON.stringify(generated.strengths),
            concerns: JSON.stringify(generated.concerns),
          },
        });
      } else {
        // Create new
        summary = await prisma.reviewSummary.create({
          data: {
            businessId: req.params.businessId,
            summary: generated.summary,
            sentiment: generated.sentiment,
            keyTopics: JSON.stringify(generated.keyTopics),
            strengths: JSON.stringify(generated.strengths),
            concerns: JSON.stringify(generated.concerns),
          },
        });
      }
    }

    // Parse JSON fields
    res.json({
      ...summary,
      keyTopics: JSON.parse(summary.keyTopics),
      strengths: JSON.parse(summary.strengths),
      concerns: JSON.parse(summary.concerns),
    });
  } catch (err) {
    next(err);
  }
});

// Force regenerate summary (for business owners after new reviews)
router.post("/:businessId/regenerate", async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { businessId: req.params.businessId },
      include: { customer: true },
    });

    const generated = generateReviewSummary(reviews);

    const summary = await prisma.reviewSummary.upsert({
      where: { businessId: req.params.businessId },
      create: {
        businessId: req.params.businessId,
        summary: generated.summary,
        sentiment: generated.sentiment,
        keyTopics: JSON.stringify(generated.keyTopics),
        strengths: JSON.stringify(generated.strengths),
        concerns: JSON.stringify(generated.concerns),
      },
      update: {
        summary: generated.summary,
        sentiment: generated.sentiment,
        keyTopics: JSON.stringify(generated.keyTopics),
        strengths: JSON.stringify(generated.strengths),
        concerns: JSON.stringify(generated.concerns),
      },
    });

    res.json({
      ...summary,
      keyTopics: JSON.parse(summary.keyTopics),
      strengths: JSON.parse(summary.strengths),
      concerns: JSON.parse(summary.concerns),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
