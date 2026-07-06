const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

// Each category ships with a small attributeSchema describing the extra
// fields relevant to it. The frontend renders these dynamically — this is
// the whole trick behind "easy to add new categories without code changes".
const CATEGORIES = [
  { name: "Barbers", slug: "barbers", icon: "scissors", schema: [
    { key: "chairCount", label: "Number of chairs", type: "number" },
    { key: "walkInsWelcome", label: "Walk-ins welcome", type: "boolean" },
  ]},
  { name: "Hair Salons", slug: "hair-salons", icon: "sparkles", schema: [
    { key: "specialties", label: "Specialties", type: "text" },
  ]},
  { name: "Car Washes", slug: "car-washes", icon: "car", schema: [
    { key: "vehicleSizes", label: "Vehicle sizes served", type: "text" },
    { key: "hasVacuum", label: "Vacuum included", type: "boolean" },
  ]},
  { name: "Laundry", slug: "laundry", icon: "shirt", schema: [
    { key: "pickupDelivery", label: "Pickup & delivery available", type: "boolean" },
    { key: "turnaroundHours", label: "Typical turnaround (hours)", type: "number" },
  ]},
  { name: "Cleaning Services", slug: "cleaning-services", icon: "spray-can", schema: [
    { key: "propertyTypes", label: "Property types serviced", type: "text" },
    { key: "suppliesIncluded", label: "Supplies included", type: "boolean" },
  ]},
  { name: "Plumbers", slug: "plumbers", icon: "wrench", schema: [
    { key: "licensed", label: "Licensed", type: "boolean" },
    { key: "emergencyService", label: "24/7 emergency service", type: "boolean" },
  ]},
  { name: "Electricians", slug: "electricians", icon: "zap", schema: [
    { key: "licensed", label: "Licensed", type: "boolean" },
    { key: "commercialWork", label: "Handles commercial jobs", type: "boolean" },
  ]},
  { name: "Mechanics", slug: "mechanics", icon: "cog", schema: [
    { key: "vehicleTypes", label: "Vehicle types serviced", type: "text" },
    { key: "mobileService", label: "Mobile / on-site service", type: "boolean" },
  ]},
  { name: "Photographers", slug: "photographers", icon: "camera", schema: [
    { key: "styles", label: "Photography styles", type: "text" },
    { key: "travelsForShoots", label: "Willing to travel", type: "boolean" },
  ]},
  { name: "Tutors", slug: "tutors", icon: "book-open", schema: [
    { key: "subjects", label: "Subjects taught", type: "text" },
    { key: "gradeLevel", label: "Grade level", type: "text" },
  ]},
  { name: "Tailors", slug: "tailors", icon: "scissors", schema: [
    { key: "garmentTypes", label: "Garment types", type: "text" },
    { key: "rushService", label: "Rush service available", type: "boolean" },
  ]},
  { name: "Fitness Trainers", slug: "fitness-trainers", icon: "dumbbell", schema: [
    { key: "specialties", label: "Training specialties", type: "text" },
    { key: "inHomeSessions", label: "In-home sessions", type: "boolean" },
  ]},
  { name: "Event Planners", slug: "event-planners", icon: "calendar", schema: [
    { key: "eventTypes", label: "Event types", type: "text" },
    { key: "maxGuestCapacity", label: "Max guests handled", type: "number" },
  ]},
  { name: "Massage Therapists", slug: "massage-therapists", icon: "hand", schema: [
    { key: "modalities", label: "Modalities offered", type: "text" },
    { key: "licensed", label: "Licensed", type: "boolean" },
  ]},
  { name: "Freelancers", slug: "freelancers", icon: "laptop", schema: [
    { key: "skillTags", label: "Skills", type: "text" },
    { key: "remoteOnly", label: "Remote only", type: "boolean" },
  ]},
  { name: "Home Repair Services", slug: "home-repair", icon: "hammer", schema: [
    { key: "specialties", label: "Repair specialties", type: "text" },
    { key: "licensed", label: "Licensed & insured", type: "boolean" },
  ]},
];

