import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import { StarDisplay } from "../components/StarRating.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import DashboardShell from "../components/DashboardShell.jsx";
import Icon from "../components/Icon.jsx";
import AiFinder from "../components/AiFinder.jsx";
import { buckets, ChartPanel, countByBucket, DonutPanel, SERIES, StatCard } from "../components/DashboardPanels.jsx";
import BookingsPanel from "../components/BookingsPanel.jsx";
import MessagesPanel from "../components/MessagesPanel.jsx";
import { BrowsePanel } from "./Browse.jsx";
import { SettingsPanel } from "./Settings.jsx";
import { COUNTRIES } from "../utils/countries.js";

const NAV = [
  { key: "home", label: "Dashboard", icon: "dashboard", group: "Overview", subtitle: "Your bookings, saved providers and activity at a glance." },
  { key: "browse", label: "Find Services", icon: "search", group: "Discover", subtitle: "Search and browse every provider near you." },
  { key: "favorites", label: "Favorites", icon: "heart", subtitle: "Providers you have saved for later." },
  { key: "bookings", label: "My Bookings", icon: "calendar", group: "Activity", subtitle: "Pay, reschedule and review your requests." },
  { key: "messages", label: "Messages", icon: "chat", subtitle: "Chat with the providers you booked." },
  { key: "reviews", label: "My Reviews", icon: "star", subtitle: "Ratings you have left for providers." },
  { key: "notifications", label: "Notifications", icon: "bell", group: "Account", subtitle: "Updates about your bookings." },
  { key: "profile", label: "Profile", icon: "users", subtitle: "Your details and profile picture." },
  { key: "settings", label: "Settings", icon: "settings", subtitle: "Password, language and preferences." },
];

const POPULAR_CATEGORIES = [
  { slug: "mechanics", name: "Transport", mdi: "car", color: "#6ea8ff" },
  { slug: "massage-therapists", name: "Health", mdi: "medicine", color: "#b5a8ff" },
  { slug: "hair-salons", name: "Beauty", mdi: "scissors", color: "#ff8fc7" },
  { slug: "home-repair", name: "Repairs", mdi: "wrench", color: "#4fd8d1" },
  { slug: "food-drinks", name: "Food & Drinks", mdi: "silverware-fork-knife", color: "#ffa62b" },
  { slug: "cleaning-services", name: "Home Services", mdi: "home-variant", color: "#6ee7b7" },
  { slug: "freelancers", name: "Technology", mdi: "laptop", color: "#a5b4fc" },
  { slug: "tutors", name: "Education", mdi: "graduation-cap", color: "#3ddc8b" },
];

const tileIcon = (c) => `https://api.iconify.design/mdi:${c.mdi}.svg?color=${encodeURIComponent(c.color)}&height=24`;

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [section, setSection] = useState("home");
  // Category/query the dashboard pushes into the inline find-services panel
  const [browseSeed, setBrowseSeed] = useState({ category: "", q: "" });
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");

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

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "—";

  return (
    <DashboardShell
      accent="customer"
      navItems={NAV}
      active={section}
      onNav={handleNav}
      context={{ label: "Member since", value: memberSince, icon: "users" }}
      searchPlaceholder="Search services, businesses, or categories…"
      onSearch={(q) => openBrowse({ q })}
    >
      {error && <div className="alert alert-error">{error}</div>}

      {section === "home" && (
        <Overview bookings={bookings} onNav={setSection} onBrowse={openBrowse} />
      )}

      {section === "browse" && (
        <>
          <AiFinder />
          <BrowsePanel embed initialCategory={browseSeed.category} initialQuery={browseSeed.q} />
        </>
      )}

      {section === "messages" && <MessagesPanel />}

      {section === "favorites" && <Favorites onBrowse={openBrowse} />}

      {section === "reviews" && <MyReviews />}

      {section === "notifications" && <NotificationsPanel />}

      {section === "profile" && <ProfileCard user={user} onSettings={() => setSection("settings")} />}

      {section === "settings" && <SettingsPanel embed />}

      {section === "bookings" && (
        <BookingsPanel bookings={bookings} reload={load} onError={setError} onBrowse={openBrowse} />
      )}
    </DashboardShell>
  );
}

