const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Barbers",            slug: "barbers",            icon: "scissors",  schema: [{ key: "chairCount", label: "Number of chairs", type: "number" }, { key: "walkInsWelcome", label: "Walk-ins welcome", type: "boolean" }] },
  { name: "Hair Salons",        slug: "hair-salons",        icon: "sparkles",  schema: [{ key: "specialties", label: "Specialties", type: "text" }] },
  { name: "Car Washes",         slug: "car-washes",         icon: "car",       schema: [{ key: "vehicleSizes", label: "Vehicle sizes served", type: "text" }, { key: "hasVacuum", label: "Vacuum included", type: "boolean" }] },
  { name: "Laundry",            slug: "laundry",            icon: "shirt",     schema: [{ key: "pickupDelivery", label: "Pickup & delivery available", type: "boolean" }, { key: "turnaroundHours", label: "Typical turnaround (hours)", type: "number" }] },
  { name: "Cleaning Services",  slug: "cleaning-services",  icon: "spray-can", schema: [{ key: "propertyTypes", label: "Property types serviced", type: "text" }, { key: "suppliesIncluded", label: "Supplies included", type: "boolean" }] },
  { name: "Plumbers",           slug: "plumbers",           icon: "wrench",    schema: [{ key: "licensed", label: "Licensed", type: "boolean" }, { key: "emergencyService", label: "24/7 emergency service", type: "boolean" }] },
  { name: "Electricians",       slug: "electricians",       icon: "zap",       schema: [{ key: "licensed", label: "Licensed", type: "boolean" }, { key: "commercialWork", label: "Handles commercial jobs", type: "boolean" }] },
  { name: "Mechanics",          slug: "mechanics",          icon: "cog",       schema: [{ key: "vehicleTypes", label: "Vehicle types serviced", type: "text" }, { key: "mobileService", label: "Mobile / on-site service", type: "boolean" }] },
  { name: "Photographers",      slug: "photographers",      icon: "camera",    schema: [{ key: "styles", label: "Photography styles", type: "text" }, { key: "travelsForShoots", label: "Willing to travel", type: "boolean" }] },
  { name: "Tutors",             slug: "tutors",             icon: "book-open", schema: [{ key: "subjects", label: "Subjects taught", type: "text" }, { key: "gradeLevel", label: "Grade level", type: "text" }] },
  { name: "Tailors",            slug: "tailors",            icon: "scissors",  schema: [{ key: "garmentTypes", label: "Garment types", type: "text" }, { key: "rushService", label: "Rush service available", type: "boolean" }] },
  { name: "Fitness Trainers",   slug: "fitness-trainers",   icon: "dumbbell",  schema: [{ key: "specialties", label: "Training specialties", type: "text" }, { key: "inHomeSessions", label: "In-home sessions", type: "boolean" }] },
  { name: "Event Planners",     slug: "event-planners",     icon: "calendar",  schema: [{ key: "eventTypes", label: "Event types", type: "text" }, { key: "maxGuestCapacity", label: "Max guests handled", type: "number" }] },
  { name: "Massage Therapists", slug: "massage-therapists", icon: "hand",      schema: [{ key: "modalities", label: "Modalities offered", type: "text" }, { key: "licensed", label: "Licensed", type: "boolean" }] },
  { name: "Freelancers",        slug: "freelancers",        icon: "laptop",    schema: [{ key: "skillTags", label: "Skills", type: "text" }, { key: "remoteOnly", label: "Remote only", type: "boolean" }] },
  { name: "Home Repair Services", slug: "home-repair",      icon: "hammer",    schema: [{ key: "specialties", label: "Repair specialties", type: "text" }, { key: "licensed", label: "Licensed & insured", type: "boolean" }] },
];

// ---------------------------------------------------------------------------
// BUSINESS DATA — 3-4 per category
// ---------------------------------------------------------------------------
const BUSINESSES = [
  // ── BARBERS ──────────────────────────────────────────────────────────────
  {
    slug: "barbers",
    name: "Fresh Fade Barbershop",
    description: "Classic cuts and modern fades in the heart of downtown. Walk-ins always welcome.",
    address: "12 Market St", city: "Springfield", phone: "555-0101", email: "hello@freshfade.test",
    avgRating: 4.9, reviewCount: 3,
    attributes: { chairCount: 4, walkInsWelcome: true },
    services: [
      { name: "Signature Fade", description: "Precision fade with line-up.", priceCents: 3500, durationMinutes: 45 },
      { name: "Beard Trim & Shape", description: "Hot towel beard sculpting.", priceCents: 1500, durationMinutes: 20 },
      { name: "Full Cut & Style", description: "Shampoo, cut and style.", priceCents: 5000, durationMinutes: 60 },
    ],
  },
  {
    slug: "barbers",
    name: "Kings & Cuts",
    description: "Old-school vibes, new-school precision. Straight razor shaves a specialty.",
    address: "55 Broad St", city: "Riverdale", phone: "555-0111", email: "kings@kingscuts.test",
    avgRating: 4.7, reviewCount: 2,
    attributes: { chairCount: 3, walkInsWelcome: true },
    services: [
      { name: "Classic Taper", description: "Clean taper cut to perfection.", priceCents: 3000, durationMinutes: 40 },
      { name: "Hot Towel Shave", description: "Traditional straight-razor shave.", priceCents: 2500, durationMinutes: 30 },
      { name: "Kids Cut (under 12)", description: "Quick and fun cuts for little ones.", priceCents: 2000, durationMinutes: 25 },
    ],
  },
  {
    slug: "barbers",
    name: "The Grooming Lab",
    description: "Premium men's grooming with organic products. By appointment and walk-ins.",
    address: "88 Oak Ave", city: "Lakeview", phone: "555-0122", email: "lab@groominglab.test",
    avgRating: 4.8, reviewCount: 2,
    attributes: { chairCount: 2, walkInsWelcome: false },
    services: [
      { name: "Luxury Haircut", description: "Premium cut with scalp massage.", priceCents: 6000, durationMinutes: 60 },
      { name: "Color & Style", description: "Hair coloring and finishing style.", priceCents: 9000, durationMinutes: 90 },
    ],
  },
  {
    slug: "barbers",
    name: "Barberia Del Rey",
    description: "Latino-style barbershop offering fades, designs and eyebrow threading.",
    address: "202 Main Plaza", city: "Westside", phone: "555-0133", email: "delrey@barberia.test",
    avgRating: 4.6, reviewCount: 1,
    attributes: { chairCount: 6, walkInsWelcome: true },
    services: [
      { name: "Design Cut", description: "Custom hair designs carved in.", priceCents: 4500, durationMinutes: 60 },
      { name: "Fade + Eyebrow", description: "Fade with eyebrow clean-up.", priceCents: 4000, durationMinutes: 50 },
    ],
  },
];

