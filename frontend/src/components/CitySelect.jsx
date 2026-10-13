import { useLanguage } from "../context/LanguageContext";

// The launch region covers every East African country, so a flat city list
// would be unreadable — options are grouped under their country instead.
export default function CitySelect({
  id,
  cities,
  value,
  onChange,
  placeholder,
  placeholderValue = "",
  showCounts = true,
}) {
  const { t } = useLanguage();

  // A listing can already sit somewhere outside the catalogue, and a linked-in
  // city may have no approved listings yet — either still has to be selectable.
  const available =
    value && !cities.some((c) => c.city === value)
      ? [...cities, { city: value, country: null, count: 0 }]
      : cities;

  const groups = new Map();
  for (const c of available) {
    const country = c.country || "";
    groups.set(country, [...(groups.get(country) || []), c]);
  }

  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value={placeholderValue}>{placeholder}</option>
      {[...groups].map(([country, list]) => (
        <optgroup key={country || "other"} label={country || t("cities.otherCountries")}>
          {list.map((c) => (
            <option key={c.city} value={c.city}>
              {showCounts && c.count ? `${c.city} (${c.count})` : c.city}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