function Overview({ bookings, onNav, onBrowse }) {
  const [counts, setCounts] = useState(null);
  const [range, setRange] = useState("Monthly");

  useEffect(() => {
    Promise.all([
      api.favorites().catch(() => []),
      api.myReviews().catch(() => []),
    ]).then(([favorites, reviews]) => setCounts({ favorites: favorites.length, reviews: reviews.length }));
  }, []);

  if (!counts) return <p>Loading…</p>;

  const now = new Date();
  const upcoming = bookings
    .filter((b) => ["PENDING", "CONFIRMED"].includes(b.status) && new Date(b.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const pending = bookings.filter((b) => b.status === "PENDING").length;
  const completed = bookings.filter((b) => b.status === "COMPLETED").length;
  const completedShare = bookings.length ? Math.round((completed / bookings.length) * 100) : 0;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const spentThisMonth = bookings
    .filter((b) => b.payment?.status === "PAID" && new Date(b.createdAt) >= monthStart)
    .reduce((s, b) => s + (b.payment?.amountCents || b.priceCents || 0), 0);
  const recent = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  const bs = buckets(range);
  const byStatus = (s) => bookings.filter((b) => b.status === s).length;

  return (
    <div>
      <div className="stat-grid">
        <StatCard icon="calendar" color="blue" label="Total Bookings" value={bookings.length} foot="All time" footColor="blue" />
        <StatCard icon="inbox" color="red" label="Pending Requests" value={pending} foot="Awaiting reply" footColor="red" />
        <StatCard icon="clipboard" color="green" label="Completed" value={completed} foot={`${completedShare}% of bookings`} footColor="green" />
        <StatCard icon="heart" color="purple" label="Favorites" value={counts.favorites} foot="Saved providers" footColor="purple" />
        <StatCard icon="star" color="amber" label="My Reviews" value={counts.reviews} foot="Ratings given" footColor="amber" />
        <StatCard icon="wallet" color="teal" label="Spent This Month" value={formatMoney(spentThisMonth)} foot="Paid" footColor="teal" />
      </div>

      <div className="dash-2col">
        <ChartPanel
          title="Booking activity"
          icon="chart"
          ranges={["Daily", "Weekly", "Monthly", "Yearly"]}
          range={range}
          onRange={setRange}
          labels={bs.map((b) => b.label)}
          series={[
            { name: "Requests", color: SERIES.blue, points: countByBucket(bookings, bs) },
            { name: "Completed", color: SERIES.green, points: countByBucket(bookings, bs, (b) => b.status === "COMPLETED") },
          ]}
          emptyTitle="No bookings in this period."
          emptyText="Services you book will appear here over time."
        />
        <DonutPanel
          title="Booking status"
          icon="clipboard"
          total={bookings.length}
          totalLabel="Bookings"
          slices={[
            { label: "Confirmed", value: byStatus("CONFIRMED"), color: SERIES.green },
            { label: "Pending", value: byStatus("PENDING"), color: SERIES.amber },
            { label: "Completed", value: byStatus("COMPLETED"), color: SERIES.blue },
            { label: "Cancelled", value: byStatus("CANCELLED"), color: SERIES.red },
          ]}
        />
      </div>

      <div className="dash-cols">
        <div>
          <section className="panel">
            <div className="panel-head">
              <h3><Icon name="calendar" size={17} />Recent bookings</h3>
              <button className="linklike" onClick={() => onNav("bookings")}>View all</button>
            </div>
            <div className="panel-body flush">
              {recent.length === 0 && <p style={{ padding: "16px 20px", margin: 0 }}>No bookings yet.</p>}
              {recent.length > 0 && (
                <table className="data-table">
                  <thead><tr><th>Provider</th><th>Service</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {recent.map((b) => (
                      <tr key={b.id}>
                        <td><Link to={`/business/${b.businessId}`}>{b.business?.name}</Link></td>
                        <td>{b.service?.name}</td>
                        <td>{new Date(b.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
                        <td><span className={`pill pill-${b.status.toLowerCase()}`}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3><Icon name="grid" size={17} />Browse categories</h3>
              <button className="linklike" onClick={() => onBrowse()}>View all</button>
            </div>
            <div className="panel-body">
              <div className="cat-grid cat-grid-4">
                {POPULAR_CATEGORIES.map((c) => (
                  <button key={c.slug} type="button" onClick={() => onBrowse({ category: c.slug })} className="cat-tile">
                    <span className="cat-tile-icon" style={{ background: `${c.color}26` }}>
                      <img src={tileIcon(c)} alt="" width={24} height={24} />
                    </span>
                    <span className="cat-tile-label">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div>
          <section className="panel">
            <div className="panel-head">
              <h3><Icon name="calendar" size={17} />Next visits</h3>
              <button className="linklike" onClick={() => onNav("bookings")}>Manage</button>
            </div>
            <div className="panel-body">
              {upcoming.length === 0 && (
                <p style={{ margin: 0 }}>
                  Nothing scheduled.{" "}
                  <button className="linklike" onClick={() => onBrowse()}>Find a provider →</button>
                </p>
              )}
              {upcoming.slice(0, 4).map((b) => (
                <div className="activity-item" key={b.id}>
                  <span className={`activity-icon tint-${b.status === "PENDING" ? "amber" : "green"}`}>
                    <Icon name="pin" size={16} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="activity-title">{b.service?.name}</div>
                    <div className="activity-sub">{b.business?.name}</div>
                    <div className="hint">
                      {new Date(b.scheduledAt).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3><Icon name="eye" size={17} />Recently viewed</h3>
              <button className="linklike" onClick={() => onBrowse()}>View all</button>
            </div>
            <div className="panel-body">
              <RecentlyViewed onBrowse={onBrowse} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><h3><Icon name="dashboard" size={17} />Quick actions</h3></div>
            <div className="panel-body">
              <div className="qa-grid">
                <button className="qa-tile" onClick={() => onBrowse()}>
                  <span className="activity-icon tint-blue"><Icon name="search" size={18} /></span>
                  Find Services
                </button>
                <button className="qa-tile" onClick={() => onNav("bookings")}>
                  <span className="activity-icon tint-green"><Icon name="calendar" size={18} /></span>
                  My Bookings
                </button>
                <button className="qa-tile" onClick={() => onNav("favorites")}>
                  <span className="activity-icon tint-purple"><Icon name="heart" size={18} /></span>
                  Favorites
                </button>
                <button className="qa-tile" onClick={() => onNav("reviews")}>
                  <span className="activity-icon tint-amber"><Icon name="star" size={18} /></span>
                  My Reviews
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
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
              src={`https://api.iconify.design/mdi:${iconFor(x.icon)}.svg?color=%23a5b4fc&height=22`}
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
  const [form, setForm] = useState({ name: "", phone: "", nationality: "" });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  // Drop the previous preview URL when it is replaced or the panel unmounts
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const initials = (user?.name || "?").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const photo = preview || user?.avatarUrl || null;
  const [photoBroken, setPhotoBroken] = useState(false);
  useEffect(() => setPhotoBroken(false), [photo]);
  const visible = !!photo && !photoBroken;

  // Only what the customer actually gave at sign-up — nothing they never filled.
  const details = [
    { label: "Email", value: user?.email },
    { label: "Phone", value: user?.phone },
    { label: "Nationality", value: user?.nationality },
  ].filter((d) => d.value);

  function startEdit() {
    setForm({ name: user?.name || "", phone: user?.phone || "", nationality: user?.nationality || "" });
    setFile(null); setPreview(null); setError("");
    setEditing(true);
  }

  function cancelEdit() {
    setFile(null); setPreview(null); setError("");
    setEditing(false);
  }

  function pickFile(next) {
    if (!next) return;
    if (!next.type.startsWith("image/")) { setError("Choose an image file"); return; }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  async function save() {
    const name = form.name.trim();
    if (name.length < 2) { setError("Enter a name with at least 2 characters"); return; }
    setSaving(true); setError("");
    try {
      await updateProfile({
        name,
        phone: form.phone.trim(),
        nationality: form.nationality.trim() || null,
        ...(file && { avatarUrl: (await api.uploadAvatar(file)).url }),
      });
      setFile(null); setPreview(null);
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
                {visible ? <img className="avatar-img" src={photo} alt="" onError={() => setPhotoBroken(true)} /> : initials}
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
                  {visible ? "Change photo" : "Upload photo"}
                </button>
              </div>
            </div>
          ) : (
            visible
              ? <img className="profile-avatar avatar-img" src={photo} alt="" onError={() => setPhotoBroken(true)} />
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
                <div className="field" style={{ marginBottom: 10 }}>
                  <label htmlFor="profile-phone">Phone</label>
                  <input
                    id="profile-phone"
                    value={form.phone}
                    maxLength={30}
                    placeholder="Optional"
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor="profile-nationality">Nationality</label>
                  <select
                    id="profile-nationality"
                    value={form.nationality}
                    onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
                  >
                    <option value="">Not specified</option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{user?.name}</div>
            )}
          </div>
        </div>

        {!editing && details.map((d) => (
          <div className="profile-row" key={d.label}>
            <span className="hint">{d.label}</span>
            <strong>{d.value}</strong>
          </div>
        ))}

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
