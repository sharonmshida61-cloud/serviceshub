import { useState } from "react";
import LocationMap from "./LocationMap.jsx";
import { getCurrentPosition, hasCoords } from "../utils/geolocation.js";

// Six decimals in the inputs; the browser hands back far more and it reads as noise.
const toInput = (n) => (Number.isFinite(n) ? String(n) : "");

export default function LocationPicker({ value, onChange, name }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pinned = hasCoords(value);

  async function useMyLocation() {
    setBusy(true);
    setError("");
    try {
      onChange({ ...value, ...await getCurrentPosition() });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function setField(key, raw) {
    const next = { ...value, [key]: raw === "" ? undefined : Number(raw) };
    onChange(next);
  }

  return (
    <div className="loc-picker">
      <div className="loc-picker-actions">
        <button type="button" className="btn btn-outline" onClick={useMyLocation} disabled={busy}>
          {busy ? "Locating…" : pinned ? "📍 Re-pin at my current location" : "📍 Use my current location"}
        </button>
        <span className="hint">
          {pinned
            ? `${value.latitude}, ${value.longitude}`
            : "Stand at the entrance of your premises, then tap the button"}
        </span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-2 loc-picker-fields">
        <label>
          Latitude
          <input
            type="number"
            step="any"
            min="-90"
            max="90"
            value={toInput(value?.latitude)}
            onChange={(e) => setField("latitude", e.target.value)}
            placeholder="e.g. -6.7924"
          />
        </label>
        <label>
          Longitude
          <input
            type="number"
            step="any"
            min="-180"
            max="180"
            value={toInput(value?.longitude)}
            onChange={(e) => setField("longitude", e.target.value)}
            placeholder="e.g. 39.2083"
          />
        </label>
      </div>

      {pinned ? (
        <LocationMap latitude={value.latitude} longitude={value.longitude} name={name} height={200} showDirections={false} />
      ) : (
        <p className="hint loc-picker-empty">
          No pin yet. Customers will only see your address text until you drop one.
        </p>
      )}
    </div>
  );
}
