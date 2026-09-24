import { useEffect } from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "../api";
import { StarDisplay } from "./StarRating.jsx";
import LocationMap from "./LocationMap.jsx";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext.jsx";
import { describeAttributes, getBusinessCover } from "../utils/businessCovers.js";

// Summary of a listing, opened over the Browse page so searching never loses
// its place. Booking and chat stay on the full /business/:id page.
export default function BusinessQuickView({ business, onClose }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const attributes = describeAttributes(business.attributes);
  const services = [...(business.services || [])].sort((a, b) => a.priceCents - b.priceCents);

  return (
    <div className="qv-backdrop" onClick={onClose} role="presentation">
      <div
        className="qv-modal"
        role="dialog"
        aria-modal="true"
        aria-label={business.name}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="qv-cover">
          <img src={getBusinessCover(business)} alt={business.name} />
          {business.category?.name && <span className="biz-category-badge">{business.category.name}</span>}
          <button type="button" className="qv-close" onClick={onClose} aria-label={t("browse.quickView.close")}>
            ×
          </button>
        </div>

        <div className="qv-body">
          <h2 className="qv-name">{business.name}</h2>
          <StarDisplay rating={business.avgRating} count={business.reviewCount} />
          {business.description && <p className="qv-desc">{business.description}</p>}

          <div className="attr-list">
            {business.city && <span className="attr-chip">📍 {business.city}</span>}
            {business.address && <span className="attr-chip">{business.address}</span>}
            {services.length > 0 && (
              <span className="attr-chip">
                {t("common.from")} {formatMoney(services[0].priceCents)}
              </span>
            )}
          </div>

          {attributes.length > 0 && (
            <dl className="qv-attrs">
              {attributes.map((attr) => (
                <div key={attr.label}>
                  <dt>{attr.label}</dt>
                  <dd>{attr.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {services.length > 0 && (
            <div className="qv-services">
              <h3>{t("business.services")}</h3>
              <ul>
                {services.map((s) => (
                  <li key={s.id}>
                    <span>{s.name}</span>
                    <em>
                      {formatMoney(s.priceCents)}
                      {s.durationMinutes ? ` · ${s.durationMinutes} min` : ""}
                    </em>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <LocationMap
            latitude={business.latitude}
            longitude={business.longitude}
            name={business.name}
            height={180}
          />
        </div>

        <div className="qv-foot">
          <Link to={`/business/${business.id}`} className="btn btn-outline">
            {t("browse.quickView.openFull")}
          </Link>
          {user ? (
            <Link to={`/business/${business.id}`} className="btn btn-primary">
              {t("browse.book")}
            </Link>
          ) : (
            <Link to="/login" className="btn btn-primary">
              {t("browse.loginToBook")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