async function main() {
  console.log("Seeding categories...");
  const categoryRecords = {};
  for (const c of CATEGORIES) {
    const rec = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        attributeSchema: JSON.stringify(c.schema),
      },
    });
    categoryRecords[c.slug] = rec;
  }

  console.log("Seeding users...");
  const pw = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@platform.test" },
    update: {},
    create: { name: "Platform Admin", email: "admin@platform.test", passwordHash: pw, role: "ADMIN" },
  });

  const owner1 = await prisma.user.upsert({
    where: { email: "owner.barber@platform.test" },
    update: {},
    create: { name: "Marcus Reid", email: "owner.barber@platform.test", passwordHash: pw, role: "BUSINESS_OWNER" },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: "owner.cleaning@platform.test" },
    update: {},
    create: { name: "Amara Cleaning Co.", email: "owner.cleaning@platform.test", passwordHash: pw, role: "BUSINESS_OWNER" },
  });

  const employee1 = await prisma.user.upsert({
    where: { email: "employee1@platform.test" },
    update: {},
    create: { name: "Jordan Lee", email: "employee1@platform.test", passwordHash: pw, role: "EMPLOYEE" },
  });

  const customer1 = await prisma.user.upsert({
    where: { email: "customer1@platform.test" },
    update: {},
    create: { name: "Taylor Nguyen", email: "customer1@platform.test", passwordHash: pw, role: "CUSTOMER" },
  });

  console.log("Seeding sample businesses...");
  const barbershop = await prisma.business.create({
    data: {
      name: "Fresh Fade Barbershop",
      description: "Classic cuts and modern fades in the heart of downtown.",
      categoryId: categoryRecords["barbers"].id,
      ownerId: owner1.id,
      address: "12 Market St",
      city: "Springfield",
      phone: "555-0101",
      email: "hello@freshfade.test",
      status: "APPROVED",
      attributes: JSON.stringify({ chairCount: 4, walkInsWelcome: true }),
    },
  });

  await prisma.businessEmployee.create({
    data: { businessId: barbershop.id, userId: employee1.id, title: "Senior Barber" },
  });

  const cleaningCo = await prisma.business.create({
    data: {
      name: "Amara Home Cleaning",
      description: "Detail-oriented residential and office cleaning.",
      categoryId: categoryRecords["cleaning-services"].id,
      ownerId: owner2.id,
      address: "88 Oak Ave",
      city: "Springfield",
      phone: "555-0202",
      email: "hello@amaraclean.test",
      status: "APPROVED",
      attributes: JSON.stringify({ propertyTypes: "Apartments, Houses, Offices", suppliesIncluded: true }),
    },
  });

  const pendingPlumber = await prisma.business.create({
    data: {
      name: "QuickFix Plumbing",
      description: "New listing awaiting admin approval.",
      categoryId: categoryRecords["plumbers"].id,
      ownerId: owner1.id,
      city: "Springfield",
      status: "PENDING",
      attributes: JSON.stringify({ licensed: true, emergencyService: false }),
    },
  });

  console.log("Seeding services...");
  const fadeService = await prisma.service.create({
    data: {
      businessId: barbershop.id,
      categoryId: categoryRecords["barbers"].id,
      name: "Signature Fade",
      description: "Precision fade with line-up.",
      priceCents: 3500,
      durationMinutes: 45,
    },
  });

  await prisma.service.create({
    data: {
      businessId: barbershop.id,
      categoryId: categoryRecords["barbers"].id,
      name: "Beard Trim",
      priceCents: 1500,
      durationMinutes: 20,
    },
  });

  await prisma.service.create({
    data: {
      businessId: cleaningCo.id,
      categoryId: categoryRecords["cleaning-services"].id,
      name: "2-Bedroom Deep Clean",
      priceCents: 9000,
      durationMinutes: 150,
    },
  });

  console.log("Seeding a sample completed booking + review...");
  const pastBooking = await prisma.booking.create({
    data: {
      customerId: customer1.id,
      businessId: barbershop.id,
      serviceId: fadeService.id,
      scheduledAt: new Date(Date.now() - 7 * 24 * 3600 * 1000),
      status: "COMPLETED",
      priceCents: fadeService.priceCents,
    },
  });

  await prisma.payment.create({
    data: { bookingId: pastBooking.id, amountCents: fadeService.priceCents, status: "PAID", transactionRef: "SEED-TXN-1" },
  });

  await prisma.review.create({
    data: {
      bookingId: pastBooking.id,
      businessId: barbershop.id,
      customerId: customer1.id,
      rating: 5,
      comment: "Best fade I've had in years, will be back!",
    },
  });

  await prisma.business.update({
    where: { id: barbershop.id },
    data: { avgRating: 5, reviewCount: 1 },
  });

  console.log("Done. Seed accounts (all use password: password123):");
  console.log("  Admin:          admin@platform.test");
  console.log("  Business Owner: owner.barber@platform.test  (Fresh Fade Barbershop)");
  console.log("  Business Owner: owner.cleaning@platform.test (Amara Home Cleaning)");
  console.log("  Employee:       employee1@platform.test (staff at Fresh Fade)");
  console.log("  Customer:       customer1@platform.test");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
