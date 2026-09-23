// Coordinates arrive from a browser geolocation fix or a hand-typed value, so
// they can be strings, out of range, or absent. Returns { latitude, longitude }
// for a usable pair, {} when no coordinates were sent, or throws with a
// message the route can surface to the client.
function readCoords(input) {
  if (!input) return {};
  const { latitude, longitude } = input;
  if (latitude === undefined || latitude === null || latitude === "" ||
      longitude === undefined || longitude === null || longitude === "") {
    return {};
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("Coordinates must be numbers");
  if (lat < -90 || lat > 90) throw new Error("Latitude must be between -90 and 90");
  if (lng < -180 || lng > 180) throw new Error("Longitude must be between -180 and 180");
  return { latitude: lat, longitude: lng };
}

module.exports = { readCoords };
