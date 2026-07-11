const router = require("express").Router();
const prisma = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");

// ---------------------------------------------------------------------------
// CATEGORY KEYWORD MAP
// Maps natural-language words → category slug in the DB.
// Each entry is [slug, [...synonyms]]. The first match wins.
// ---------------------------------------------------------------------------
const CATEGORY_KEYWORDS = [
  ["barbers",            ["barber", "haircut", "fade", "shave", "lineup", "hair cut"]],
  ["hair-salons",        ["hair salon", "salon", "blowout", "balayage", "highlights", "keratin", "relaxer", "hair color", "colourist", "colorist"]],
  ["car-washes",         ["car wash", "carwash", "auto wash", "vehicle wash", "detailing", "detail", "car detail"]],
  ["laundry",            ["laundry", "dry clean", "dry-clean", "wash and fold", "ironing", "pressing", "clothes wash"]],
  ["cleaning-services",  ["cleaning", "cleaner", "house clean", "home clean", "office clean", "maid", "housekeeping", "deep clean", "carpet clean"]],
  ["plumbers",           ["plumber", "plumbing", "pipe", "drain", "leak", "geyser", "burst pipe", "water heater"]],
  ["electricians",       ["electrician", "electrical", "wiring", "rewire", "power", "circuit", "fuse", "outlet", "socket", "solar", "ev charger"]],
  ["mechanics",          ["mechanic", "auto repair", "car repair", "vehicle repair", "service car", "tyre", "tire", "oil change", "brake"]],
  ["photographers",      ["photographer", "photography", "photo", "shoot", "portrait", "wedding photo", "headshot", "product photo"]],
  ["tutors",             ["tutor", "tutoring", "lesson", "teaching", "homework help", "math", "maths", "science", "english tutor", "language lesson"]],
  ["tailors",            ["tailor", "tailoring", "alteration", "sewing", "suit", "dress alteration", "hem", "bespoke"]],
  ["fitness-trainers",   ["personal trainer", "fitness trainer", "gym trainer", "workout", "fitness", "yoga", "pilates", "boxing coach", "pt session"]],
  ["event-planners",     ["event planner", "event planning", "wedding planner", "party planner", "event coordinator", "event organizer"]],
  ["massage-therapists", ["massage", "massage therapist", "deep tissue", "swedish massage", "sports massage", "spa"]],
  ["freelancers",        ["freelancer", "web developer", "designer", "copywriter", "developer", "graphic design", "logo design", "seo", "content writer"]],
  ["home-repair",        ["handyman", "home repair", "repairs", "fix", "carpentry", "painting", "tiling", "renovation", "builder", "contractor"]],
];