// ── HAIR SALONS ────────────────────────────────────────────────────────────
BUSINESSES.push(
  {
    slug: "hair-salons",
    name: "Glow Studio",
    description: "Award-winning hair studio specialising in balayage, keratin and silk press treatments.",
    address: "34 Maple Dr", city: "Springfield", phone: "555-0201", email: "hello@glowstudio.test",
    avgRating: 4.9, reviewCount: 3,
    attributes: { specialties: "Balayage, Keratin Treatment, Silk Press" },
    services: [
      { name: "Balayage Color", description: "Hand-painted highlights for a sun-kissed look.", priceCents: 15000, durationMinutes: 120 },
      { name: "Keratin Treatment", description: "Frizz-free smoothing treatment.", priceCents: 18000, durationMinutes: 150 },
      { name: "Wash, Cut & Blow Dry", description: "Classic refresh.", priceCents: 7000, durationMinutes: 75 },
    ],
  },
  {
    slug: "hair-salons",
    name: "The Curl Bar",
    description: "Curl specialists. We love every curl pattern from 2a to 4c.",
    address: "19 Vine St", city: "Riverdale", phone: "555-0211", email: "curls@thecurlbar.test",
    avgRating: 4.8, reviewCount: 2,
    attributes: { specialties: "Natural Hair, Braiding, Locs" },
    services: [
      { name: "Curl Definition Treatment", description: "Deep conditioning + styling.", priceCents: 9500, durationMinutes: 90 },
      { name: "Protective Braids", description: "Box braids or cornrows.", priceCents: 12000, durationMinutes: 180 },
      { name: "Loc Maintenance", description: "Re-twist and palm roll.", priceCents: 8000, durationMinutes: 120 },
    ],
  },
  {
    slug: "hair-salons",
    name: "Bliss Hair Lounge",
    description: "Full-service salon offering colour, cuts and extensions in a relaxed atmosphere.",
    address: "77 Park Blvd", city: "Lakeview", phone: "555-0222", email: "hi@blisshair.test",
    avgRating: 4.7, reviewCount: 2,
    attributes: { specialties: "Extensions, Color Correction, Highlights" },
    services: [
      { name: "Full Color", description: "Single process all-over color.", priceCents: 11000, durationMinutes: 120 },
      { name: "Hair Extensions", description: "Tape-in or sew-in extensions.", priceCents: 25000, durationMinutes: 180 },
      { name: "Haircut & Style", description: "Precision cut + blow-dry.", priceCents: 6500, durationMinutes: 60 },
    ],
  }
);

// ── CAR WASHES ─────────────────────────────────────────────────────────────
BUSINESSES.push(
  {
    slug: "car-washes",
    name: "Sparkle Auto Wash",
    description: "Express and full-detail car washes using eco-friendly products.",
    address: "1 Highway Loop", city: "Springfield", phone: "555-0301", email: "wash@sparkleauto.test",
    avgRating: 4.7, reviewCount: 3,
    attributes: { vehicleSizes: "Sedan, SUV, Truck", hasVacuum: true },
    services: [
      { name: "Express Wash", description: "Exterior rinse and dry.", priceCents: 1500, durationMinutes: 15 },
      { name: "Full Detail", description: "Interior + exterior deep detail.", priceCents: 12000, durationMinutes: 120 },
      { name: "Interior Vacuum", description: "Full interior vacuum and wipe-down.", priceCents: 4000, durationMinutes: 45 },
    ],
  },
  {
    slug: "car-washes",
    name: "Crystal Clear Detailing",
    description: "Hand-wash specialists. Your car leaves spotless, guaranteed.",
    address: "22 Commerce Rd", city: "Westside", phone: "555-0311", email: "detail@crystalclear.test",
    avgRating: 4.9, reviewCount: 2,
    attributes: { vehicleSizes: "All sizes", hasVacuum: true },
    services: [
      { name: "Ceramic Coating", description: "Long-lasting paint protection.", priceCents: 35000, durationMinutes: 240 },
      { name: "Paint Correction", description: "Remove swirls and scratches.", priceCents: 22000, durationMinutes: 180 },
      { name: "Basic Hand Wash", description: "Gentle exterior hand wash.", priceCents: 2500, durationMinutes: 30 },
    ],
  },
  {
    slug: "car-washes",
    name: "Quick Shine Mobile Wash",
    description: "We come to you! Mobile car wash service at your home or office.",
    address: "Mobile Service", city: "Riverdale", phone: "555-0322", email: "mobile@quickshine.test",
    avgRating: 4.6, reviewCount: 2,
    attributes: { vehicleSizes: "Sedan, SUV", hasVacuum: false },
    services: [
      { name: "Mobile Exterior Wash", description: "Come-to-you exterior wash.", priceCents: 3500, durationMinutes: 40 },
      { name: "Mobile Full Detail", description: "Full detail at your location.", priceCents: 14000, durationMinutes: 150 },
    ],
  }
);

