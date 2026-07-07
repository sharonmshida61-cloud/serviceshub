/**
 * Category image mapping
 * Maps category slugs to SVG/image URLs for modern iconography
 */

export const CATEGORY_IMAGES = {
  scissors: "https://api.iconify.design/mdi:scissors.svg?color=%23fb8500&height=48",
  sparkles: "https://api.iconify.design/mdi:sparkles.svg?color=%23fb8500&height=48",
  car: "https://api.iconify.design/mdi:car.svg?color=%23fb8500&height=48",
  shirt: "https://api.iconify.design/mdi:shirt.svg?color=%23fb8500&height=48",
  "spray-can": "https://api.iconify.design/mdi:spray-bottle.svg?color=%23fb8500&height=48",
  wrench: "https://api.iconify.design/mdi:wrench.svg?color=%23fb8500&height=48",
  zap: "https://api.iconify.design/mdi:lightning-bolt.svg?color=%23fb8500&height=48",
  cog: "https://api.iconify.design/mdi:cog.svg?color=%23fb8500&height=48",
  camera: "https://api.iconify.design/mdi:camera.svg?color=%23fb8500&height=48",
  "book-open": "https://api.iconify.design/mdi:book-open.svg?color=%23fb8500&height=48",
  dumbbell: "https://api.iconify.design/mdi:dumbbell.svg?color=%23fb8500&height=48",
  calendar: "https://api.iconify.design/mdi:calendar.svg?color=%23fb8500&height=48",
  hand: "https://api.iconify.design/mdi:hand-open.svg?color=%23fb8500&height=48",
  laptop: "https://api.iconify.design/mdi:laptop.svg?color=%23fb8500&height=48",
  hammer: "https://api.iconify.design/mdi:hammer.svg?color=%23fb8500&height=48",
};

export const getCategoryImage = (icon) => {
  return CATEGORY_IMAGES[icon] || CATEGORY_IMAGES.sparkles;
};
