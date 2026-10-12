import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import Icon from "./Icon.jsx";

const STARTERS = [
  "Barber tomorrow after 6 PM under $20",
  "Emergency plumber in Dar es Salaam",
  "Home cleaning this weekend",
  "Math tutor for my kids",
];

function cheapest(business) {
  const prices = (business.services || []).map((s) => s.priceCents).filter((n) => Number.isFinite(n));
  return prices.length ? formatMoney(Math.min(...prices)) : null;
}

// Conversational front-end for POST /api/smartmatch: the customer describes the
// job in one line and the matched providers come back inside the reply bubble.
export default function AiFinder() {
  const [open, setOpen] = useState(true);
  const [turns, setTurns] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [turns, busy]);

  async function ask(e, override) {
    e?.preventDefault();
    const q = (override ?? text).trim();
    if (!q || busy) return;
    setText("");
    setError("");
    setTurns((t) => [...t, { role: "me", q }]);
    setBusy(true);
    try {
      const r = await api.smartMatch(q);
      setTurns((t) => [...t, { role: "ai", message: r.message, understood: r.understood, results: r.results }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel ai-panel">
      <div className="panel-head">
        <h3><Icon name="sparkle" size={17} /> Find with AI</h3>
        <button type="button" className="linklike" onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "Open"}
        </button>
      </div>

      {open && (
        <div className="panel-body">
          <p className="ai-hint">Describe the job in one line — what, when, where and your budget — and the assistant picks providers that fit.</p>

          <div className="ai-thread">
            <div className="ai-msg ai-msg--ai">
              Hi! Tell me what you need done and I will search the approved providers for the closest matches.
            </div>

            {turns.map((turn, i) => turn.role === "me" ? (
              <div className="ai-msg ai-msg--me" key={i}>{turn.q}</div>
            ) : (
              <div className="ai-msg ai-msg--ai" key={i}>
                <div>{turn.message}</div>
                {turn.understood?.length > 0 && (
                  <div className="ai-chips">
                    {turn.understood.map((u) => (
                      <span className="ai-chip" key={`${i}-${u.label}-${u.value}`}>
                        <strong>{u.label}</strong> {u.value}
                      </span>
                    ))}
                  </div>
                )}
                {turn.results?.length > 0 && (
                  <div className="ai-results">
                    {turn.results.map((b) => (
                      <Link className="ai-result" to={`/business/${b.id}`} key={b.id}>
                        <span className="ai-result-score">{b.matchScore}%</span>
                        <span className="ai-result-body">
                          <span className="ai-result-name">{b.name}</span>
                          <span className="ai-result-meta">
                            {[b.category?.name, b.city, cheapest(b) && `from ${cheapest(b)}`].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="ai-result-cta">View →</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {busy && <div className="ai-msg ai-msg--ai ai-typing" aria-live="polite">Searching…</div>}
            <div ref={endRef} />
          </div>

          {turns.length === 0 && (
            <div className="ai-starters">
              {STARTERS.map((s) => (
                <button type="button" className="ai-starter" key={s} onClick={(e) => ask(e, s)}>{s}</button>
              ))}
            </div>
          )}

          <form className="ai-compose" onSubmit={ask}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Hair salon near me this Saturday under $40"
              aria-label="Ask the AI assistant"
            />
            <button className="btn btn-primary" type="submit" disabled={busy || !text.trim()}>Ask</button>
          </form>

          {error && <div className="alert alert-error" style={{ marginTop: 10 }}>{error}</div>}
        </div>
      )}
    </section>
  );
}