// ── LAUNDRY ────────────────────────────────────────────────────────────────
BUSINESSES.push(
  {
    slug: "laundry",
    name: "FreshFold Laundry",
    description: "Drop-off laundry service with same-day and next-day options.",
    address: "45 Wash Lane", city: "Springfield", phone: "555-0401", email: "fresh@freshfold.test",
    avgRating: 4.8, reviewCount: 3,
    attributes: { pickupDelivery: true, turnaroundHours: 24 },
    services: [
      { name: "Wash & Fold (per kg)", description: "Standard wash, dry and fold.", priceCents: 300, durationMinutes: 60 },
      { name: "Dry Cleaning", description: "Professional dry clean for delicates.", priceCents: 1500, durationMinutes: 120 },
      { name: "Pickup & Delivery", description: "We collect and return to your door.", priceCents: 2000, durationMinutes: 30 },
    ],
  },
  {
    slug: "laundry",
    name: "White Glove Cleaners",
    description: "Premium dry cleaning, alterations and wedding dress preservation.",
    address: "8 Prestige Blvd", city: "Lakeview", phone: "555-0411", email: "care@whiteglove.test",
    avgRating: 4.9, reviewCount: 2,
    attributes: { pickupDelivery: true, turnaroundHours: 48 },
    services: [
      { name: "Suit Dry Clean", description: "Full suit pressed and cleaned.", priceCents: 4500, durationMinutes: 60 },
      { name: "Wedding Dress Preservation", description: "Clean and box preservation.", priceCents: 25000, durationMinutes: 240 },
      { name: "Shirt Laundering", description: "Per shirt wash and press.", priceCents: 800, durationMinutes: 30 },
    ],
  },
  {
    slug: "laundry",
    name: "Suds & Spin",
    description: "Coin-op laundromat with attendant wash-and-fold service available.",
    address: "101 Elm St", city: "Westside", phone: "555-0422", email: "info@sudsspin.test",
    avgRating: 4.3, reviewCount: 2,
    attributes: { pickupDelivery: false, turnaroundHours: 4 },
    services: [
      { name: "Self-Service Wash Load", description: "Large-capacity washer use.", priceCents: 600, durationMinutes: 45 },
      { name: "Attendant Wash & Fold", description: "Drop off — we handle it.", priceCents: 1200, durationMinutes: 120 },
    ],
  }
);

// ── CLEANING SERVICES ──────────────────────────────────────────────────────
BUSINESSES.push(
  {
    slug: "cleaning-services",
    name: "Amara Home Cleaning",
    description: "Detail-oriented residential and office cleaning. All supplies included.",
    address: "88 Oak Ave", city: "Springfield", phone: "555-0202", email: "hello@amaraclean.test",
    avgRating: 4.9, reviewCount: 3,
    attributes: { propertyTypes: "Apartments, Houses, Offices", suppliesIncluded: true },
    services: [
      { name: "2-Bedroom Deep Clean", description: "Top-to-bottom deep clean.", priceCents: 9000, durationMinutes: 150 },
      { name: "Regular Weekly Clean", description: "Standard maintenance clean.", priceCents: 5500, durationMinutes: 90 },
      { name: "Move-In / Move-Out Clean", description: "Thorough clean for empty properties.", priceCents: 14000, durationMinutes: 180 },
    ],
  },
  {
    slug: "cleaning-services",
    name: "EcoShine Cleaners",
    description: "100% eco-friendly products, safe for kids and pets.",
    address: "30 Green Way", city: "Lakeview", phone: "555-0502", email: "eco@ecoshine.test",
    avgRating: 4.8, reviewCount: 2,
    attributes: { propertyTypes: "Houses, Condos", suppliesIncluded: true },
    services: [
      { name: "Eco Regular Clean", description: "Green products, spotless results.", priceCents: 6000, durationMinutes: 90 },
      { name: "Post-Construction Clean", description: "Remove dust & debris after builds.", priceCents: 20000, durationMinutes: 240 },
    ],
  },
  {
    slug: "cleaning-services",
    name: "Pro Office Cleaning",
    description: "Commercial office cleaning after hours, discreet and professional.",
    address: "10 Business Park", city: "Riverdale", phone: "555-0512", email: "office@proclean.test",
    avgRating: 4.6, reviewCount: 2,
    attributes: { propertyTypes: "Offices, Retail Shops, Warehouses", suppliesIncluded: true },
    services: [
      { name: "Office Nightly Clean", description: "Desks, floors, bathrooms.", priceCents: 7500, durationMinutes: 120 },
      { name: "Carpet Steam Clean", description: "Professional carpet steaming.", priceCents: 11000, durationMinutes: 120 },
      { name: "Window Cleaning", description: "Interior & exterior window clean.", priceCents: 5000, durationMinutes: 90 },
    ],
  }
);

// ── PLUMBERS ───────────────────────────────────────────────────────────────
BUSINESSES.push(
  {
    slug: "plumbers",
    name: "QuickFix Plumbing",
    description: "Licensed plumbers available 7 days a week. No job too big or small.",
    address: "77 Pipe Rd", city: "Springfield", phone: "555-0601", email: "fix@quickfixplumbing.test",
    avgRating: 4.7, reviewCount: 3,
    attributes: { licensed: true, emergencyService: true },
    services: [
      { name: "Leak Repair", description: "Diagnose and fix pipe leaks.", priceCents: 8000, durationMinutes: 60 },
      { name: "Drain Unblocking", description: "Clear blocked sinks and drains.", priceCents: 6000, durationMinutes: 45 },
      { name: "Geyser Installation", description: "Supply and install water heater.", priceCents: 35000, durationMinutes: 180 },
    ],
  },
  {
    slug: "plumbers",
    name: "AquaFlow Plumbing",
    description: "Residential plumbing specialists — new installs to emergency repairs.",
    address: "5 River Close", city: "Westside", phone: "555-0611", email: "flow@aquaflow.test",
    avgRating: 4.8, reviewCount: 2,
    attributes: { licensed: true, emergencyService: true },
    services: [
      { name: "Toilet Repair / Replace", description: "Fix or replace toilet unit.", priceCents: 9500, durationMinutes: 90 },
      { name: "Bathroom Renovation Plumbing", description: "Full plumbing for bathroom reno.", priceCents: 55000, durationMinutes: 480 },
    ],
  },
  {
    slug: "plumbers",
    name: "PipePro Services",
    description: "Commercial and industrial plumbing. Inspections and certifications available.",
    address: "200 Industrial Way", city: "Lakeview", phone: "555-0622", email: "pro@pipepro.test",
    avgRating: 4.5, reviewCount: 2,
    attributes: { licensed: true, emergencyService: false },
    services: [
      { name: "CCTV Pipe Inspection", description: "Camera survey of underground pipes.", priceCents: 18000, durationMinutes: 120 },
      { name: "Burst Pipe Emergency", description: "24h emergency burst pipe repair.", priceCents: 15000, durationMinutes: 90 },
    ],
  }
);

