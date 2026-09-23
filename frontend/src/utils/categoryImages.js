const URL = (name) => `https://api.iconify.design/${name}.svg?color=%23fb8500&height=48`;

const ICON_BY_ICON = {
  scissors: "mdi:scissors",
  sparkles: "mdi:sparkles",
  car: "mdi:car",
  shirt: "mdi:tshirt-crew",
  "spray-can": "mdi:spray-bottle",
  wrench: "mdi:wrench",
  zap: "mdi:lightning-bolt",
  cog: "mdi:cog",
  camera: "mdi:camera",
  "book-open": "mdi:book-open",
  dumbbell: "mdi:dumbbell",
  calendar: "mdi:calendar",
  hand: "mdi:hand-open",
  laptop: "mdi:laptop",
  hammer: "mdi:hammer",
  leaf: "mdi:leaf",
  "graduation-cap": "mdi:graduation-cap",
  utensils: "mdi:food-variant",
  cross: "mdi:medical-bag",
  home: "mdi:home-variant",
};

// Several seeded categories share one icon (three use "scissors"), so the clearer
// glyph is pinned per slug to keep the category tiles distinguishable.
const ICON_BY_SLUG = {
  "hair-salons": "mdi:hair-dryer",
  tailors: "mdi:needle",
  "car-washes": "mdi:car-wash",
  plumbers: "mdi:pipe-wrench",
  "home-repair": "mdi:tools",
  laundry: "mdi:washing-machine",
  "cleaning-services": "mdi:spray-bottle",
};

export function getCategoryImage(category) {
  const name =
    ICON_BY_SLUG[category?.slug] || ICON_BY_ICON[category?.icon] || "mdi:sparkles";
  return URL(name);
}
