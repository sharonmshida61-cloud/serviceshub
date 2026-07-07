import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import { StarDisplay } from "../components/StarRating.jsx";
import SmartMatch from "../components/SmartMatch.jsx";
import { getCategoryImage } from "../utils/categoryImages.js";

export default function Home() {
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

  const compareList = useMemo(
    () => businesses.filter((b) => compareIds.includes(b.id)),
    [businesses, compareIds]
  );

  function toggleCompare(id) {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev));
  }

  return (
    <div>
      <section className="hero">
        <div className="container">
          <h1>Find someone you can trust,<br />right around the corner.</h1>
          <p>
            Barbers, plumbers, tutors, photographers, and dozens more — discover local providers,
            compare them side by side, and book in one place.
          </p>
          <form
            className="search-bar"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              placeholder="Search by name…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
            <input
              placeholder="City"
              value={filters.city}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
            />
            <select value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}>
              <option value="rating">Top rated</option>
              <option value="price">Lowest price</option>
              <option value="newest">Newest</option>
            </select>
          </form>
        </div>
      </section>

      <div className="container page">
        <SmartMatch />

        <h2 style={{ marginTop: 48 }}>The route from search to service</h2>
        <div className="route">
          {[
            ["Discover", "Browse every category in one directory."],
            ["Compare", "Ratings, prices and specialties side by side."],
            ["Book", "Pick a time that works and request it instantly."],
            ["Pay", "Settle up securely the moment it's confirmed."],
            ["Message", "Coordinate details directly with the provider."],
            ["Review", "Rate the job so the next neighbor knows what to expect."],
          ].map(([title, desc], i) => (
            <div className="route-stop" key={title}>
              <div className="marker">{i + 1}</div>
              <h4>{title}</h4>
              <p>{desc}</p>
            </div>
          ))}
        </div>

        <h2>Browse by category</h2>
        <div className="category-grid" style={{ marginBottom: 40 }}>
          <button
            className={`category-chip ${filters.category === "" ? "active" : ""}`}
            onClick={() => setFilters((f) => ({ ...f, category: "" }))}
            style={{ cursor: "pointer" }}
          >
            <img src="https://api.iconify.design/mdi:folder.svg?color=%23fb8500&height=48" alt="Categories" />
            All categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`category-chip ${filters.category === c.slug ? "active" : ""}`}
              onClick={() => setFilters((f) => ({ ...f, category: f.category === c.slug ? "" : c.slug }))}
              style={{ cursor: "pointer" }}
            >
              <img src={getCategoryImage(c.icon)} alt={c.name} />
              {c.name}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2>{filters.category ? categories.find((c) => c.slug === filters.category)?.name : "All providers"}</h2>
          <span className="hint" style={{ color: "var(--ink-2)", fontSize: "0.85rem" }}>
            {compareIds.length > 0 && `Comparing ${compareIds.length}/3 — `}
            {businesses.length} result{businesses.length !== 1 && "s"}
          </span>
        </div>

        {loading && <p>Loading providers…</p>}
        {!loading && businesses.length === 0 && (
          <div className="empty-state card">
            <h3>No providers match yet</h3>
            <p>Try a different category, city, or clear your search.</p>
          </div>
        )}

        <div className="grid grid-3">
          {businesses.map((b) => (
            <div className="card biz-card" key={b.id}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="pill" style={{ background: "var(--paper-2)", color: "var(--ink-2)" }}>
                  {b.category?.name}
                </span>
                <label style={{ fontSize: "0.75rem", display: "flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={compareIds.includes(b.id)} onChange={() => toggleCompare(b.id)} />
                  Compare
                </label>
              </div>
              <h3>
                <Link to={`/business/${b.id}`}>{b.name}</Link>
              </h3>
              <StarDisplay rating={b.avgRating} count={b.reviewCount} />
              <p>{b.description}</p>
              <div className="attr-list">
                {b.city && <span className="attr-chip">📍&nbsp;{b.city}</span>}
                {b.services?.length > 0 && (
                  <span className="attr-chip">
                    from {formatMoney(Math.min(...b.services.map((s) => s.priceCents)))}
                  </span>
                )}
              </div>
              <Link to={`/business/${b.id}`}>
                <button className="btn btn-outline btn-block">View & book</button>
              </Link>
            </div>
          ))}
        </div>

        {compareList.length > 1 && (
          <div style={{ marginTop: 48 }}>
            <h2>Compare providers</h2>
            <div className="card" style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Category</th>
                    <th>Rating</th>
                    <th>Starting price</th>
                    <th>City</th>
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
                      <td>{b.avgRating ? b.avgRating.toFixed(1) : "New"} ({b.reviewCount})</td>
                      <td>
                        {b.services?.length
                          ? formatMoney(Math.min(...b.services.map((s) => s.priceCents)))
                          : "—"}
                      </td>
                      <td>{b.city || "—"}</td>
                      <td>
                        <Link to={`/business/${b.id}`}>
                          <button className="btn btn-primary btn-sm">Book</button>
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
