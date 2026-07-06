const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { requireAuth } = require("../middleware/auth");

const prisma = new PrismaClient();

// Simple NLP parser for extracting intent from natural language
function parseQuery(query) {
  const lowered = query.toLowerCase();
  
  // Extract category
  const categories = ["barber", "salon", "plumber", "electrician", "mechanic", "tutor", "cleaner", "photographer"];
  const category = categories.find(cat => lowered.includes(cat));
  
  // Extract time preferences
  const tomorrow = lowered.includes("tomorrow");
  const today = lowered.includes("today");
  const timeMatch = lowered.match(/(\d{1,2})\s*(am|pm)/);
  const afterMatch = lowered.match(/after\s*(\d{1,2})\s*(am|pm)?/);
  
  // Extract budget
  const budgetMatch = lowered.match(/\$?(\d+)/);
  const budget = budgetMatch ? parseInt(budgetMatch[1]) : null;
  
  // Extract location
  const nearMatch = lowered.match(/near\s+([a-z\s]+?)(?:\s|$)/i);
  const inMatch = lowered.match(/in\s+([a-z\s]+?)(?:\s|$)/i);
  const location = nearMatch?.[1] || inMatch?.[1];
  
  return {
    category,
    time: {
      today,
      tomorrow,
      hour: timeMatch ? parseInt(timeMatch[1]) : (afterMatch ? parseInt(afterMatch[1]) : null),
      period: timeMatch?.[2] || afterMatch?.[2] || null,
    },
    budget: budget ? budget * 100 : null, // Convert to cents
    location: location?.trim(),
  };
}

// AI Smart Match - Natural language service discovery
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { query } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Query is required" });
    }

    // Parse the natural language query
    const parsed = parseQuery(query);
    
    // Build search filters based on parsed intent
    const filters = { status: "APPROVED" };
    
    if (parsed.category) {
      const category = await prisma.category.findFirst({
        where: { 
          OR: [
            { name: { contains: parsed.category, mode: "insensitive" } },
            { slug: { contains: parsed.category, mode: "insensitive" } },
          ]
        }
      });
      if (category) {
        filters.categoryId = category.id;
      }
    }
    
    if (parsed.location) {
      filters.city = { contains: parsed.location, mode: "insensitive" };
    }
    
    // Search businesses
    const businesses = await prisma.business.findMany({
      where: filters,
      include: {
        category: true,
        services: {
          where: {
            active: true,
            ...(parsed.budget && { priceCents: { lte: parsed.budget } }),
          },
        },
      },
      take: 10,
    });
    
    // Calculate match scores
    const results = businesses.map(business => {
      let score = 0;
      
      // Higher rating = higher score
      score += business.avgRating * 20;
      
      // More reviews = more trustworthy
      score += Math.min(business.reviewCount, 50);
      
      // Within budget
      if (parsed.budget && business.services.some(s => s.priceCents <= parsed.budget)) {
        score += 30;
      }
      
      // Location match
      if (parsed.location && business.city?.toLowerCase().includes(parsed.location.toLowerCase())) {
        score += 40;
      }
      
      return {
        businessId: business.id,
        score,
      };
    }).sort((a, b) => b.score - a.score);
    
    // Save the smart match request
    const smartMatch = await prisma.smartMatchRequest.create({
      data: {
        userId: req.user.id,
        query,
        parsed: JSON.stringify(parsed),
        results: JSON.stringify(results.map(r => r.businessId)),
      },
    });
    
    // Return businesses with scores
    const rankedBusinesses = results.map(r => {
      const business = businesses.find(b => b.id === r.businessId);
      return { ...business, matchScore: r.score };
    });
    
    res.json({
      smartMatchId: smartMatch.id,
      parsed,
      results: rankedBusinesses,
      message: `Found ${rankedBusinesses.length} providers matching your request`,
    });
  } catch (err) {
    next(err);
  }
});

// Get user's smart match history
router.get("/history", requireAuth, async (req, res, next) => {
  try {
    const history = await prisma.smartMatchRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    
    res.json(history);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
