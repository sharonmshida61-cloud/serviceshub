const { CITIES, HUB_AREAS, BY_NAME } = require("../src/data/eastAfrica.js");

const CITY_CENTERS = Object.fromEntries(CITIES.map((c) => [c.city, [c.latitude, c.longitude]]));

const round6 = (n) => Math.round(n * 1e6) / 1e6;

function hash(str) {
  let h = 0;
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// Deterministic ±0.01° (about ±1.1 km) offset so neighbouring listings don't
// stack on one pin but still sit inside the city their search asked for.
function coordsFor(city, name) {
  const center = CITY_CENTERS[city];
  if (!center) return {};
  const h = hash(String(name));
  const jitter = (n) => ((n % 20000) - 10000) / 1e6;
  return {
    latitude: round6(center[0] + jitter(h)),
    longitude: round6(center[1] + jitter(h >>> 3)),
  };
}

// Where a demo listing lives. Derived from its name so re-running the seed and
// migrating existing rows agree without any ordering assumptions.
function locationFor(name) {
  const hubs = Object.keys(HUB_AREAS);
  const h = hash(String(name));
  const city = hubs[h % hubs.length];
  const areas = HUB_AREAS[city];
  const area = areas[(h >>> 5) % areas.length];
  const plot = 1 + ((h >>> 9) % 240);
  return { city, country: BY_NAME.get(city).country, address: `Plot ${plot}, ${area}` };
}

module.exports = { CITY_CENTERS, coordsFor, locationFor };