// ── ELECTRICIANS ───────────────────────────────────────────────────────────
BUSINESSES.push(
  {
    slug: "electricians",
    name: "Bright Spark Electric",
    description: "Licensed electricians for residential and commercial installations.",
    address: "14 Volt Ave", city: "Springfield", phone: "555-0701", email: "spark@brightspark.test",
    avgRating: 4.8, reviewCount: 3,
    attributes: { licensed: true, commercialWork: true },
    services: [
      { name: "Fault Finding", description: "Diagnose electrical faults.", priceCents: 7000, durationMinutes: 60 },
      { name: "Plug & Switch Install", description: "Install outlets and light switches.", priceCents: 3500, durationMinutes: 30 },
      { name: "DB Board Upgrade", description: "Distribution board replacement.", priceCents: 22000, durationMinutes: 180 },
    ],
  },
  {
    slug: "electricians",
    name: "Watt's Up Electrical",
    description: "Solar, EV charger installs and general electrical work done right.",
    address: "9 Solar St", city: "Lakeview", phone: "555-0711", email: "power@wattsup.test",
    avgRating: 4.9, reviewCount: 2,
    attributes: { licensed: true, commercialWork: false },
    services: [
      { name: "Solar Panel Installation", description: "Rooftop solar system install.", priceCents: 85000, durationMinutes: 480 },
      { name: "EV Charger Installation", description: "Home EV charging point.", priceCents: 18000, durationMinutes: 120 },
      { name: "Rewiring", description: "Full home rewiring service.", priceCents: 45000, durationMinutes: 360 },
    ],
  },
  {
    slug: "electricians",
    name: "PowerLine Pro",
    description: "Commercial electricians for offices, retail and industrial units.",
    address: "55 Commerce Park", city: "Riverdale", phone: "555-0722", email: "info@powerlinepro.test",
    avgRating: 4.6, reviewCount: 2,
    attributes: { licensed: true, commercialWork: true },
    services: [
      { name: "Office Lighting Install", description: "LED lighting installation.", priceCents: 15000, durationMinutes: 120 },
      { name: "Emergency Callout", description: "After-hours emergency electrical.", priceCents: 12000, durationMinutes: 90 },
    ],
  }
);

// ── MECHANICS ──────────────────────────────────────────────────────────────
BUSINESSES.push(
  {
    slug: "mechanics",
    name: "Rev Auto Workshop",
    description: "Full-service auto repair. All makes and models welcome.",
    address: "1 Gear Lane", city: "Springfield", phone: "555-0801", email: "rev@revauto.test",
    avgRating: 4.8, reviewCount: 3,
    attributes: { vehicleTypes: "Sedan, SUV, Hatchback", mobileService: false },
    services: [
      { name: "Full Service", description: "Oil, filters, plugs & inspection.", priceCents: 8500, durationMinutes: 120 },
      { name: "Brake Service", description: "Pads, rotors and fluid check.", priceCents: 7000, durationMinutes: 90 },
      { name: "Tyre Change (4 tyres)", description: "Mount and balance 4 tyres.", priceCents: 5000, durationMinutes: 60 },
    ],
  },
  {
    slug: "mechanics",
    name: "Mobile Mechanic Mike",
    description: "Come-to-you mechanic. We fix your car at your home or office.",
    address: "Mobile Service", city: "Lakeview", phone: "555-0811", email: "mike@mobilemike.test",
    avgRating: 4.9, reviewCount: 2,
    attributes: { vehicleTypes: "Most passenger vehicles", mobileService: true },
    services: [
      { name: "Mobile Service & Repair", description: "On-site diagnostics and repair.", priceCents: 9500, durationMinutes: 90 },
      { name: "Battery Replacement", description: "Test and replace car battery.", priceCents: 3500, durationMinutes: 30 },
    ],
  },
  {
    slug: "mechanics",
    name: "German Auto Specialists",
    description: "BMW, Mercedes, Audi, VW experts. Genuine parts only.",
    address: "88 Precision Dr", city: "Westside", phone: "555-0822", email: "german@gasauto.test",
    avgRating: 4.7, reviewCount: 2,
    attributes: { vehicleTypes: "BMW, Mercedes, Audi, VW", mobileService: false },
    services: [
      { name: "BMW/Merc Service A", description: "Manufacturer-spec service A.", priceCents: 15000, durationMinutes: 150 },
      { name: "Diagnostic Scan", description: "Full computer diagnostic.", priceCents: 5000, durationMinutes: 60 },
      { name: "Clutch Replacement", description: "Full clutch kit replacement.", priceCents: 28000, durationMinutes: 300 },
    ],
  }
);

// ── PHOTOGRAPHERS ──────────────────────────────────────────────────────────
BUSINESSES.push(
  {
    slug: "photographers",
    name: "Lens & Light Studio",
    description: "Portrait, wedding and commercial photography. Stunning results every time.",
    address: "33 Creative Quarter", city: "Springfield", phone: "555-0901", email: "hello@lenslight.test",
    avgRating: 4.9, reviewCount: 3,
    attributes: { styles: "Portrait, Wedding, Commercial", travelsForShoots: true },
    services: [
      { name: "Wedding Day Coverage", description: "Full-day wedding photography.", priceCents: 120000, durationMinutes: 480 },
      { name: "Family Portrait Session", description: "1-hour outdoor portrait session.", priceCents: 15000, durationMinutes: 60 },
      { name: "Corporate Headshots", description: "Professional headshots (10 edited).", priceCents: 20000, durationMinutes: 90 },
    ],
  },
  {
    slug: "photographers",
    name: "Click & Capture",
    description: "Event, product and real-estate photography at competitive rates.",
    address: "7 Studio Rd", city: "Riverdale", phone: "555-0911", email: "click@clickcapture.test",
    avgRating: 4.7, reviewCount: 2,
    attributes: { styles: "Event, Product, Real Estate", travelsForShoots: true },
    services: [
      { name: "Real Estate Photography", description: "Interior & exterior property shoot.", priceCents: 18000, durationMinutes: 120 },
      { name: "Product Photography", description: "White-background product shoot.", priceCents: 12000, durationMinutes: 90 },
    ],
  },
  {
    slug: "photographers",
    name: "Golden Hour Photography",
    description: "Lifestyle and engagement shoots. Outdoor locations our specialty.",
    address: "Park Central", city: "Lakeview", phone: "555-0922", email: "golden@goldenhour.test",
    avgRating: 4.8, reviewCount: 2,
    attributes: { styles: "Lifestyle, Engagement, Maternity", travelsForShoots: true },
    services: [
      { name: "Engagement Shoot", description: "Romantic 2-hour outdoor session.", priceCents: 22000, durationMinutes: 120 },
      { name: "Maternity Session", description: "Beautiful maternity portraits.", priceCents: 18000, durationMinutes: 90 },
      { name: "Newborn Session", description: "Delicate newborn studio session.", priceCents: 20000, durationMinutes: 120 },
    ],
  }
);

