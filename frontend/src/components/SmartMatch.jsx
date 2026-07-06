import { useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import { StarDisplay } from "./StarRating";

export default function SmartMatch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const data = await api.smartMatch(query);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>🤖 AI Smart Match</h2>
      <p style={{ marginBottom: 16, color: "#666" }}>
        Describe what you need in natural language, and we'll find the best providers for you.
      </p>

      <form onSubmit={handleSearch}>
        <div className="field">
          <textarea
            rows={3}
            placeholder='Try: "I need a barber tomorrow after 6 PM within $50 budget" or "Emergency plumber needed in downtown"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Searching..." : "Find Matches"}
        </button>
      </form>

      {error && (
        <div className="alert alert-error" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      {results && (
        <div style={{ marginTop: 24 }}>
          <h3>{results.message}</h3>
          
          {results.parsed && Object.keys(results.parsed).some(k => results.parsed[k]) && (
            <div style={{ padding: 12, background: "#f0f8ff", borderRadius: 8, marginBottom: 16 }}>
              <strong>Understood:</strong>
              <ul style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
                {results.parsed.category && <li>Category: {results.parsed.category}</li>}
                {results.parsed.location && <li>Location: {results.parsed.location}</li>}
                {results.parsed.budget && <li>Budget: {formatMoney(results.parsed.budget)}</li>}
                {results.parsed.time?.tomorrow && <li>Time: Tomorrow</li>}
                {results.parsed.time?.today && <li>Time: Today</li>}
                {results.parsed.time?.hour && (
                  <li>After: {results.parsed.time.hour} {results.parsed.time.period}</li>
                )}
              </ul>
            </div>
          )}

          {results.results?.length === 0 && (
            <p style={{ color: "#666" }}>No providers found matching your criteria. Try adjusting your search.</p>
          )}

          <div className="grid grid-2" style={{ gap: 16 }}>
            {results.results?.map((business) => (
              <div key={business.id} className="card" style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "#10b981",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  {business.matchScore}% match
                </div>
                <span className="pill" style={{ background: "var(--paper-2)" }}>
                  {business.category?.name}
                </span>
                <h3>
                  <Link to={`/business/${business.id}`}>{business.name}</Link>
                </h3>
                <StarDisplay rating={business.avgRating} count={business.reviewCount} />
                <p style={{ fontSize: "0.9rem", margin: "8px 0" }}>{business.description}</p>
                <div className="attr-list">
                  {business.city && <span className="attr-chip">📍 {business.city}</span>}
                  {business.services?.length > 0 && (
                    <span className="attr-chip">
                      from {formatMoney(Math.min(...business.services.map((s) => s.priceCents)))}
                    </span>
                  )}
                </div>
                <Link to={`/business/${business.id}`}>
                  <button className="btn btn-primary btn-block" style={{ marginTop: 12 }}>
                    View & Book
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
