import { useLanguage } from "../context/LanguageContext.jsx";
import { directionsUrl, embedUrl, hasCoords } from "../utils/geolocation.js";

export default function LocationMap({ latitude, longitude, name, height = 220, showDirections = true }) {
  const { t } = useLanguage();
  if (!hasCoords({ latitude, longitude })) return null;
  const coords = { latitude, longitude };

  return (
    <div className="loc-map">
      <iframe
        title={name ? `Map showing ${name}` : "Map showing location"}
        src={embedUrl(coords)}
        style={{ height }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {showDirections && (
        <a className="btn btn-primary loc-map-cta" href={directionsUrl(coords)} target="_blank" rel="noreferrer">
          {t("business.getDirections")}
        </a>
      )}
    </div>
  );
}
