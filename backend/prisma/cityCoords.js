// The demo dataset uses invented city names, so they are anchored to real
// Dar es Salaam neighbourhoods — that way a pinned business lands somewhere a
// map and turn-by-turn directions can actually render.
const CITY_CENTERS = {
  Springfield: [-6.8, 39.2083],
  Lakeview: [-6.772, 39.214],
  Riverdale: [-6.824, 39.245],
  Westside: [-6.79, 39.16],
};

const round6 = (n) => Math.round(n * 1e6) / 1e6;

function hash(str) {
  let h = 0;
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// Deterministic ±400m offset so neighbouring listings don't stack on one pin.
function coordsFor(city, name) {
  const center = CITY_CENTERS[city];
  if (!center) return {};
  const h = hash(String(name));
  const jitter = (n) => ((n % 2000) - 1000) / 250000;
  return {
    latitude: round6(center[0] + jitter(h)),
    longitude: round6(center[1] + jitter(h >>> 3)),
  };
}

module.exports = { CITY_CENTERS, coordsFor };
