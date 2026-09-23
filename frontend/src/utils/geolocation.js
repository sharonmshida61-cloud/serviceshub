// Six decimals is ~11cm — plenty for a doorway, and keeps stored values tidy.
const round = (n) => Math.round(n * 1e6) / 1e6;

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("This browser can't share a location"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: round(pos.coords.latitude), longitude: round(pos.coords.longitude) }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Location permission was blocked — allow it in your browser, then try again"));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error("No location fix available right now — move somewhere with a clearer signal"));
        } else {
          reject(new Error("Taking a location took too long — try again, or type the coordinates"));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export const hasCoords = (v) => !!(v && Number.isFinite(v.latitude) && Number.isFinite(v.longitude));

export function directionsUrl({ latitude, longitude }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

// With a key we use the official Embed API; without one the plain embed still
// works, so the map is never blank just because billing isn't set up yet.
export function embedUrl({ latitude, longitude }, zoom = 16) {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return key
    ? `https://www.google.com/maps/embed/v1/place?key=${key}&q=${latitude},${longitude}&zoom=${zoom}`
    : `https://maps.google.com/maps?q=${latitude},${longitude}&z=${zoom}&output=embed`;
}