// ── TUTORS ─────────────────────────────────────────────────────────────────
BUSINESSES.push(
  {
    slug: "tutors",
    name: "Ace Tutoring Centre",
    description: "Helping students from Grade 1 to Grade 12 excel in Maths and Sciences.",
    address: "22 Learning Lane", city: "Springfield", phone: "555-1001", email: "ace@acetutoring.test",
    avgRating: 4.9, reviewCount: 3,
    attributes: { subjects: "Mathematics, Physical Science, Accounting", gradeLevel: "Grade 8-12" },
    services: [
      { name: "Maths Tutoring (1hr)", description: "One-on-one maths session.", priceCents: 4500, durationMinutes: 60 },
      { name: "Science Tutoring (1hr)", description: "Physical science deep dive.", priceCents: 4500, durationMinutes: 60 },
      { name: "Exam Preparation Package", description: "5-session exam prep bundle.", priceCents: 20000, durationMinutes: 300 },
    ],
  },
  {
    slug: "tutors",
    name: "Bright Minds Online",
    description: "Online tutoring for primary and high school — all subjects.",
    address: "Online", city: "Remote", phone: "555-1011", email: "learn@brightminds.test",
    avgRating: 4.8, reviewCount: 2,
    attributes: { subjects: "All Major Subjects", gradeLevel: "Grade 1-12" },
    services: [
      { name: "Online Session (60 min)", description: "Video call tutoring session.", priceCents: 3500, durationMinutes: 60 },
      { name: "Weekly Package (4 sessions)", description: "Consistent weekly support.", priceCents: 12000, durationMinutes: 240 },
    ],
  },
  {
    slug: "tutors",
    name: "Language Lab",
    description: "Foreign language lessons: Spanish, French, Mandarin and more.",
    address: "5 Lingua Square", city: "Westside", phone: "555-1022", email: "hola@languagelab.test",
    avgRating: 4.7, reviewCount: 2,
    attributes: { subjects: "Spanish, French, Mandarin, German", gradeLevel: "All ages" },
    services: [
      { name: "Beginner Language Lesson", description: "First steps in your new language.", priceCents: 4000, durationMinutes: 60 },
      { name: "Conversational Practice", description: "Fluency-building conversation.", priceCents: 3500, durationMinutes: 60 },
      { name: "Business Language Course (10 sessions)", description: "Professional language skills.", priceCents: 35000, durationMinutes: 600 },
    ],
  }
);

// ── TAILORS ────────────────────────────────────────────────────────────────
BUSINESSES.push(
  {
    slug: "tailors",
    name: "Stitch Perfect Tailors",
    description: "Bespoke suits, dresses and alterations. Est. 2008.",
    address: "40 Thread St", city: "Springfield", phone: "555-1101", email: "stitch@stitchperfect.test",
    avgRating: 4.9, reviewCount: 3,
    attributes: { garmentTypes: "Suits, Dresses, Shirts, Pants", rushService: true },
    services: [
      { name: "Bespoke Suit", description: "Full custom two-piece suit.", priceCents: 60000, durationMinutes: 240 },
      { name: "Dress Alteration", description: "Hem, zip, or resize.", priceCents: 4500, durationMinutes: 60 },
      { name: "Shirt Tailoring", description: "Custom-fit dress shirt.", priceCents: 18000, durationMinutes: 90 },
    ],
  },
  {
    slug: "tailors",
    name: "Fabrique Couture",
    description: "High fashion alterations and bespoke gowns for weddings and events.",
    address: "15 Fashion Row", city: "Lakeview", phone: "555-1111", email: "fab@fabrique.test",
    avgRating: 4.8, reviewCount: 2,
    attributes: { garmentTypes: "Gowns, Wedding Dresses, Evening Wear", rushService: false },
    services: [
      { name: "Wedding Dress Alteration", description: "Fit your dress perfectly.", priceCents: 12000, durationMinutes: 180 },
      { name: "Custom Evening Gown", description: "Made-to-measure evening wear.", priceCents: 80000, durationMinutes: 360 },
    ],
  },
  {
    slug: "tailors",
    name: "The Tailor's Den",
    description: "Affordable everyday alterations done quickly and with care.",
    address: "9 Market Row", city: "Riverdale", phone: "555-1122", email: "den@tailorsden.test",
    avgRating: 4.5, reviewCount: 2,
    attributes: { garmentTypes: "All garments", rushService: true },
    services: [
      { name: "Trouser Hem", description: "Quick trouser hem alteration.", priceCents: 1500, durationMinutes: 30 },
      { name: "Zipper Replacement", description: "Replace broken zip.", priceCents: 2000, durationMinutes: 30 },
      { name: "General Alteration", description: "Any standard clothing alteration.", priceCents: 3000, durationMinutes: 45 },
    ],
  }
);

