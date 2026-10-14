// "I'm in" asks for a country, because the region list below it is narrowed to
// whichever country is picked here.
export default function CountrySelect({ id, countries, value, onChange, placeholder }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {countries.map((c) => (
        <option key={c.country} value={c.country}>
          {c.count ? `${c.country} (${c.count})` : c.country}
        </option>
      ))}
    </select>
  );
}
