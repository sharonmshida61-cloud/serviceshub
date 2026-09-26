import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import { StarInput, StarDisplay } from "../components/StarRating.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import DashboardShell, { Icon } from "../components/DashboardShell.jsx";
import { BrowsePanel } from "./Browse.jsx";
import { SettingsPanel } from "./Settings.jsx";
import { directionsUrl } from "../utils/geolocation.js";

const NAV = [
  { key: "home", label: "Home", icon: "home" },
  { key: "browse", label: "Find Services", icon: "search" },
  { key: "favorites", label: "Favorites", icon: "heart" },
  { key: "bookings", label: "My Bookings", icon: "calendar" },
  { key: "reviews", label: "My Reviews", icon: "star" },
  { key: "notifications", label: "Notifications", icon: "bell" },
  { key: "profile", label: "Profile", icon: "users" },
  { key: "settings", label: "Settings", icon: "settings" },
];

const POPULAR_CATEGORIES = [
  { slug: "mechanics", name: "Transport", mdi: "car", color: "#2563eb", bg: "#e4edff" },
  { slug: "massage-therapists", name: "Health", mdi: "medicine", color: "#8b5cf6", bg: "#f0e9ff" },
  { slug: "hair-salons", name: "Beauty", mdi: "scissors", color: "#ec4899", bg: "#ffe9f4" },
  { slug: "home-repair", name: "Repairs", mdi: "wrench", color: "#14b8a6", bg: "#ddf7f2" },
  { slug: "food-drinks", name: "Food & Drinks", mdi: "silverware-fork-knife", color: "#f59e0b", bg: "#fdf1d9" },
  { slug: "cleaning-services", name: "Home Services", mdi: "home-variant", color: "#3b82f6", bg: "#e4edff" },
  { slug: "freelancers", name: "Technology", mdi: "laptop", color: "#6366f1", bg: "#e7e7ff" },
  { slug: "tutors", name: "Education", mdi: "graduation-cap", color: "#10b981", bg: "#ddf7ea" },
];

const tileIcon = (c) => `https://api.iconify.design/mdi:${c.mdi}.svg?color=${encodeURIComponent(c.color)}&height=24`;

const SECTION_TITLES = {
  home: "Home",
  browse: "Find Services",
  bookings: "My Bookings",
  favorites: "Favorites",
  reviews: "My Reviews",
  notifications: "Notifications",
  profile: "Profile",
  settings: "Settings",
};