// ---------------------------------------------------------------------------
// QUERY PARSER
// Extracts structured intent from a free-text query. Pure JS — no external
// dependencies, works on SQLite.
// ---------------------------------------------------------------------------
function parseQuery(query) {
  const lower = query.toLowerCase();

  // ── Category ──────────────────────────────────────────────────────────────
  let categorySlug = null;
  for (const [slug, keywords] of CATEGORY_KEYWORDS) {
    // Sort keywords by length desc so longer phrases match before shorter ones
    const sorted = [...keywords].sort((a, b) => b.length - a.length);
    if (sorted.some((kw) => lower.includes(kw))) {
      categorySlug = slug;
      break;
    }
  }

  // ── Budget ────────────────────────────────────────────────────────────────
  // Match patterns like "$50", "under $200", "within $100", "budget of 150"
  // Use the LAST dollar amount (most specific) or the one nearest "budget"/"under"
  let budgetCents = null;
  const budgetPatterns = [
    /(?:under|within|below|max|budget[^\d]*)\$?\s*(\d+(?:\.\d{1,2})?)/i,
    /\$\s*(\d+(?:\.\d{1,2})?)/,
    /(\d+(?:\.\d{1,2})?)\s*(?:dollar|usd|bucks)/i,
  ];
  for (const pattern of budgetPatterns) {
    const m = lower.match(pattern);
    if (m) {
      budgetCents = Math.round(parseFloat(m[1]) * 100);
      break;
    }
  }

  // ── Location ──────────────────────────────────────────────────────────────
  // Capture "in <city>", "near <city>", "around <city>", stop at common words
  const STOP_WORDS = new Set(["me", "my", "a", "the", "with", "for", "and", "at", "on", "by", "of"]);
  let location = null;
  const locPatterns = [
    /(?:in|near|around|at)\s+([a-z][a-z\s]{1,24}?)(?:\s+(?:today|tomorrow|after|before|under|within|budget|\d)|$)/i,
    /(?:in|near|around|at)\s+([a-z][a-z\s]{1,20})/i,
  ];
  for (const pat of locPatterns) {
    const m = lower.match(pat);
    if (m) {
      const words = m[1].trim().split(/\s+/).filter((w) => !STOP_WORDS.has(w));
      if (words.length) { location = words.join(" "); break; }
    }
  }

  // ── Time ──────────────────────────────────────────────────────────────────
  const time = {
    today:    lower.includes("today")    || lower.includes("right now") || lower.includes("asap"),
    tomorrow: lower.includes("tomorrow"),
    urgent:   lower.includes("urgent")   || lower.includes("emergency") || lower.includes("asap") || lower.includes("right now"),
    hour: null,
    period: null,
  };
  const afterMatch = lower.match(/after\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  const atMatch    = lower.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  const hit = afterMatch || atMatch;
  if (hit) {
    time.hour   = parseInt(hit[1]);
    time.period = hit[3] ? hit[3].toLowerCase() : null;
  }

  return { categorySlug, budgetCents, location, time };
}

// ---------------------------------------------------------------------------
// SCORE CALCULATOR  (returns 0–100)
// ---------------------------------------------------------------------------
function calcScore(business, parsed) {
  let score = 0;

  // Rating contributes up to 40 points (5-star → 40)
  score += (business.avgRating / 5) * 40;

  // Review count: log scale up to 20 points (50+ reviews → 20)
  score += Math.min(Math.log1p(business.reviewCount) / Math.log1p(50), 1) * 20;

  // Budget fit: up to 15 points
  if (parsed.budgetCents && business.services?.length) {
    const cheapest = Math.min(...business.services.map((s) => s.priceCents));
    if (cheapest <= parsed.budgetCents) score += 15;
    else if (cheapest <= parsed.budgetCents * 1.25) score += 7; // close to budget
  }

  // Location match: 20 points
  if (parsed.location && business.city) {
    if (business.city.toLowerCase().includes(parsed.location.toLowerCase())) score += 20;
  }

  // Urgency / availability bonus: 5 points
  if (parsed.time.urgent && business.avgRating >= 4) score += 5;

  return Math.min(Math.round(score), 100);
}

// ---------------------------------------------------------------------------
// POST /api/smartmatch  — run a smart match search
// ---------------------------------------------------------------------------
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: "Query is required" });
    }

    const parsed = parseQuery(query.trim());

    // ── Build DB filters (only what SQLite supports natively) ──────────────
    const where = { status: "APPROVED" };

    // Resolve category slug → id
    let categoryRecord = null;
    if (parsed.categorySlug) {
      categoryRecord = await prisma.category.findUnique({ where: { slug: parsed.categorySlug } });
      if (categoryRecord) where.categoryId = categoryRecord.id;
    }

    // Fetch matching businesses
    let businesses = await prisma.business.findMany({
      where,
      include: {
        category: true,
        services: { where: { active: true } },
      },
    });

    // ── Post-query JS filters (case-insensitive — SQLite limitation) ────────
    if (parsed.location) {
      const locLower = parsed.location.toLowerCase();
      businesses = businesses.filter(
        (b) => b.city && b.city.toLowerCase().includes(locLower)
      );
    }

    // If budget set, keep businesses that have at least one service in budget
    if (parsed.budgetCents) {
      businesses = businesses.filter(
        (b) =>
          b.services.length === 0 ||
          b.services.some((s) => s.priceCents <= parsed.budgetCents * 1.25) // allow 25% over
      );
    }

    // ── Score + rank ────────────────────────────────────────────────────────
    const scored = businesses
      .map((b) => ({ ...b, matchScore: calcScore(b, parsed) }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 8); // top 8 results

    // ── Persist request ─────────────────────────────────────────────────────
    const record = await prisma.smartMatchRequest.create({
      data: {
        userId:  req.user.id,
        query:   query.trim(),
        parsed:  JSON.stringify(parsed),
        results: JSON.stringify(scored.map((b) => ({ id: b.id, score: b.matchScore }))),
      },
    });

    // ── Build human-readable "understood" summary ───────────────────────────
    const understood = [];
    if (categoryRecord)       understood.push({ label: "Category",  value: categoryRecord.name });
    if (parsed.location)      understood.push({ label: "Location",  value: parsed.location });
    if (parsed.budgetCents)   understood.push({ label: "Budget",    value: `up to $${(parsed.budgetCents / 100).toFixed(0)}` });
    if (parsed.time.urgent)   understood.push({ label: "Priority",  value: "Urgent / ASAP" });
    if (parsed.time.today)    understood.push({ label: "When",      value: "Today" });
    if (parsed.time.tomorrow) understood.push({ label: "When",      value: "Tomorrow" });
    if (parsed.time.hour)     understood.push({ label: "Time",      value: `After ${parsed.time.hour}${parsed.time.period ?? ""}` });

    res.json({
      smartMatchId: record.id,
      understood,
      results: scored,
      totalFound: scored.length,
      message:
        scored.length > 0
          ? `Found ${scored.length} provider${scored.length !== 1 ? "s" : ""} matching your request`
          : "No providers found — try different keywords or remove the budget/location filter",
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/smartmatch/history
// ---------------------------------------------------------------------------
router.get("/history", requireAuth, async (req, res, next) => {
  try {
    const history = await prisma.smartMatchRequest.findMany({
      where:   { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take:    10,
      select:  { id: true, query: true, createdAt: true, results: true },
    });

    // Attach result count to each history item
    const enriched = history.map((h) => {
      let count = 0;
      try { count = JSON.parse(h.results).length; } catch {}
      return { id: h.id, query: h.query, createdAt: h.createdAt, resultCount: count };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
