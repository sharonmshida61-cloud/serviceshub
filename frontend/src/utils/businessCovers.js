// Real Unsplash photos keyed by category icon
const CATEGORY_COVER = {
  scissors:    "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&q=80",
  sparkles:    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80",
  car:         "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=600&q=80",
  shirt:       "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80",
  "spray-can": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  wrench:      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80",
  zap:         "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=600&q=80",
  cog:         "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80",
  camera:      "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600&q=80",
  "book-open": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80",
  dumbbell:    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80",
  calendar:    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80",
  hand:        "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80",
  laptop:      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80",
  hammer:      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80",
};

const FALLBACK_COVER = "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80";

export const getBusinessCover = (business) =>
  CATEGORY_COVER[business?.category?.icon] || FALLBACK_COVER;

// Seed data stores a free-form object per business, so attribute keys differ by
// category ("styles", "vehicleSizes", "licensed"). Render them generically.
export function describeAttributes(attributes, limit = 6) {
  return Object.entries(attributes || {})
    .filter(([, value]) => value !== null && value !== "" && value !== false)
    .slice(0, limit)
    .map(([key, value]) => ({
      label: key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim(),
      value: value === true ? "✓" : String(value),
    }));
}
