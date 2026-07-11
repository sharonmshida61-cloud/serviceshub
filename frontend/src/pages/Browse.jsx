import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import { StarDisplay } from "../components/StarRating.jsx";
import { getCategoryImage } from "../utils/categoryImages.js";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

// Real Unsplash photos keyed by category icon
const CATEGORY_COVER = {
  scissors:    "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&q=80",
  sparkles:    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80",
  car:         "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=600&q=80",
  shirt:       "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80",
  "spray-can": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  wrench:      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80",
  zap:         "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=600&q=80",
  cog:         "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80",
  camera:      "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600&q=80",
  "book-open": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80",
  dumbbell:    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80",
  calendar:    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80",
  hand:        "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80",
  laptop:      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80",
  hammer:      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80",
};
const FALLBACK_COVER = "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80";
const getBusinessCover = (b) => CATEGORY_COVER[b.category?.icon] || FALLBACK_COVER;

export default function Browse() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const SORT_LABELS = {
    rating: t("browse.sort.topRated"),
    price:  t("browse.sort.lowestPrice"),
    newest: t("browse.sort.newest"),
  };
  const [categories, setCategories] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  // "committed" filters — what's actually sent to the API
  const [filters, setFilters] = useState({ category: "", q: "", city: "", sort: "rating" });
  // "draft" inputs — what the user is typing before they hit Search
  const [draft, setDraft] = useState({ q: "", city: "" });

  const [compareIds, setCompareIds] = useState([]);
  const debounceRef = useRef(null);

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

  // Debounced auto-search as the user types (400 ms delay)
  const scheduleSearch = useCallback((newDraft) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, q: newDraft.q.trim(), city: newDraft.city.trim() }));
    }, 400);
  }, []);

  function handleDraftChange(field, value) {
    const newDraft = { ...draft, [field]: value };
    setDraft(newDraft);
    scheduleSearch(newDraft);
  }

  // Immediate search on button click or Enter
  function commitSearch(e) {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    setFilters((f) => ({ ...f, q: draft.q.trim(), city: draft.city.trim() }));
  }

  function clearInput(field) {
    const newDraft = { ...draft, [field]: "" };
    setDraft(newDraft);
    clearTimeout(debounceRef.current);
    setFilters((f) => ({ ...f, [field]: "" }));
  }

  function handleSortChange(value) {
    setFilters((f) => ({ ...f, sort: value }));
  }

  function clearAllFilters() {
    clearTimeout(debounceRef.current);
    setDraft({ q: "", city: "" });
    setFilters({ category: "", q: "", city: "", sort: "rating" });
  }

  const compareList = useMemo(
    () => businesses.filter((b) => compareIds.includes(b.id)),
    [businesses, compareIds]
  );

  function toggleCompare(id) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  const hasActiveFilters = filters.q || filters.city || filters.category || filters.sort !== "rating";

  return (
    <div className="container page">
      {/* ── Page header + search ── */}
      <div className="browse-header">
        <div>
          <div className="section-eyebrow">{t("browse.allProviders")}</div>
          <h1 style={{ marginBottom: 4 }}>{t("browse.title")}</h1>
          <p style={{ marginBottom: 0 }}>{t("browse.subtitle")}</p>
        </div>

        <form className="browse-search-bar" onSubmit={commitSearch}>
          {/* Name search */}
          <div className="search-input-wrap">
            <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              placeholder={t("browse.search.placeholder")}
              value={draft.q}
              onChange={(e) => handleDraftChange("q", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitSearch(e)}
              aria-label={t("browse.search.placeholder")}
            />
            {draft.q && (
              <button type="button" className="input-clear-btn" onClick={() => clearInput("q")} aria-label={t("common.remove")}>×</button>
            )}
          </div>

          {/* City filter */}
          <div className="search-input-wrap">
            <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <input
              placeholder={t("browse.search.city")}
              value={draft.city}
              onChange={(e) => handleDraftChange("city", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitSearch(e)}
              aria-label={t("browse.search.city")}
            />
            {draft.city && (
              <button type="button" className="input-clear-btn" onClick={() => clearInput("city")} aria-label={t("common.remove")}>×</button>
            )}
          </div>

          {/* Sort */}
          <div className="search-input-wrap search-select-wrap">
            <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            <select value={filters.sort} onChange={(e) => handleSortChange(e.target.value)}
              aria-label={t("common.sort")} className={filters.sort !== "rating" ? "select-active" : ""}>
              <option value="rating">{t("browse.sort.topRated")}</option>
              <option value="price">{t("browse.sort.lowestPrice")}</option>
              <option value="newest">{t("browse.sort.newest")}</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary search-submit-btn" aria-label={t("browse.search.button")}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            {t("browse.search.button")}
          </button>
        </form>
      </div>

      {/* ── Active filter badges ── */}
      {hasActiveFilters && (
        <div className="active-filters-row">
          <span className="active-filters-label">{t("browse.filters.active")}</span>
          {filters.q && (
            <span className="filter-badge">
              "{filters.q}"
              <button onClick={() => clearInput("q")} aria-label={t("browse.filters.remove")}>×</button>
            </span>
          )}
          {filters.city && (
            <span className="filter-badge">
              📍 {filters.city}
              <button onClick={() => clearInput("city")} aria-label={t("browse.filters.remove")}>×</button>
            </span>
          )}
          {filters.category && (
            <span className="filter-badge">
              {categories.find((c) => c.slug === filters.category)?.name}
              <button onClick={() => setFilters((f) => ({ ...f, category: "" }))} aria-label={t("browse.filters.remove")}>×</button>
            </span>
          )}
          {filters.sort !== "rating" && (
            <span className="filter-badge">
              {t("browse.filters.sort")} {SORT_LABELS[filters.sort]}
              <button onClick={() => setFilters((f) => ({ ...f, sort: "rating" }))} aria-label={t("browse.filters.remove")}>×</button>
            </span>
          )}
          <button className="clear-all-btn" onClick={clearAllFilters}>{t("browse.filters.clear")}</button>
        </div>
      )}

      {/* ── Category picker ── */}
      <div className="category-grid" style={{ marginBottom: 40 }}>
        <button
          className={`category-chip ${filters.category === "" ? "active" : ""}`}
          onClick={() => setFilters((f) => ({ ...f, category: "" }))}
        >
          <img src="https://api.iconify.design/mdi:folder.svg?color=%23fb8500&height=48" alt={t("browse.allCategories")} />
          {t("browse.allCategories")}
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

      {/* ── Results header ── */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>
          {filters.category
            ? categories.find((c) => c.slug === filters.category)?.name
            : t("browse.allProviders")}
        </h2>
        <span style={{ color: "var(--ink-2)", fontSize: "0.85rem" }}>
          {compareIds.length > 0 && `${t("browse.comparing")} ${compareIds.length}/3 — `}
          {businesses.length} {businesses.length !== 1 ? t("browse.results") : t("browse.result")}
        </span>
      </div>

      {/* ── Skeleton loader ── */}
      {loading && (
        <div className="providers-loading">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div className="biz-card-skeleton" key={n} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && businesses.length === 0 && (
        <div className="empty-state card">
          <h3>{t("browse.noResults")}</h3>
          <p>{t("browse.noResults.desc")}</p>
          <button className="btn btn-outline btn-sm" onClick={clearAllFilters}>
            {t("browse.clearFilters")}
          </button>
        </div>
      )}

      {/* ── Business cards ── */}
      <div className="grid grid-3">
        {!loading &&
          businesses.map((b) => (
            <div className="card biz-card" key={b.id}>
              <div className="biz-card-cover">
                <img src={getBusinessCover(b)} alt={b.name} loading="lazy" />
                <div className="biz-card-cover-overlay" />
                <label className="biz-compare-toggle">
                  <input type="checkbox" checked={compareIds.includes(b.id)} onChange={() => toggleCompare(b.id)} />
                  {t("browse.compare")}
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
                {b.description && <p className="biz-card-desc">{b.description}</p>}
                <div className="attr-list">
                  {b.city && <span className="attr-chip">📍 {b.city}</span>}
                  {b.services?.length > 0 && (
                    <span className="attr-chip">
                      {t("common.from")} {formatMoney(Math.min(...b.services.map((s) => s.priceCents)))}
                    </span>
                  )}
                </div>
                {user ? (
                  <Link to={`/business/${b.id}`}>
                    <button className="btn btn-primary btn-block" style={{ marginTop: 8 }}>
                      {t("browse.viewBook")}
                    </button>
                  </Link>
                ) : (
                  <Link to="/login">
                    <button className="btn btn-outline btn-block" style={{ marginTop: 8 }}>
                      {t("browse.loginToBook")}
                    </button>
                  </Link>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* ── Compare table ── */}
      {compareList.length > 1 && (
        <div style={{ marginTop: 48 }}>
          <div className="section-eyebrow">Side by side</div>
          <h2 className="section-title">{t("browse.compareProviders")}</h2>
          <div className="card" style={{ overflowX: "auto", padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("browse.allProviders").replace("All ", "")}</th>
                  <th>{t("browse.category")}</th>
                  <th>{t("browse.rating")}</th>
                  <th>{t("browse.startingPrice")}</th>
                  <th>{t("browse.city")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {compareList.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.name}</strong></td>
                    <td>{b.category?.name}</td>
                    <td>{b.avgRating ? b.avgRating.toFixed(1) : t("common.new")} ({b.reviewCount})</td>
                    <td>
                      {b.services?.length
                        ? formatMoney(Math.min(...b.services.map((s) => s.priceCents)))
                        : "—"}
                    </td>
                    <td>{b.city || "—"}</td>
                    <td>
                      {user ? (
                        <Link to={`/business/${b.id}`}>
                          <button className="btn btn-primary btn-sm">{t("browse.book")}</button>
                        </Link>
                      ) : (
                        <Link to="/login">
                          <button className="btn btn-outline btn-sm">{t("browse.login")}</button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