// ── FITNESS TRAINERS ───────────────────────────────────────────────────────
BUSINESSES.push(
  {
    slug: "fitness-trainers",
    name: "Iron Will Personal Training",
    description: "Results-driven personal training for weight loss, muscle gain and overall fitness.",
    address: "10 Fitness Blvd", city: "Springfield", phone: "555-1201", email: "train@ironwill.test",
    avgRating: 4.9, reviewCount: 3,
    attributes: { specialties: "Weight Loss, Muscle Gain, Athletic Performance", inHomeSessions: false },
    services: [
      { name: "1-on-1 Session (60 min)", description: "Personalised training session.", priceCents: 6500, durationMinutes: 60 },
      { name: "Monthly Package (12 sessions)", description: "Commitment package.", priceCents: 70000, durationMinutes: 720 },
      { name: "Fitness Assessment", description: "Body composition & goal planning.", priceCents: 3500, durationMinutes: 60 },
    ],
  },
  {
    slug: "fitness-trainers",
    name: "Move With Maria",
    description: "In-home personal training. Yoga, Pilates and functional fitness.",
    address: "Home Service", city: "Lakeview", phone: "555-1211", email: "maria@movewithmaria.test",
    avgRating: 4.8, reviewCount: 2,
    attributes: { specialties: "Yoga, Pilates, Functional Fitness", inHomeSessions: true },
    services: [
      { name: "In-Home Yoga Session", description: "60-minute private yoga class.", priceCents: 5500, durationMinutes: 60 },
      { name: "Pilates Class (1hr)", description: "Mat or reformer Pilates.", priceCents: 5500, durationMinutes: 60 },
    ],
  },
  {
    slug: "fitness-trainers",
    name: "Box & Burn Fitness",
    description: "Boxing-inspired HIIT training. Get fit and have fun doing it.",
    address: "77 Ring Rd", city: "Westside", phone: "555-1222", email: "box@boxandburn.test",
    avgRating: 4.7, reviewCount: 2,
    attributes: { specialties: "Boxing, HIIT, Cardio Conditioning", inHomeSessions: false },
    services: [
      { name: "Boxing Basics Session", description: "Learn pads and technique.", priceCents: 5000, durationMinutes: 60 },
      { name: "HIIT Boot Camp (group)", description: "High-energy group session.", priceCents: 2500, durationMinutes: 45 },
    ],
  }
);

// ── EVENT PLANNERS ─────────────────────────────────────────────────────────
BUSINESSES.push(
  {
    slug: "event-planners",
    name: "Grand Events Co.",
    description: "Full-service event planning for weddings, corporate functions and parties.",
    address: "5 Occasion Ave", city: "Springfield", phone: "555-1301", email: "plan@grandevents.test",
    avgRating: 4.9, reviewCount: 3,
    attributes: { eventTypes: "Weddings, Corporate, Birthday, Gala", maxGuestCapacity: 500 },
    services: [
      { name: "Full Wedding Planning", description: "End-to-end wedding coordination.", priceCents: 200000, durationMinutes: 600 },
      { name: "Corporate Event (half day)", description: "Conference or team event.", priceCents: 80000, durationMinutes: 240 },
      { name: "Event Consultation (2hrs)", description: "Initial planning session.", priceCents: 8000, durationMinutes: 120 },
    ],
  },
  {
    slug: "event-planners",
    name: "Party Pros",
    description: "Kids parties, birthdays and intimate gatherings handled with creativity.",
    address: "22 Balloon St", city: "Riverdale", phone: "555-1311", email: "party@partypros.test",
    avgRating: 4.7, reviewCount: 2,
    attributes: { eventTypes: "Kids Parties, Birthdays, Baby Showers", maxGuestCapacity: 100 },
    services: [
      { name: "Kids Party Package", description: "Decor, entertainment, catering co-ord.", priceCents: 35000, durationMinutes: 300 },
      { name: "Baby Shower Planning", description: "Theme, venue, invitations.", priceCents: 25000, durationMinutes: 180 },
    ],
  },
  {
    slug: "event-planners",
    name: "Luxe Affairs",
    description: "Luxury weddings and high-end gala events. Exclusive vendor network.",
    address: "1 Diamond Rd", city: "Lakeview", phone: "555-1322", email: "luxe@luxeaffairs.test",
    avgRating: 4.8, reviewCount: 2,
    attributes: { eventTypes: "Luxury Weddings, Galas, VIP Events", maxGuestCapacity: 1000 },
    services: [
      { name: "Luxury Wedding Package", description: "Premium full-service wedding.", priceCents: 500000, durationMinutes: 720 },
      { name: "Gala Night Coordination", description: "Black-tie event management.", priceCents: 150000, durationMinutes: 480 },
    ],
  }
);

// ── MASSAGE THERAPISTS ─────────────────────────────────────────────────────
BUSINESSES.push(
  {
    slug: "massage-therapists",
    name: "Tranquil Touch Massage",
    description: "Licensed massage therapists offering relaxation and therapeutic treatments.",
    address: "88 Serenity Blvd", city: "Springfield", phone: "555-1401", email: "relax@tranquiltouch.test",
    avgRating: 4.9, reviewCount: 3,
    attributes: { modalities: "Swedish, Deep Tissue, Hot Stone, Aromatherapy", licensed: true },
    services: [
      { name: "Swedish Relaxation (60 min)", description: "Full-body relaxation massage.", priceCents: 8000, durationMinutes: 60 },
      { name: "Deep Tissue (90 min)", description: "Target muscle knots and tension.", priceCents: 12000, durationMinutes: 90 },
      { name: "Hot Stone Massage", description: "Heated volcanic stone therapy.", priceCents: 13500, durationMinutes: 90 },
    ],
  },
  {
    slug: "massage-therapists",
    name: "Revive Sports Therapy",
    description: "Sports massage and injury rehabilitation for athletes and active people.",
    address: "12 Athletics Way", city: "Lakeview", phone: "555-1411", email: "revive@revivesports.test",
    avgRating: 4.8, reviewCount: 2,
    attributes: { modalities: "Sports Massage, Trigger Point, Myofascial Release", licensed: true },
    services: [
      { name: "Sports Massage (60 min)", description: "Pre/post event muscle treatment.", priceCents: 9000, durationMinutes: 60 },
      { name: "Injury Rehab Session", description: "Targeted rehabilitation therapy.", priceCents: 11000, durationMinutes: 75 },
    ],
  },
  {
    slug: "massage-therapists",
    name: "Zen Mobile Massage",
    description: "Mobile massage — we bring the spa to your home or hotel.",
    address: "Mobile Service", city: "Westside", phone: "555-1422", email: "zen@zenmobile.test",
    avgRating: 4.7, reviewCount: 2,
    attributes: { modalities: "Swedish, Prenatal, Couples Massage", licensed: true },
    services: [
      { name: "In-Home Swedish (90 min)", description: "Relaxation massage at your location.", priceCents: 14000, durationMinutes: 90 },
      { name: "Couples Massage Package", description: "Side-by-side massage for two.", priceCents: 25000, durationMinutes: 90 },
      { name: "Prenatal Massage", description: "Safe massage for expectant mothers.", priceCents: 10000, durationMinutes: 60 },
    ],
  }
);

