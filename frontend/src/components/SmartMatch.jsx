import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatMoney } from "../api";
import { StarDisplay } from "./StarRating";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const EXAMPLE_QUERIES = [
  "I need a barber tomorrow after 6 PM within $50",
  "Emergency plumber needed in Springfield",
  "Find an affordable hair salon near me",
  "Looking for a math tutor for my kids today",
  "Photographer under $200 for a small event",
  "Home cleaning service in Lakeview this weekend",
  "Personal trainer for weight loss in-home sessions",
  "Car wash with full detail under $150",
];

// Score → colour thresholds
function scoreColor(score) {
  if (score >= 75) return { bg: "#dcfce7", text: "#15803d", border: "#86efac" };
  if (score >= 50) return { bg: "#fef9c3", text: "#854d0e", border: "#fde047" };
  return { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" };
}

function ScoreBadge({ score }) {
  const c = scoreColor(score);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: 20, padding: "3px 10px",
      fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap",
    }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
        fill={c.text} stroke="none">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
      {score}% match
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ height: 16, width: "60%", background: "var(--paper-2)", borderRadius: 6, animation: "pulse 1.4s ease-in-out infinite" }} />
      <div style={{ height: 12, width: "40%", background: "var(--paper-2)", borderRadius: 6, animation: "pulse 1.4s ease-in-out infinite" }} />
      <div style={{ height: 12, width: "80%", background: "var(--paper-2)", borderRadius: 6, animation: "pulse 1.4s ease-in-out infinite" }} />
      <div style={{ height: 34, background: "var(--paper-2)", borderRadius: 8, marginTop: 4, animation: "pulse 1.4s ease-in-out infinite" }} />
    </div>
  );
}

