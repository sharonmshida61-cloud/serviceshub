import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import { StarDisplay } from "../components/StarRating.jsx";
import BusinessQuickView from "../components/BusinessQuickView.jsx";
import { getCategoryImage } from "../utils/categoryImages.js";
import { getBusinessCover } from "../utils/businessCovers.js";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const MY_AREA_KEY = "serviceshub.myArea";

export function BrowsePanel({ embed = false, initialCategory = "", initialQuery = "" }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const SORT_LABELS = {
    rating: t("browse.sort.topRated"),
    price:  t("browse.sort.lowestPrice"),
    newest: t("browse.sort.newest"),
  };
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  const initialParams = new URLSearchParams(window.location.search);
  const savedArea = localStorage.getItem(MY_AREA_KEY) || "";
  // Where the customer is — remembered between visits
  const [myArea, setMyArea] = useState(savedArea);
  // "committed" filters — what's actually sent to the API
  const [filters, setFilters] = useState({
    category: initialCategory || initialParams.get("category") || "",
    q: initialQuery || initialParams.get("q") || "",
    city: initialParams.get("city") || savedArea,
    sort: "rating",
  });
  // "draft" inputs — what the user is typing before they hit Search
  const [draft, setDraft] = useState({ q: filters.q });

  const [compareIds, setCompareIds] = useState([]);
  const [quickView, setQuickView] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
    api.businessCities().then(setCities).catch(() => {});
  }, []);

  // The dashboard keeps this panel mounted, so a new category tile or search has
  // to be pushed in as a prop change rather than a remount.
  useEffect(() => {
    if (!embed) return;
    clearTimeout(debounceRef.current);
    setFilters((f) => ({ ...f, category: initialCategory, q: initialQuery }));
    setDraft({ q: initialQuery });
  }, [embed, initialCategory, initialQuery]);

  useEffect(() => {
    setLoading(true);
    api
      .searchBusinesses(filters)
      .then(setBusinesses)
      .catch(() => setBusinesses([]))
      .finally(() => setLoading(false));
  }, [filters]);

  // Debounced auto-search as the user types (400 ms delay)
  const scheduleSearch = useCallback((value) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, q: value.trim() }));
    }, 400);
  }, []);

  function handleQueryChange(value) {
    setDraft({ q: value });
    scheduleSearch(value);
  }

  // Immediate search on button click or Enter
  function commitSearch(e) {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    setFilters((f) => ({ ...f, q: draft.q.trim() }));
  }

  function clearInput(field) {
    clearTimeout(debounceRef.current);
    setDraft((d) => ({ ...d, [field]: "" }));
    setFilters((f) => ({ ...f, [field]: "" }));
  }

  function chooseMyArea(city) {
    setMyArea(city);
    if (city) localStorage.setItem(MY_AREA_KEY, city);
    else localStorage.removeItem(MY_AREA_KEY);
    setFilters((f) => ({ ...f, city }));
  }

  function chooseSearchCity(city) {
    setFilters((f) => ({ ...f, city }));
  }

  function handleSortChange(value) {
    setFilters((f) => ({ ...f, sort: value }));
  }

  function clearAllFilters() {
    clearTimeout(debounceRef.current);
    setDraft({ q: "" });
    setFilters({ category: "", q: "", city: myArea, sort: "rating" });
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

  // A city can arrive from a link without having any approved listings yet, so
  // it still has to be representable in the picker.
  const cityOptions = (selected) =>
    selected && !cities.some((c) => c.city === selected)
      ? [...cities, { city: selected, count: 0 }]
      : cities;

  const optionLabel = (c) => (c.count ? `${c.city} (${c.count})` : c.city);

  return (
    <div className={embed ? "browse-panel browse-panel--embed" : "container page browse-panel"}>
      {/* ── Page header + search ── */}
      <div className="browse-header">
        {!embed && (
          <div>
            <div className="section-eyebrow">{t("browse.allProviders")}</div>
            <h1 style={{ marginBottom: 4 }}>{t("browse.title")}</h1>
            <p style={{ marginBottom: 0 }}>{t("browse.subtitle")}</p>
          </div>
        )}

        <div className="browse-location-bar">
          <div className="loc-field">
            <label htmlFor="my-area">{t("browse.location.myArea")}</label>
            <div className="search-input-wrap">
              <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                <circle cx="12" cy="12" r="8" />
              </svg>
              <select id="my-area" value={myArea} onChange={(e) => chooseMyArea(e.target.value)}>
                <option value="">{t("browse.location.notSet")}</option>
                {cityOptions(myArea).map((c) => (
                  <option key={c.city} value={c.city}>{optionLabel(c)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="loc-field">
            <label htmlFor="search-city">{t("browse.location.searchIn")}</label>
            <div className="search-input-wrap">
              <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <select id="search-city" value={filters.city} onChange={(e) => chooseSearchCity(e.target.value)}>
                <option value="">{t("browse.location.allCities")}</option>
                {cityOptions(filters.city).map((c) => (
                  <option key={c.city} value={c.city}>{optionLabel(c)}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="browse-location-hint">
            {filters.city ? (
              <>
                {t("browse.location.showing")} <strong>{filters.city}</strong>
              </>
            ) : (
              t("browse.location.pickOne")
            )}
          </p>
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
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitSearch(e)}
              aria-label={t("browse.search.placeholder")}
            />
            {draft.q && (
              <button type="button" className="input-clear-btn" onClick={() => clearInput("q")} aria-label={t("common.remove")}>×</button>
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
              <button onClick={() => chooseSearchCity("")} aria-label={t("browse.filters.remove")}>×</button>
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
      <div className="category-grid">
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
            <img src={getCategoryImage(c)} alt={c.name} />
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
                <div className="biz-card-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setQuickView(b)}>
                    {t("browse.view")}
                  </button>
                  {user ? (
                    <Link to={`/business/${b.id}`} className="btn btn-primary">
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
      {quickView && (
        <BusinessQuickView business={quickView} onClose={() => setQuickView(null)} />
      )}
    </div>
  );
}

// Standalone /browse route — same panel with full page chrome.
export default function Browse() {
  return <BrowsePanel />;
}
