import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import { StarDisplay } from "../components/StarRating.jsx";
import SmartMatch from "../components/SmartMatch.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { getCategoryImage } from "../utils/categoryImages.js";

// Real Unsplash photos keyed by category slug / icon
const CATEGORY_COVER = {
  scissors:    "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&q=80", // barber
  sparkles:    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80", // beauty
  car:         "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=600&q=80", // auto
  shirt:       "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80", // tailor
  "spray-can": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80", // cleaning
  wrench:      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80", // plumbing
  zap:         "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=600&q=80", // electric
  cog:         "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80", // repair
  camera:      "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600&q=80", // photography
  "book-open": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80", // tutoring
  dumbbell:    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80", // fitness
  calendar:    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80", // events
  hand:        "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80", // massage
  laptop:      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80", // tech
  hammer:      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80", // construction
};

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80";

function getBusinessCover(business) {
  const icon = business.category?.icon;
  return CATEGORY_COVER[icon] || FALLBACK_COVER;
}

export default function Home() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: "", q: "", city: "", sort: "rating" });
  const [compareIds, setCompareIds] = useState([]);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .searchBusinesses(filters)
      .then(setBusinesses)
      .catch(() => setBusinesses([]))
      .finally(() => setLoading(false));
  }, [filters]);

  // Trending = top 4 by rating then review count, only show when no filters active
  const trendingBusinesses = useMemo(() => {
    if (filters.q || filters.city || filters.category) return [];
    return [...businesses]
      .filter((b) => b.reviewCount > 0)
      .sort((a, b) => {
        if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
        return b.reviewCount - a.reviewCount;
      })
      .slice(0, 4);
  }, [businesses, filters]);

  const heroTitleParts = t("home.hero.title").split("\n");

  const compareList = useMemo(
    () => businesses.filter((b) => compareIds.includes(b.id)),
    [businesses, compareIds]
  );

  function toggleCompare(id) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  return (
    <div>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="container hero-content">
          <div className="hero-badge">{t("home.hero.badge")}</div>
          <h1>
            {heroTitleParts[0]}<br />
            <span className="hero-highlight">{heroTitleParts[1] || heroTitleParts[0]}</span>
          </h1>
          <p>{t("home.hero.subtitle")}</p>
          <form className="search-bar" onSubmit={(e) => e.preventDefault()}>
            <div className="search-input-wrap">
              <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                placeholder={t("home.hero.searchName")}
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              />
            </div>
            <div className="search-input-wrap">
              <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <input
                placeholder={t("home.hero.searchCity")}
                value={filters.city}
                onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <select
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
            >
              <option value="rating">{t("browse.sort.topRated")}</option>
              <option value="price">{t("browse.sort.lowestPrice")}</option>
              <option value="newest">{t("browse.sort.newest")}</option>
            </select>
          </form>

          {/* How it works — compact pills */}
          <div className="hero-steps">
            {[t("journey.discover"), t("journey.compare"), t("journey.book"), t("journey.pay"), t("journey.review")].map((s, i) => (
              <div className="hero-step" key={s}>
                <span className="hero-step-num">{i + 1}</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container page">
        <SmartMatch />

        {/* ── Trending ── */}
        {trendingBusinesses.length > 0 && (
          <section className="trending-section">
            <div className="section-header">
              <div>
                <div className="section-eyebrow">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                    fill="var(--amber)" stroke="none">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  {t("home.trending.eyebrow")}
                </div>
                <h2 className="section-title">{t("home.trending.title")}</h2>
              </div>
              <button
                className="btn btn-outline btn-sm see-all-btn"
                onClick={() => setFilters((f) => ({ ...f, sort: "rating" }))}
              >
                {t("home.trending.seeAll")}
              </button>
            </div>

            <div className="trending-grid">
              {trendingBusinesses.map((b, idx) => (
                <Link to={`/business/${b.id}`} key={b.id} className="trending-card">
                  <div className="trending-card-img">
                    <img src={getBusinessCover(b)} alt={b.name} loading="lazy" />
                    <div className="trending-rank">#{idx + 1}</div>
                    {b.category?.name && (
                      <div className="trending-category-pill">{b.category.name}</div>
                    )}
                  </div>
                  <div className="trending-card-body">
                    <h3 className="trending-card-name">{b.name}</h3>
                    <div className="trending-card-meta">
                      <StarDisplay rating={b.avgRating} count={b.reviewCount} />
                    </div>
                    <div className="trending-card-footer">
                      {b.city && (
                        <span className="trending-location">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          {b.city}
                        </span>
                      )}
                      {b.services?.length > 0 && (
                        <span className="trending-price">
                          from {formatMoney(Math.min(...b.services.map((s) => s.priceCents)))}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Categories ── */}
        <section style={{ marginTop: 56 }}>
          <div className="section-header">
            <div>
              <div className="section-eyebrow">{t("home.categories.eyebrow")}</div>
              <h2 className="section-title">{t("home.categories.subtitle")}</h2>
            </div>
          </div>
          <div className="category-grid" style={{ marginBottom: 40 }}>
            <button
              className={`category-chip ${filters.category === "" ? "active" : ""}`}
              onClick={() => setFilters((f) => ({ ...f, category: "" }))}
            >
              <img
                src="https://api.iconify.design/mdi:folder.svg?color=%23fb8500&height=48"
                alt="All"
              />
              {t("home.categories.all")}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                className={`category-chip ${filters.category === c.slug ? "active" : ""}`}
                onClick={() =>
                  setFilters((f) => ({ ...f, category: f.category === c.slug ? "" : c.slug }))
                }
              >
                <img src={getCategoryImage(c.icon)} alt={c.name} />
                {c.name}
              </button>
            ))}
          </div>
        </section>

        {/* ── All providers ── */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 24,
            }}
          >
            <div>
              <div className="section-eyebrow">{t("home.providers.eyebrow")}</div>
              <h2 className="section-title" style={{ marginBottom: 0 }}>
                {filters.category
                  ? categories.find((c) => c.slug === filters.category)?.name
                  : t("home.providers.allProviders")}
              </h2>
            </div>
            <span style={{ color: "var(--ink-2)", fontSize: "0.85rem" }}>
              {compareIds.length > 0 && `${t("home.providers.comparing")} ${compareIds.length}/3 — `}
              {businesses.length} {businesses.length !== 1 ? t("home.providers.results") : t("home.providers.result")}
            </span>
          </div>

          {loading && (
            <div className="providers-loading">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div className="biz-card-skeleton" key={n} />
              ))}
            </div>
          )}

          {!loading && businesses.length === 0 && (
            <div className="empty-state card">
              <h3>{t("home.providers.noMatch")}</h3>
              <p>{t("home.providers.noMatch.desc")}</p>
            </div>
          )}

          <div className="grid grid-3">
            {!loading &&
              businesses.map((b) => (
                <div className="card biz-card" key={b.id}>
                  {/* Cover image */}
                  <div className="biz-card-cover">
                    <img src={getBusinessCover(b)} alt={b.name} loading="lazy" />
                    <div className="biz-card-cover-overlay" />
                    <label className="biz-compare-toggle">
                      <input
                        type="checkbox"
                        checked={compareIds.includes(b.id)}
                        onChange={() => toggleCompare(b.id)}
                      />
                      {t("home.providers.compare")}
                    </label>
                    {b.category?.name && (
                      <span className="biz-category-badge">{b.category.name}</span>
                    )}
                  </div>

                  <div className="biz-card-body">
                    <h3 className="biz-card-name">
                      <Link to={`/business/${b.id}`}>{b.name}</Link>
                    </h3>
                    <StarDisplay rating={b.avgRating} count={b.reviewCount} />
                    {b.description && (
                      <p className="biz-card-desc">{b.description}</p>
                    )}
                    <div className="attr-list">
                      {b.city && <span className="attr-chip">📍 {b.city}</span>}
                      {b.services?.length > 0 && (
                        <span className="attr-chip">
                          from {formatMoney(Math.min(...b.services.map((s) => s.priceCents)))}
                        </span>
                      )}
                    </div>
                    <Link to={`/business/${b.id}`}>
                      <button className="btn btn-primary btn-block" style={{ marginTop: 8 }}>
                        {t("home.providers.viewBook")}
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* ── Compare table ── */}
        {compareList.length > 1 && (
          <div style={{ marginTop: 56 }}>
            <div className="section-eyebrow">{t("home.compare.eyebrow")}</div>
            <h2 className="section-title">{t("home.compare.title")}</h2>
            <div className="card" style={{ overflowX: "auto", padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("home.compare.provider")}</th>
                    <th>{t("home.compare.category")}</th>
                    <th>{t("home.compare.rating")}</th>
                    <th>{t("home.compare.startingPrice")}</th>
                    <th>{t("home.compare.city")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {compareList.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <strong>{b.name}</strong>
                      </td>
                      <td>{b.category?.name}</td>
                      <td>
                        {b.avgRating ? b.avgRating.toFixed(1) : "New"} ({b.reviewCount})
                      </td>
                      <td>
                        {b.services?.length
                          ? formatMoney(Math.min(...b.services.map((s) => s.priceCents)))
                          : "—"}
                      </td>
                      <td>{b.city || "—"}</td>
                      <td>
                        <Link to={`/business/${b.id}`}>
                          <button className="btn btn-primary btn-sm">{t("home.compare.book")}</button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
