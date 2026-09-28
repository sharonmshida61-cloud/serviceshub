// Real Unsplash photos keyed by category icon
export const CATEGORY_COVER = {
  scissors:    "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&q=80", // barber
  sparkles:    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80", // beauty
  car:         "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=600&q=80", // auto
  shirt:       "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80", // tailor
  "spray-can": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80", // cleaning
  wrench:      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80", // plumbing
  zap:         "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=600&q=80", // electric
  cog:         "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80", // repair
  camera:      "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600&q=80", // photography
  "book-open": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80", // tutoring
  dumbbell:    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80", // fitness
  calendar:    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80", // events
  hand:        "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80", // massage
  laptop:      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80", // tech
  hammer:      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80", // construction
};

const TAILOR_COVER = "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=80";
const FOOD_COVER = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80";

export const FALLBACK_COVER = "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80";

// Several seeded categories share an icon, so photos are pinned per slug first.
export const CATEGORY_COVER_BY_SLUG = {
  barbers: CATEGORY_COVER.scissors,
  "hair-salons": CATEGORY_COVER.sparkles,
  tailors: TAILOR_COVER,
  "car-washes": CATEGORY_COVER.car,
  transport: CATEGORY_COVER.car,
  mechanics: CATEGORY_COVER.wrench,
  tutors: CATEGORY_COVER["book-open"],
  electricians: CATEGORY_COVER.zap,
  "event-planners": CATEGORY_COVER.calendar,
  "fitness-trainers": CATEGORY_COVER.dumbbell,
  "food-drinks": FOOD_COVER,
  "massage-therapists": CATEGORY_COVER.hand,
  "cleaning-services": CATEGORY_COVER["spray-can"],
  laundry: CATEGORY_COVER.shirt,
  photographers: CATEGORY_COVER.camera,
  plumbers: CATEGORY_COVER.wrench,
  "home-repair": CATEGORY_COVER.cog,
  freelancers: CATEGORY_COVER.laptop,
};

export const coverForCategory = (c) =>
  CATEGORY_COVER_BY_SLUG[c?.slug] || CATEGORY_COVER[c?.icon] || FALLBACK_COVER;

export const coverOf = (business) => coverForCategory(business?.category);