export default function SmartMatch() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [exampleIdx, setExampleIdx] = useState(0);

  // Rotate placeholder example every 3 s
  useEffect(() => {
    const id = setInterval(() => setExampleIdx((i) => (i + 1) % EXAMPLE_QUERIES.length), 3000);
    return () => clearInterval(id);
  }, []);

  // Load history when panel opens
  useEffect(() => {
    if (showHistory && user) {
      api.smartMatchHistory()
        .then(setHistory)
        .catch(() => setHistory([]));
    }
  }, [showHistory, user]);

  async function handleSearch(e, overrideQuery) {
    e?.preventDefault();
    const q = (overrideQuery ?? query).trim();
    if (!q) return;
    if (!user) { navigate("/login"); return; }

    setLoading(true);
    setError("");
    setResults(null);
    setShowHistory(false);

    try {
      const data = await api.smartMatch(q);
      setResults(data);
      setQuery(q);
      // Refresh history silently
      api.smartMatchHistory().then(setHistory).catch(() => {});
    } catch (err) {
      setError(err.message || t("error.generic"));
    } finally {
      setLoading(false);
    }
  }

  function useExample(q) {
    setQuery(q);
    handleSearch(null, q);
  }

  function clearResults() {
    setResults(null);
    setError("");
    setQuery("");
  }

  return (
    <div className="smartmatch-card card">
      {/* ── Header ── */}
      <div className="smartmatch-header">
        <div>
          <div className="section-eyebrow" style={{ marginBottom: 4 }}>{t("smartMatch.eyebrow")}</div>
          <h2 style={{ margin: 0, fontSize: "1.35rem" }}>
            🤖 {t("smartMatch.title")}
          </h2>
          <p style={{ margin: "6px 0 0", color: "var(--ink-2)", fontSize: "0.92rem" }}>
            {t("smartMatch.subtitle")}
          </p>
        </div>
        {user && history.length > 0 && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowHistory((s) => !s)}
            style={{ alignSelf: "flex-start", whiteSpace: "nowrap" }}
          >
            {showHistory ? t("smartMatch.hideHistory") : `${t("smartMatch.history")} (${history.length})`}
          </button>
        )}
      </div>

      {/* ── History panel ── */}
      {showHistory && (
        <div className="smartmatch-history">
          <div className="smartmatch-history-title">{t("smartMatch.recentSearches")}</div>
          {history.map((h) => (
            <button
              key={h.id}
              className="smartmatch-history-item"
              onClick={() => useExample(h.query)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span className="smartmatch-history-query">{h.query}</span>
              <span className="smartmatch-history-meta">
                {h.resultCount} result{h.resultCount !== 1 ? "s" : ""} · {new Date(h.createdAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Search form ── */}
      <form className="smartmatch-form" onSubmit={handleSearch}>
        <div className="smartmatch-input-wrap">
          <svg className="smartmatch-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <textarea
            className="smartmatch-textarea"
            rows={2}
            placeholder={t("smartMatch.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSearch(e); }
            }}
          />
          {query && (
            <button
              type="button"
              className="smartmatch-clear-btn"
              onClick={clearResults}
              aria-label={t("common.clear")}
            >×</button>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary smartmatch-submit"
          disabled={loading || !query.trim()}
        >
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="spinner" />
              {t("smartMatch.searching")}
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              {t("smartMatch.findMatches")}
            </span>
          )}
        </button>
      </form>

      {/* ── Guest CTA ── */}
      {!user && (
        <div className="smartmatch-guest-cta">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>
            <Link to="/login">{t("smartMatch.signIn")}</Link> {t("common.or")} <Link to="/register">{t("smartMatch.createAccount")}</Link> {t("common.to")} {t("smartMatch.title")}.
          </span>
        </div>
      )}

      {/* ── Example chips ── */}
      {!results && !loading && (
        <div className="smartmatch-examples">
          <span className="smartmatch-examples-label">{t("smartMatch.tryExample")}</span>
          <div className="smartmatch-chips">
            {EXAMPLE_QUERIES.slice(0, 5).map((q) => (
              <button
                key={q}
                className="smartmatch-chip"
                onClick={() => useExample(q)}
                disabled={!user}
                title={!user ? t("smartMatch.signInRequired") : q}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="smartmatch-error">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* ── Loading skeletons ── */}
      {loading && (
        <div style={{ marginTop: 24 }}>
          <div style={{ height: 14, width: "35%", background: "var(--paper-2)", borderRadius: 6, marginBottom: 16, animation: "pulse 1.4s ease-in-out infinite" }} />
          <div className="smartmatch-grid">
            {[1, 2, 3, 4].map((n) => <SkeletonCard key={n} />)}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {results && !loading && (
        <div style={{ marginTop: 24 }}>
          {/* Understood panel */}
          {results.understood?.length > 0 && (
            <div className="smartmatch-understood">
              <span className="smartmatch-understood-label">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {t("smartMatch.understood")}
              </span>
              <div className="smartmatch-understood-chips">
                {results.understood.map((item) => (
                  <span key={item.label} className="smartmatch-understood-chip">
                    <strong>{item.label}:</strong> {item.value}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Result count */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>{results.message}</h3>
            <button className="btn btn-outline btn-sm" onClick={clearResults}>{t("smartMatch.newSearch")}</button>
          </div>

          {/* No results */}
          {results.results?.length === 0 && (
            <div className="smartmatch-empty">
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>🔍</div>
              <p>{t("smartMatch.noResults")}</p>
              <p style={{ fontSize: "0.88rem", color: "var(--ink-2)" }}>
                {t("smartMatch.noResults.tip")}
              </p>
              <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={clearResults}>
                {t("smartMatch.tryAgain")}
              </button>
            </div>
          )}

          {/* Business cards */}
          <div className="smartmatch-grid">
            {results.results?.map((business) => (
              <div key={business.id} className="card smartmatch-result-card">
                <div className="smartmatch-result-top">
                  <span className="pill" style={{ background: "var(--paper-2)", fontSize: "0.75rem" }}>
                    {business.category?.name}
                  </span>
                  <ScoreBadge score={business.matchScore} />
                </div>
                <h3 className="smartmatch-result-name">
                  <Link to={`/business/${business.id}`}>{business.name}</Link>
                </h3>
                <StarDisplay rating={business.avgRating} count={business.reviewCount} />
                {business.description && (
                  <p className="smartmatch-result-desc">{business.description}</p>
                )}
                <div className="attr-list" style={{ marginBottom: 12 }}>
                  {business.city && (
                    <span className="attr-chip">📍 {business.city}</span>
                  )}
                  {business.services?.length > 0 && (
                    <span className="attr-chip">
                      from {formatMoney(Math.min(...business.services.map((s) => s.priceCents)))}
                    </span>
                  )}
                </div>
                <Link to={`/business/${business.id}`} style={{ marginTop: "auto" }}>
                  <button className="btn btn-primary btn-block btn-sm">
                    {t("home.providers.viewBook")}
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