// ── FREELANCERS ────────────────────────────────────────────────────────────
BUSINESSES.push(
  {
    slug: "freelancers",
    name: "Digital Craft Studio",
    description: "Full-stack web development, UI/UX design and mobile apps.",
    address: "Online", city: "Remote", phone: "555-1501", email: "hello@digitalcraft.test",
    avgRating: 4.9, reviewCount: 3,
    attributes: { skillTags: "React, Node.js, UI/UX, Mobile Apps", remoteOnly: true },
    services: [
      { name: "Landing Page Build", description: "Custom responsive landing page.", priceCents: 35000, durationMinutes: 480 },
      { name: "Full-Stack App (MVP)", description: "Web app from design to deploy.", priceCents: 150000, durationMinutes: 2400 },
      { name: "UI/UX Audit & Redesign", description: "Improve conversion and usability.", priceCents: 25000, durationMinutes: 360 },
    ],
  },
  {
    slug: "freelancers",
    name: "Wordsmith Content Agency",
    description: "SEO copywriting, blog posts, social media and email campaigns.",
    address: "Online", city: "Remote", phone: "555-1511", email: "write@wordsmith.test",
    avgRating: 4.8, reviewCount: 2,
    attributes: { skillTags: "Copywriting, SEO, Social Media, Email Marketing", remoteOnly: true },
    services: [
      { name: "Blog Post (1000 words)", description: "SEO-optimised article.", priceCents: 8000, durationMinutes: 120 },
      { name: "Social Media Package (1 month)", description: "20 posts + captions + scheduling.", priceCents: 25000, durationMinutes: 480 },
      { name: "Email Campaign (5 emails)", description: "Sequence + copywriting.", priceCents: 18000, durationMinutes: 240 },
    ],
  },
  {
    slug: "freelancers",
    name: "PixelForge Design",
    description: "Logo design, brand identity, illustrations and print collateral.",
    address: "Online", city: "Remote", phone: "555-1522", email: "design@pixelforge.test",
    avgRating: 4.7, reviewCount: 2,
    attributes: { skillTags: "Logo Design, Branding, Illustration, Print", remoteOnly: false },
    services: [
      { name: "Logo Design Package", description: "Logo + 2 revisions + files.", priceCents: 20000, durationMinutes: 360 },
      { name: "Full Brand Identity", description: "Logo, colors, fonts, guidelines.", priceCents: 55000, durationMinutes: 720 },
      { name: "Business Card Design", description: "Front + back design ready to print.", priceCents: 5000, durationMinutes: 60 },
    ],
  }
);

// ── HOME REPAIR SERVICES ───────────────────────────────────────────────────
BUSINESSES.push(
  {
    slug: "home-repair",
    name: "HandyDave Home Repairs",
    description: "General handyman for all household repairs, assembly and installations.",
    address: "31 Tool Terrace", city: "Springfield", phone: "555-1601", email: "dave@handydave.test",
    avgRating: 4.8, reviewCount: 3,
    attributes: { specialties: "Drywall, Painting, Fixtures, Assembly", licensed: false },
    services: [
      { name: "Handyman Hour", description: "General repairs billed per hour.", priceCents: 5500, durationMinutes: 60 },
      { name: "Furniture Assembly", description: "Flat-pack assembly service.", priceCents: 4000, durationMinutes: 60 },
      { name: "Painting (per room)", description: "Walls, ceiling, trim per room.", priceCents: 18000, durationMinutes: 300 },
    ],
  },
  {
    slug: "home-repair",
    name: "Build Right Contractors",
    description: "Licensed and insured contractors for renovations, tiling and carpentry.",
    address: "66 Build Ave", city: "Lakeview", phone: "555-1611", email: "build@buildright.test",
    avgRating: 4.9, reviewCount: 2,
    attributes: { specialties: "Renovations, Tiling, Carpentry, Drywall", licensed: true },
    services: [
      { name: "Bathroom Retile", description: "Strip and retile bathroom floor/walls.", priceCents: 65000, durationMinutes: 480 },
      { name: "Kitchen Renovation", description: "Full kitchen reno project.", priceCents: 200000, durationMinutes: 2400 },
      { name: "Custom Carpentry", description: "Built-in cupboards or shelving.", priceCents: 35000, durationMinutes: 360 },
    ],
  },
  {
    slug: "home-repair",
    name: "Fix It Fast Services",
    description: "Small repairs done quickly. Locks, doors, windows, gutters.",
    address: "4 Rapid Close", city: "Riverdale", phone: "555-1622", email: "fix@fixitfast.test",
    avgRating: 4.6, reviewCount: 2,
    attributes: { specialties: "Locks, Doors, Windows, Gutters, Minor Repairs", licensed: false },
    services: [
      { name: "Lock Replacement", description: "Replace door lock or deadbolt.", priceCents: 3500, durationMinutes: 45 },
      { name: "Gutter Clean & Repair", description: "Clear and reseal gutters.", priceCents: 6000, durationMinutes: 90 },
      { name: "Window Seal Repair", description: "Fix broken window seals.", priceCents: 4500, durationMinutes: 60 },
    ],
  }
);

// ---------------------------------------------------------------------------
// SAMPLE REVIEWS per business (rotated)
// ---------------------------------------------------------------------------
const REVIEW_POOL = [
  { rating: 5, comment: "Absolutely fantastic service, exceeded every expectation!" },
  { rating: 5, comment: "Professional, punctual and great value for money." },
  { rating: 4, comment: "Really good experience overall. Will definitely come back." },
  { rating: 5, comment: "The best in the city — I recommend them to everyone." },
  { rating: 4, comment: "Great work, minor communication hiccup but sorted quickly." },
  { rating: 5, comment: "Incredible attention to detail. Loved every minute." },
  { rating: 4, comment: "Very skilled and friendly. Booked again already!" },
  { rating: 5, comment: "Top-notch quality and super fast. 10/10 would use again." },
];