export default function CustomerDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [section, setSection] = useState("home");
  // Category/query the dashboard pushes into the inline find-services panel
  const [browseSeed, setBrowseSeed] = useState({ category: "", q: "" });
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [reviewFor, setReviewFor] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busyId, setBusyId] = useState(null);

  function load() {
    api.myBookings().then(setBookings).catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  function handleNav(key) {
    setSection(key);
  }

  // Everything that finds a service stays in the dashboard — no jump to /browse
  function openBrowse({ category = "", q = "" } = {}) {
    setBrowseSeed({ category, q });
    setSection("browse");
  }

  async function pay(booking) {
    setBusyId(booking.id);
    setError("");
    try { await api.payForBooking(booking.id, "card"); load(); }
    catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  }

  async function cancel(booking) {
    setBusyId(booking.id);
    try { await api.updateBookingStatus(booking.id, "CANCELLED"); load(); }
    catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  }

  async function submitReview(booking) {
    try {
      await api.createReview({ bookingId: booking.id, rating, comment });
      setReviewFor(null); setComment(""); setRating(5); load();
    } catch (e) { setError(e.message); }
  }

  const upcoming = useMemo(() => {
    const now = Date.now();
    return bookings
      .filter((b) => ["PENDING", "CONFIRMED"].includes(b.status) && new Date(b.scheduledAt).getTime() >= now)
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0];
  }, [bookings]);

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <DashboardShell
      accent="customer"
      navItems={NAV}
      active={section}
      onNav={handleNav}
      title={SECTION_TITLES[section] || "Home"}
      searchPlaceholder="Search services, businesses, or categories…"
      onSearch={(q) => openBrowse({ q })}
    >
      {error && <div className="alert alert-error">{error}</div>}

      {section === "home" && (
        <div className="cust-grid">
          <div className="cust-main">
            <div className="dash-hero dash-hero--photo">
              <h2>Welcome back, {firstName} 👋</h2>
              <p>Find the best services near you, <strong>all in one place</strong>.</p>
              <form
                className="dash-hero-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = new FormData(e.target).get("q");
                  openBrowse({ q: String(q || "").trim() });
                }}
              >
                <input name="q" placeholder="Search services, businesses or categories…" />
                <button className="btn btn-primary" style={{ background: "var(--dash-active)", border: "none" }}>Search</button>
              </form>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h3>Popular Categories</h3>
                <button className="linklike" onClick={() => openBrowse()}>View All</button>
              </div>
              <div className="panel-body">
                <div className="cat-grid cat-grid-4">
                  {POPULAR_CATEGORIES.map((c) => (
                    <button key={c.slug} type="button" onClick={() => openBrowse({ category: c.slug })} className="cat-tile">
                      <span className="cat-tile-icon" style={{ background: c.bg }}>
                        <img src={tileIcon(c)} alt="" width={24} height={24} />
                      </span>
                      <span className="cat-tile-label">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="cust-mid">
            <div className="panel">
              <div className="panel-head">
                <h3>Upcoming Booking</h3>
                <button className="linklike" onClick={() => setSection("bookings")}>View All</button>
              </div>
              <div className="panel-body">
                {!upcoming && <p style={{ margin: 0 }}>No upcoming bookings. <button className="linklike" onClick={() => openBrowse()}>Find a provider →</button></p>}
                {upcoming && (
                  <>
                    <div className="booking-feature">
                      <span className="rv-thumb rv-thumb--lg">
                        <img src={`https://api.iconify.design/mdi:storefront.svg?color=%236366f1&height=28`} alt="" width={28} height={28} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="rv-name"><Link to={`/business/${upcoming.businessId}`}>{upcoming.business?.name}</Link></div>
                        <div className="activity-sub">{upcoming.service?.name}</div>
                        <div className="activity-sub">📅 {new Date(upcoming.scheduledAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · 🕐 {new Date(upcoming.scheduledAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
                        <span className={`pill pill-${upcoming.status.toLowerCase()}`}>{upcoming.status[0] + upcoming.status.slice(1).toLowerCase()}</span>
                      </div>
                    </div>
                    <button className="btn btn-primary btn-block" style={{ background: "var(--dash-active)", border: "none", marginTop: 12 }} onClick={() => setSection("bookings")}>
                      View Booking
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h3>Recently Viewed</h3>
                <button className="linklike" onClick={() => openBrowse()}>View All</button>
              </div>
              <div className="panel-body">
                <RecentlyViewed onBrowse={openBrowse} />
              </div>
            </div>
          </div>

          <div className="cust-side">
            <div className="panel">
              <div className="panel-head"><h3>Quick Links</h3></div>
              <div className="panel-body">
                <QuickLink icon="calendar" label="My Bookings" onClick={() => setSection("bookings")} />
                <QuickLink icon="heart" label="My Favorites" onClick={() => setSection("favorites")} />
                <QuickLink icon="star" label="My Reviews" onClick={() => setSection("reviews")} />
                <QuickLink icon="chat" label="Help & Support" onClick={() => setSection("settings")} />
              </div>
            </div>

            <div className="promo-card">
              <img className="promo-img" src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=300&q=80" alt="" />
              <div className="promo-body">
                <div className="promo-title">Need a service?<br />We've got you covered!</div>
                <p>From transport to home services, find everything you need on Nearby.</p>
                <button className="btn btn-primary btn-sm" style={{ background: "var(--dash-active)", border: "none" }} onClick={() => openBrowse()}>
                  Explore Services
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {section === "browse" && (
        <BrowsePanel embed initialCategory={browseSeed.category} initialQuery={browseSeed.q} />
      )}

      {section === "favorites" && <Favorites onBrowse={openBrowse} />}

      {section === "reviews" && <MyReviews />}

      {section === "notifications" && <NotificationsPanel />}

      {section === "profile" && <ProfileCard user={user} onSettings={() => setSection("settings")} />}

      {section === "settings" && <SettingsPanel embed />}

      {section === "bookings" && (
        <>
          {bookings.length === 0 && (
            <div className="empty-state card">
              <h3>{t("dashboard.customer.noBookings")}</h3>
              <p>{t("dashboard.customer.noBookings.desc")}</p>
              <button className="btn btn-primary" onClick={() => openBrowse()}>{t("dashboard.customer.discoverProviders")}</button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {bookings.map((b) => (
              <div className="card" key={b.id}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <h3 style={{ marginBottom: 4 }}>
                      <Link to={`/business/${b.businessId}`}>{b.business?.name}</Link>
                    </h3>
                    <p style={{ margin: 0 }}>{b.service?.name} · {new Date(b.scheduledAt).toLocaleString()}</p>
                    {b.notes && <p className="hint">{t("dashboard.customer.note")} {b.notes}</p>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className={`pill pill-${b.status.toLowerCase()}`}>{b.status}</span>
                    <div style={{ fontWeight: 700, marginTop: 6 }}>{formatMoney(b.priceCents)}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-2)" }}>
                      {b.payment?.status === "PAID" ? t("dashboard.customer.paid") : t("dashboard.customer.notPaid")}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {b.status !== "CANCELLED" && b.status !== "DECLINED" && b.payment?.status !== "PAID" && (
                    <button className="btn btn-primary btn-sm" disabled={busyId === b.id} onClick={() => pay(b)}>
                      {busyId === b.id ? t("dashboard.customer.processing") : t("dashboard.customer.payNow")}
                    </button>
                  )}
                  {["PENDING", "CONFIRMED"].includes(b.status) && (
                    <button className="btn btn-danger btn-sm" disabled={busyId === b.id} onClick={() => cancel(b)}>
                      {t("dashboard.customer.cancelBooking")}
                    </button>
                  )}
                  <Link to={`/business/${b.businessId}`}><button className="btn btn-outline btn-sm">{t("dashboard.customer.messageProvider")}</button></Link>
                  {b.business?.latitude != null && b.business?.longitude != null && (
                    <a
                      className="btn btn-outline btn-sm"
                      href={directionsUrl({ latitude: b.business.latitude, longitude: b.business.longitude })}
                      target="_blank"
                      rel="noreferrer"
                    >
                      📍 {t("business.getDirections")}
                    </a>
                  )}
                  {b.status === "COMPLETED" && !b.review && (
                    <button className="btn btn-outline btn-sm" onClick={() => setReviewFor(reviewFor === b.id ? null : b.id)}>
                      {t("dashboard.customer.leaveReview")}
                    </button>
                  )}
                  {b.review && <span className="hint">{t("dashboard.customer.rated", "You rated this {rating}★").replace("{rating}", b.review.rating)}</span>}
                </div>

                {reviewFor === b.id && (
                  <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                    <StarInput value={rating} onChange={setRating} />
                    <textarea
                      rows={2}
                      placeholder={t("dashboard.customer.howDidItGo")}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      style={{ width: "100%", marginTop: 8, padding: 10, borderRadius: 8, border: "1px solid var(--line)" }}
                    />
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => submitReview(b)}>
                      {t("dashboard.customer.submitReview")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardShell>
  );
}

function QuickLink({ icon, label, onClick }) {
  return (
    <button className="quick-link" onClick={onClick}>
      <span className="activity-icon tint-purple"><Icon name={icon} size={16} /></span>
      <span>{label}</span>
      <span style={{ marginLeft: "auto", color: "var(--ink-2)" }}>›</span>
    </button>
  );
}

function RecentlyViewed({ onBrowse }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem("recentlyViewed") || "[]")); } catch { setItems([]); }
  }, []);

  if (items.length === 0) {
    return <p style={{ margin: 0 }}>Nothing viewed yet. <button className="linklike" onClick={() => onBrowse()}>Find services →</button></p>;
  }

  return (
    <div>
      {items.slice(0, 4).map((x) => (
        <div className="rv-row" key={x.id}>
          <span className="rv-thumb">
            <img
              src={`https://api.iconify.design/mdi:${iconFor(x.icon)}.svg?color=%236366f1&height=22`}
              alt="" width={22} height={22}
            />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="rv-name"><Link to={`/business/${x.id}`}>{x.name}</Link></div>
            <div className="activity-sub">{x.category}</div>
          </div>
          <span className="rv-rating">★ {x.rating ? Number(x.rating).toFixed(1) : "—"}</span>
          <Link to={`/business/${x.id}`} className="rv-heart" aria-label="Open">♥</Link>
        </div>
      ))}
    </div>
  );
}

function iconFor(icon) {
  const map = { scissors: "scissors", sparkles: "silverware-fork-knife", car: "car", shirt: "tshirt-crew", "spray-can": "spray-bottle", wrench: "wrench", zap: "lightning-bolt", cog: "cog", camera: "camera", "book-open": "book-open", dumbbell: "dumbbell", calendar: "calendar", hand: "hand-back-right", laptop: "laptop", hammer: "hammer", leaf: "leaf", cross: "medical-cross", home: "home-variant", "graduation-cap": "graduation-cap", utensils: "fork-knife" };
  return map[icon] || "storefront";
}

function MyReviews() {
  const [items, setItems] = useState(null);
  useEffect(() => { api.myReviews().then(setItems).catch(() => setItems([])); }, []);
  if (!items) return <p>Loading…</p>;

  return (
    <div className="panel">
      <div className="panel-head"><h3>My Reviews ({items.length})</h3></div>
      <div className="panel-body flush">
        {items.length === 0 && <p style={{ padding: "18px 20px", margin: 0 }}>You haven't written any reviews yet. Review a completed booking to help others choose.</p>}
        {items.length > 0 && (
          <table className="data-table">
            <thead><tr><th>Business</th><th>Rating</th><th>Comment</th><th>Date</th></tr></thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/business/${r.businessId}`}>{r.business?.name}</Link></td>
                  <td><StarDisplay rating={r.rating} /></td>
                  <td style={{ maxWidth: 360 }}>{r.comment || "—"}</td>
                  <td style={{ fontSize: "0.8rem", color: "var(--ink-2)" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function NotificationsPanel() {
  const [items, setItems] = useState(null);
  useEffect(() => { api.notifications().then(setItems).catch(() => setItems([])); }, []);
  if (!items) return <p>Loading…</p>;

  async function markAll() {
    await api.markAllNotificationsRead();
    setItems((xs) => xs.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Notifications</h3>
        {items.some((n) => !n.readAt) && <button className="linklike" onClick={markAll}>Mark all read</button>}
      </div>
      <div className="panel-body">
        {items.length === 0 && <p style={{ margin: 0 }}>No notifications.</p>}
        {items.map((n) => (
          <div className="activity-item" key={n.id} style={{ opacity: n.readAt ? 0.6 : 1 }}>
            <span className="activity-icon tint-blue"><Icon name="bell" size={15} /></span>
            <div>
              {n.subject && <div className="activity-title">{n.subject}</div>}
              <div className="activity-sub">{n.message}</div>
              <div className="hint">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileCard({ user, onSettings }) {
  const { updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  // Drop the previous preview URL when it is replaced or the panel unmounts
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const initials = (user?.name || "?").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const photo = preview || (removePhoto ? null : user?.avatarUrl || null);

  function startEdit() {
    setForm({ name: user?.name || "", phone: user?.phone || "" });
    setFile(null); setPreview(null); setRemovePhoto(false); setError("");
    setEditing(true);
  }

  function cancelEdit() {
    setFile(null); setPreview(null); setRemovePhoto(false); setError("");
    setEditing(false);
  }

  function pickFile(next) {
    if (!next) return;
    if (!next.type.startsWith("image/")) { setError("Choose an image file"); return; }
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setRemovePhoto(false);
  }

  async function save() {
    setSaving(true); setError("");
    try {
      let avatarUrl;
      if (file) avatarUrl = (await api.uploadAvatar(file)).url;
      else if (removePhoto) avatarUrl = null;
      await updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        ...(avatarUrl !== undefined && { avatarUrl }),
      });
      setFile(null); setPreview(null); setRemovePhoto(false);
      setEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 480 }}>
      <div className="panel-head">
        <h3>My Profile</h3>
        {!editing && <button className="linklike" onClick={startEdit}>Edit</button>}
      </div>
      <div className="panel-body">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="profile-id">
          {editing ? (
            <div className="avatar-edit">
              <button
                type="button"
                className="profile-avatar profile-avatar--pick"
                onClick={() => fileRef.current?.click()}
                aria-label="Choose a profile picture"
              >
                {photo ? <img className="avatar-img" src={photo} alt="" /> : initials}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              <div className="avatar-edit-actions">
                <button type="button" className="linklike" onClick={() => fileRef.current?.click()}>
                  {photo ? "Change photo" : "Upload photo"}
                </button>
                {photo && (
                  <button type="button" className="linklike" onClick={() => { setFile(null); setPreview(null); setRemovePhoto(true); }}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ) : (
            photo
              ? <img className="profile-avatar avatar-img" src={photo} alt="" />
              : <span className="profile-avatar">{initials}</span>
          )}

          <div style={{ minWidth: 0 }}>
            {editing ? (
              <>
                <div className="field" style={{ marginBottom: 10 }}>
                  <label htmlFor="profile-name">Name</label>
                  <input
                    id="profile-name"
                    value={form.name}
                    maxLength={80}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor="profile-phone">Phone</label>
                  <input
                    id="profile-phone"
                    value={form.phone}
                    maxLength={30}
                    placeholder="Optional"
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{user?.name}</div>
                <div className="hint">{(user?.currentRole || user?.role || "").replace("_", " ").toLowerCase()}</div>
              </>
            )}
          </div>
        </div>

        {!editing && (
          <>
            <div className="profile-row"><span className="hint">Email</span><strong>{user?.email}</strong></div>
            <div className="profile-row"><span className="hint">Phone</span><strong>{user?.phone || "—"}</strong></div>
            <div className="profile-row"><span className="hint">Member since</span><strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</strong></div>
          </>
        )}

        <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {editing ? (
            <>
              <button className="btn btn-primary btn-sm" style={{ background: "var(--dash-active)", border: "none" }} disabled={saving} onClick={save}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button className="btn btn-outline btn-sm" disabled={saving} onClick={cancelEdit}>Cancel</button>
            </>
          ) : (
            <button className="btn btn-outline btn-sm" onClick={onSettings}>Settings</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Favorites({ onBrowse }) {
  const [favs, setFavs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.favorites().then(setFavs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function remove(id) {
    await api.removeFavorite(id);
    setFavs((f) => f.filter((x) => x.businessId !== id));
  }

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      {favs.length === 0 && (
        <div className="empty-state card">
          <h3>No favorites yet</h3>
          <p>Save providers you love to find them fast next time.</p>
          <button className="btn btn-primary" onClick={() => onBrowse()}>Discover providers</button>
        </div>
      )}
      <div className="cat-grid">
        {favs.map((f) => (
          <div className="card" key={f.id} style={{ padding: 16, margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h4 style={{ margin: 0 }}><Link to={`/business/${f.businessId}`}>{f.business?.name}</Link></h4>
              <button className="linklike" onClick={() => remove(f.businessId)} aria-label="Remove">✕</button>
            </div>
            <p className="hint" style={{ margin: "6px 0 0" }}>{f.business?.category?.name} · {f.business?.city}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
