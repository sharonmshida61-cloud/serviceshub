import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatMoney } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import { StarDisplay } from "../components/StarRating.jsx";
import MediaGallery from "../components/MediaGallery.jsx";

export default function BusinessDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [error, setError] = useState("");
  const [bookingFor, setBookingFor] = useState(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [thread, setThread] = useState([]);
  const [msgText, setMsgText] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [loyaltyCard, setLoyaltyCard] = useState(null);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [enhancedPortfolio, setEnhancedPortfolio] = useState([]);

  function load() {
    api.business(id).then(setBusiness).catch((e) => setError(e.message));
    api.portfolioItems(id).then(setPortfolio).catch(() => setPortfolio([]));
    api.reviewSummary(id).then(setReviewSummary).catch(() => setReviewSummary(null));
    api.enhancedPortfolio(id).then(setEnhancedPortfolio).catch(() => setEnhancedPortfolio([]));
  }

  useEffect(load, [id]);

  useEffect(() => {
    if (user && business) {
      if (user.role === "CUSTOMER") {
        api.getThread(business.id).then(setThread).catch(() => setThread([]));
        api.checkFavorite(business.id).then((data) => setIsFavorite(data.isFavorite)).catch(() => {});
        api.loyaltyCard(business.id).then(setLoyaltyCard).catch(() => setLoyaltyCard(null));
      }
    }
  }, [user, business?.id]);

  async function toggleFavorite() {
    if (!user || user.role !== "CUSTOMER") return;
    try {
      if (isFavorite) {
        await api.removeFavorite(business.id);
        setIsFavorite(false);
      } else {
        await api.addFavorite(business.id);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error("Failed to toggle favorite", err);
    }
  }

  async function submitBooking(service) {
    if (!user) return navigate("/login");
    if (user.role !== "CUSTOMER") return setError("Only customer accounts can book services.");
    if (!scheduledAt) return setError("Choose a date and time first.");
    setBusy(true);
    setError("");
    try {
      await api.createBooking({ serviceId: service.id, scheduledAt: new Date(scheduledAt).toISOString(), notes });
      setSuccess(`Booked "${service.name}"! Head to your dashboard to pay and message the provider.`);
      setBookingFor(null);
      setScheduledAt("");
      setNotes("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    if (!msgText.trim()) return;
    const msg = await api.sendMessage(business.id, { content: msgText });
    setThread((t) => [...t, msg]);
    setMsgText("");
  }

  if (error && !business) return <div className="container page"><div className="alert alert-error">{error}</div></div>;
  if (!business) return <div className="container page">Loading…</div>;

  const attrs = Object.entries(business.attributes || {}).filter(([, v]) => v !== "" && v !== false);

  return (
    <div className="container page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <span className="pill" style={{ background: "var(--paper-2)", color: "var(--ink-2)" }}>{business.category?.name}</span>
          <h1>{business.name}</h1>
        </div>
        {user && user.role === "CUSTOMER" && (
          <button
            className="btn btn-outline"
            onClick={toggleFavorite}
            style={{ fontSize: "1.5rem", padding: "8px 16px" }}
          >
            {isFavorite ? "💖" : "🤍"}
          </button>
        )}
      </div>
      <StarDisplay rating={business.avgRating} count={business.reviewCount} />
      <p>{business.description}</p>
      <div className="attr-list">
        {business.city && <span className="attr-chip">📍 {business.city}{business.address ? `, ${business.address}` : ""}</span>}
        {business.phone && <span className="attr-chip">📞 {business.phone}</span>}
        {attrs.map(([k, v]) => (
          <span className="attr-chip" key={k}>{k}: {String(v)}</span>
        ))}
      </div>

      {loyaltyCard && (
        <div className="card" style={{ background: "#f0f8ff", marginTop: 16 }}>
          <h3>🎉 Loyalty Card</h3>
          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <strong>Points:</strong> {loyaltyCard.points}
            </div>
            <div>
              <strong>Visits:</strong> {loyaltyCard.visits}
            </div>
            <div>
              <strong>Tier:</strong> <span style={{ textTransform: "capitalize", color: loyaltyCard.tier === "platinum" ? "#a78bfa" : loyaltyCard.tier === "gold" ? "#fbbf24" : loyaltyCard.tier === "silver" ? "#9ca3af" : "#cd7f32" }}>{loyaltyCard.tier}</span>
            </div>
          </div>
        </div>
      )}

      {portfolio.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2>Portfolio</h2>
          <div className="grid grid-3">
            {portfolio.map((item) => (
              <div key={item.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <img src={item.imageUrl} alt={item.title || "Portfolio item"} style={{ width: "100%", height: 200, objectFit: "cover" }} />
                {(item.title || item.description) && (
                  <div style={{ padding: 12 }}>
                    {item.title && <h4 style={{ margin: "0 0 4px 0" }}>{item.title}</h4>}
                    {item.description && <p style={{ margin: 0, fontSize: "0.9rem" }}>{item.description}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {enhancedPortfolio.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2>Credentials & Work</h2>
          <div className="grid grid-3">
            {enhancedPortfolio.map((item) => (
              <div key={item.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ position: "relative" }}>
                  {item.type === "VIDEO" ? (
                    <video
                      src={item.mediaUrl}
                      poster={item.thumbnailUrl}
                      controls
                      style={{ width: "100%", height: 200, objectFit: "cover", background: "#000" }}
                    />
                  ) : (
                    <img
                      src={item.thumbnailUrl || item.mediaUrl}
                      alt={item.title || item.type}
                      style={{ width: "100%", height: 200, objectFit: "cover" }}
                    />
                  )}
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      padding: "4px 8px",
                      background: item.type === "CERTIFICATE" || item.type === "LICENSE" ? "#10b981" : item.type === "VIDEO" ? "#8b5cf6" : "#3b82f6",
                      color: "white",
                      borderRadius: 4,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    {item.type === "CERTIFICATE" ? "📜 Certificate" : item.type === "LICENSE" ? "✅ License" : item.type === "VIDEO" ? "🎥 Video" : item.type === "PROJECT" ? "🏗️ Project" : "📸 Photo"}
                  </span>
                  {item.verified && (
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        padding: "4px 8px",
                        background: "#059669",
                        color: "white",
                        borderRadius: 4,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      ✓ Verified
                    </span>
                  )}
                </div>
                {(item.title || item.description) && (
                  <div style={{ padding: 12 }}>
                    {item.title && <h4 style={{ margin: "0 0 4px 0" }}>{item.title}</h4>}
                    {item.description && <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>{item.description}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-2" style={{ marginTop: 32, alignItems: "start" }}>
        <div>
          <h2>Services</h2>
          {business.services?.length === 0 && <p>No services listed yet.</p>}
          {business.services?.map((s) => (
            <div className="card" style={{ marginBottom: 14 }} key={s.id}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ marginBottom: 4 }}>{s.name}</h3>
                  <p style={{ margin: 0 }}>{s.description}</p>
                  <span className="hint">{s.durationMinutes} min</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>{formatMoney(s.priceCents)}</div>
                  <button className="btn btn-primary btn-sm" onClick={() => setBookingFor(bookingFor === s.id ? null : s.id)}>
                    {bookingFor === s.id ? "Cancel" : "Book"}
                  </button>
                </div>
              </div>
              {bookingFor === s.id && (
                <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  <div className="field">
                    <label>Date & time</label>
                    <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Notes for the provider (optional)</label>
                    <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                  <button className="btn btn-ink btn-block" disabled={busy} onClick={() => submitBooking(s)}>
                    {busy ? "Requesting…" : `Request booking · ${formatMoney(s.priceCents)}`}
                  </button>
                </div>
              )}
            </div>
          ))}

          {business.employees?.length > 0 && (
            <>
              <h2>Team</h2>
              <div className="attr-list">
                {business.employees.map((e) => (
                  <span className="attr-chip" key={e.id}>{e.user.name} — {e.title}</span>
                ))}
              </div>
            </>
          )}
        </div>

        <div>
          {user && user.role === "CUSTOMER" && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3>Message this provider</h3>
              <div className="msg-thread">
                {thread.length === 0 && <p className="hint">Say hello or ask a question before booking.</p>}
                {thread.map((m) => (
                  <div key={m.id} className={`msg-bubble ${m.senderId === user.id ? "mine" : "theirs"}`}>
                    {m.content}
                    <div className="msg-time">{new Date(m.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input placeholder="Type a message…" value={msgText} onChange={(e) => setMsgText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
                <button className="btn btn-outline" onClick={sendMessage}>Send</button>
              </div>
            </div>
          )}

          <h2>Reviews</h2>
          
          {reviewSummary && business.reviews?.length > 0 && (
            <div
              className="card"
              style={{
                background: reviewSummary.sentiment === "positive" ? "#f0fdf4" : reviewSummary.sentiment === "negative" ? "#fef2f2" : "#f8f9fa",
                marginBottom: 16,
                borderLeft: `4px solid ${reviewSummary.sentiment === "positive" ? "#10b981" : reviewSummary.sentiment === "negative" ? "#ef4444" : "#6b7280"}`,
              }}
            >
              <h3 style={{ marginTop: 0 }}>🤖 AI Review Summary</h3>
              <p style={{ fontSize: "0.95rem" }}>{reviewSummary.summary}</p>
              
              {reviewSummary.strengths?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong style={{ color: "#10b981", fontSize: "0.9rem" }}>✓ Strengths:</strong>
                  <ul style={{ margin: "4px 0", paddingLeft: 20, fontSize: "0.9rem" }}>
                    {reviewSummary.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {reviewSummary.concerns?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong style={{ color: "#f59e0b", fontSize: "0.9rem" }}>⚠ Areas to note:</strong>
                  <ul style={{ margin: "4px 0", paddingLeft: 20, fontSize: "0.9rem" }}>
                    {reviewSummary.concerns.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {reviewSummary.keyTopics?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong style={{ fontSize: "0.85rem" }}>Key topics:</strong>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                    {reviewSummary.keyTopics.map((topic) => (
                      <span key={topic} className="attr-chip" style={{ fontSize: "0.8rem" }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {business.reviews?.length === 0 && <p>No reviews yet — be the first after your visit.</p>}
          {business.reviews?.map((r) => (
            <div className="card" style={{ marginBottom: 12 }} key={r.id}>
              <StarDisplay rating={r.rating} />
              <p style={{ margin: "6px 0" }}>{r.comment}</p>
              <span className="hint">— {r.customer?.name}, {new Date(r.createdAt).toLocaleDateString()}</span>
              {r.ownerReply && (
                <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: "2px solid var(--amber)" }}>
                  <strong style={{ fontSize: "0.85rem" }}>Provider reply:</strong>
                  <p style={{ margin: 0 }}>{r.ownerReply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