// ---------------------------------------------------------------------------
// MAIN SEED FUNCTION
// ---------------------------------------------------------------------------
async function main() {
  console.log("🌱  Seeding categories...");
  const catRecords = {};
  for (const c of CATEGORIES) {
    const rec = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { icon: c.icon, attributeSchema: JSON.stringify(c.schema) },
      create: { name: c.name, slug: c.slug, icon: c.icon, attributeSchema: JSON.stringify(c.schema) },
    });
    catRecords[c.slug] = rec;
  }
  console.log(`   ✓ ${Object.keys(catRecords).length} categories ready`);

  console.log("🌱  Seeding users...");
  const pw = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@platform.test" },
    update: { roles: JSON.stringify(["ADMIN"]), currentRole: "ADMIN", role: "ADMIN" },
    create: { name: "Platform Admin", email: "admin@platform.test", passwordHash: pw, role: "ADMIN", roles: JSON.stringify(["ADMIN"]), currentRole: "ADMIN" },
  });

  // Create one owner account per business (using index for uniqueness)
  const ownerCache = {};
  async function getOrCreateOwner(idx, bizName) {
    const email = `owner${idx}@platform.test`;
    if (ownerCache[email]) return ownerCache[email];
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name: `${bizName} Owner`, email, passwordHash: pw, role: "BUSINESS_OWNER", roles: JSON.stringify(["BUSINESS_OWNER"]), currentRole: "BUSINESS_OWNER" },
    });
    ownerCache[email] = u;
    return u;
  }

  // Create a set of sample customers for reviews and bookings
  const customers = [];
  const customerNames = ["Taylor Nguyen", "Jordan Smith", "Sam Okafor", "Alex Rivera", "Casey Kim"];
  for (let i = 0; i < customerNames.length; i++) {
    const email = `customer${i + 1}@platform.test`;
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name: customerNames[i], email, passwordHash: pw, role: "CUSTOMER" },
    });
    customers.push(u);
  }
  console.log("   ✓ Users ready");

  console.log("🌱  Seeding businesses, services, reviews & availability...");
  let bizCount = 0;

  for (let bi = 0; bi < BUSINESSES.length; bi++) {
    const bDef = BUSINESSES[bi];
    const catRec = catRecords[bDef.slug];
    if (!catRec) { console.warn(`   ⚠ Unknown slug ${bDef.slug}`); continue; }

    const owner = await getOrCreateOwner(bi, bDef.name);

    // Check if business already exists (idempotent re-runs skip existing ones)
    const existing = await prisma.business.findFirst({ where: { name: bDef.name } });
    if (existing) { bizCount++; continue; }

    // Create the business
    const biz = await prisma.business.create({
      data: {
        name: bDef.name,
        description: bDef.description,
        categoryId: catRec.id,
        ownerId: owner.id,
        address: bDef.address || null,
        city: bDef.city || null,
        phone: bDef.phone || null,
        email: bDef.email || null,
        status: "APPROVED",
        attributes: JSON.stringify(bDef.attributes || {}),
        avgRating: bDef.avgRating || 0,
        reviewCount: bDef.reviewCount || 0,
      },
    });

    // Create services
    const createdServices = [];
    for (const svc of (bDef.services || [])) {
      const s = await prisma.service.create({
        data: {
          businessId: biz.id,
          categoryId: catRec.id,
          name: svc.name,
          description: svc.description || null,
          priceCents: svc.priceCents,
          durationMinutes: svc.durationMinutes || 60,
        },
      });
      createdServices.push(s);
    }

    // Seed weekly availability (Mon–Fri 09:00–17:00, Sat 09:00–13:00)
    const weekdays = [1, 2, 3, 4, 5];
    for (const day of weekdays) {
      await prisma.availability.create({ data: { businessId: biz.id, dayOfWeek: day, startTime: "09:00", endTime: "17:00" } });
    }
    await prisma.availability.create({ data: { businessId: biz.id, dayOfWeek: 6, startTime: "09:00", endTime: "13:00" } });

    // Seed reviews using the first service
    if (createdServices.length > 0) {
      const firstSvc = createdServices[0];
      const reviewsToCreate = Math.min(bDef.reviewCount || 0, customers.length);
      for (let ri = 0; ri < reviewsToCreate; ri++) {
        const customer = customers[ri % customers.length];
        const rv = REVIEW_POOL[(bi + ri) % REVIEW_POOL.length];
        // Past booking for each review
        const pastDate = new Date(Date.now() - (ri + 1) * 14 * 24 * 3600 * 1000);
        const booking = await prisma.booking.create({
          data: {
            customerId: customer.id,
            businessId: biz.id,
            serviceId: firstSvc.id,
            scheduledAt: pastDate,
            status: "COMPLETED",
            priceCents: firstSvc.priceCents,
          },
        });
        await prisma.payment.create({
          data: { bookingId: booking.id, amountCents: firstSvc.priceCents, status: "PAID", transactionRef: `SEED-${biz.id.slice(0, 8)}-${ri}` },
        });
        await prisma.review.create({
          data: {
            bookingId: booking.id,
            businessId: biz.id,
            customerId: customer.id,
            rating: rv.rating,
            comment: rv.comment,
          },
        });
      }
    }

    // Add a couple of portfolio images (use category cover image as placeholder)
    await prisma.portfolioItem.create({ data: { businessId: biz.id, title: "Our work", imageUrl: `https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80`, displayOrder: 0 } });
    await prisma.portfolioItem.create({ data: { businessId: biz.id, title: "Happy clients", imageUrl: `https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80`, displayOrder: 1 } });

    bizCount++;
  }

  console.log(`   ✓ ${bizCount} businesses seeded`);
  console.log("");
  console.log("✅  Seed complete! Test accounts (password: password123)");
  console.log("    Admin:      admin@platform.test");
  console.log("    Customers:  customer1@platform.test … customer5@platform.test");
  console.log(`    Owners:     owner0@platform.test … owner${BUSINESSES.length - 1}@platform.test`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
