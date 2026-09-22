import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import { StarDisplay } from "../components/StarRating.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import DashboardShell, { Icon } from "../components/DashboardShell.jsx";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "users", label: "Manage Users", icon: "users" },
  { key: "owners", label: "Business Owners", icon: "idcard" },
  { key: "businesses", label: "Businesses", icon: "store" },
  { key: "services", label: "Services", icon: "tag" },
  { key: "categories", label: "Categories", icon: "grid" },
  { key: "bookings", label: "Bookings", icon: "calendar" },
  { key: "reviews", label: "Reviews", icon: "star" },
  { key: "locations", label: "Locations", icon: "pin" },
  { key: "complaints", label: "Complaints", icon: "alert" },
  { key: "reports", label: "Reports", icon: "chart" },
  { key: "settings", label: "System Settings", icon: "settings" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [section, setSection] = useState("dashboard");
  const [headerSearch, setHeaderSearch] = useState("");
  const title = NAV.find((n) => n.key === section)?.label || "Pending Listings";

  return (
    <DashboardShell
      accent="admin"
      navItems={NAV}
      active={section}
      onNav={setSection}
      title={title}
      searchPlaceholder="Search anything…"
      onSearch={(q) => { setHeaderSearch(q); setSection("users"); }}
    >
      {section === "dashboard" && <Overview onNav={setSection} userName={user?.name} />}
      {section === "pending" && <PendingListings />}
      {section === "users" && <Users initialSearch={headerSearch} />}
      {section === "owners" && <Users roleFilter="BUSINESS_OWNER" />}
      {section === "businesses" && <Businesses />}
      {section === "services" && <AdminServices />}
      {section === "categories" && <Categories />}
      {section === "bookings" && <AdminBookings />}
      {section === "reviews" && <AdminReviews />}
      {section === "locations" && <Locations />}
      {section === "complaints" && <Complaints />}
      {section === "reports" && <Reports />}
      {section === "settings" && <SystemSettings />}
    </DashboardShell>
  );
}

function timeAgo(date) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

const cap = (s) => s ? s[0] + s.slice(1).toLowerCase().replace("_", " ") : s;

function Overview({ onNav, userName }) {
  const [stats, setStats] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    api.adminStats().then(setStats).catch(() => {});
    api.adminBusinesses().then(setBusinesses).catch(() => {});
    api.adminUsers().then(setUsers).catch(() => {});
    api.adminBookings().then(setBookings).catch(() => {});
    api.adminReviews().then(setReviews).catch(() => {});
  }, []);

  if (!stats) return <p>Loading…</p>;

  const byStatus = stats.businessesByStatus || {};
  const firstName = (userName || "Admin").replace(/^Platform\s+/i, "");

  const activity = [
    ...businesses.slice(0, 3).map((b) => ({ id: `b-${b.id}`, icon: "store", tint: "tint-blue", title: "New business registered", sub: `${b.name} · ${b.owner?.name || "Owner"}`, at: b.createdAt })),
    ...users.slice(0, 3).map((u) => ({ id: `u-${u.id}`, icon: "idcard", tint: "tint-green", title: "New user registered", sub: `${u.name} · ${cap(u.role)}`, at: u.createdAt })),
    ...bookings.slice(0, 2).map((k) => ({ id: `k-${k.id}`, icon: "calendar", tint: "tint-amber", title: "Booking request", sub: `${k.service?.name || "Service"} · ${k.business?.name}`, at: k.createdAt })),
    ...reviews.slice(0, 2).map((r) => ({ id: `r-${r.id}`, icon: "star", tint: "tint-purple", title: "Review submitted", sub: `${r.rating}★ · ${r.business?.name}`, at: r.createdAt })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 2 }}>Welcome back, {firstName} 👋</h2>
        <p style={{ margin: 0 }}>Here's what's happening on Nearby today.</p>
      </div>

      <div className="stat-grid">
        <Stat icon="users" color="blue" label="Total Users" value={stats.users} trend="12% from last month" dir="up" />
        <Stat icon="idcard" color="green" label="Business Owners" value={stats.businessOwners} trend="8% from last month" dir="up" />
        <Stat icon="store" color="purple" label="Businesses" value={stats.businesses} trend="10% from last month" dir="up" />
        <Stat icon="tag" color="amber" label="Total Services" value={stats.services} trend="15% from last month" dir="up" />
        <Stat icon="calendar" color="teal" label="Bookings Today" value={stats.bookingsToday} trend="20% from yesterday" dir="up" />
        <Stat icon="inbox" color="red" label="Pending Approvals" value={byStatus.PENDING || 0} trend="5% from last week" dir="down" />
      </div>

      <div className="dash-cols">
        <div className="panel">
          <div className="panel-head">
            <h3>Recent Businesses</h3>
            <button className="linklike" onClick={() => onNav("businesses")}>View All</button>
          </div>
          <div className="panel-body flush">
            <table className="data-table">
              <thead><tr><th>Business Name</th><th>Owner</th><th>Category</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {businesses.slice(0, 5).map((b) => (
                  <tr key={b.id}>
                    <td>{b.name}</td>
                    <td>{b.owner?.name}</td>
                    <td>{b.category?.name}</td>
                    <td><span className={`pill pill-${b.status.toLowerCase()}`}>{cap(b.status)}</span></td>
                    <td>
                      {b.status === "PENDING" ? (
                        <button className="btn btn-outline btn-sm" onClick={() => onNav("pending")}>Review</button>
                      ) : (
                        <Link to={`/business/${b.id}`} className="btn btn-outline btn-sm">View</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Recent Activity</h3></div>
          <div className="panel-body">
            {activity.map((a) => (
              <div className="activity-item" key={a.id}>
                <span className={`activity-icon ${a.tint}`}><Icon name={a.icon} size={16} /></span>
                <div>
                  <div className="activity-title">{a.title}</div>
                  <div className="activity-sub">{a.sub}</div>
                  <div className="hint">{timeAgo(a.at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, color, label, value, trend, dir = "up" }) {
  return (
    <div className={`stat-card sc-${color}`}>
      <span className={`stat-icon solid-${color}`}><Icon name={icon} size={20} /></span>
      <span className="stat-text">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {trend && <span className={`stat-trend trend-${dir}`}>{dir === "up" ? "↑" : "↓"} {trend}</span>}
      </span>
    </div>
  );
}

function Businesses() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");

  function load() { api.adminBusinesses().then(setList).catch(() => {}); }
  useEffect(load, []);

  async function setStatus(b, status) {
    await api.setBusinessStatus(b.id, status);
    load();
  }

  const rows = list.filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()) || b.owner?.name?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Businesses ({list.length})</h3>
        <input placeholder="Search businesses…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 240 }} />
      </div>
      <div className="panel-body flush">
        <table className="data-table">
          <thead><tr><th>Business Name</th><th>Owner</th><th>Category</th><th>City</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>{b.owner?.name}</td>
                <td>{b.category?.name}</td>
                <td>{b.city || "—"}</td>
                <td><span className={`pill pill-${b.status.toLowerCase()}`}>{cap(b.status)}</span></td>
                <td>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {b.status === "PENDING" && <button className="btn btn-primary btn-sm" onClick={() => setStatus(b, "APPROVED")}>Approve</button>}
                    {b.status === "APPROVED" && <button className="btn btn-outline btn-sm" onClick={() => setStatus(b, "SUSPENDED")}>Suspend</button>}
                    {(b.status === "SUSPENDED" || b.status === "REJECTED") && <button className="btn btn-outline btn-sm" onClick={() => setStatus(b, "APPROVED")}>Restore</button>}
                    <Link to={`/business/${b.id}`} className="btn btn-outline btn-sm">View</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminServices() {
  const [list, setList] = useState([]);
  useEffect(() => { api.adminServices().then(setList).catch(() => {}); }, []);

  return (
    <div className="panel">
      <div className="panel-head"><h3>Services ({list.length})</h3></div>
      <div className="panel-body flush">
        <table className="data-table">
          <thead><tr><th>Service</th><th>Business</th><th>Category</th><th>Price</th><th>Duration</th></tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.business?.name}</td>
                <td>{s.business?.category?.name}</td>
                <td>{formatMoney(s.priceCents)}</td>
                <td>{s.durationMinutes} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminBookings() {
  const [list, setList] = useState([]);
  useEffect(() => { api.adminBookings().then(setList).catch(() => {}); }, []);

  return (
    <div className="panel">
      <div className="panel-head"><h3>Bookings ({list.length})</h3></div>
      <div className="panel-body flush">
        <table className="data-table">
          <thead><tr><th>Customer</th><th>Business</th><th>Service</th><th>When</th><th>Status</th><th>Paid</th></tr></thead>
          <tbody>
            {list.map((k) => (
              <tr key={k.id}>
                <td>{k.customer?.name}</td>
                <td>{k.business?.name}</td>
                <td>{k.service?.name}</td>
                <td>{new Date(k.scheduledAt).toLocaleString()}</td>
                <td><span className={`pill pill-${k.status.toLowerCase()}`}>{cap(k.status)}</span></td>
                <td>{k.payment?.status === "PAID" ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminReviews() {
  const [list, setList] = useState([]);
  useEffect(() => { api.adminReviews().then(setList).catch(() => {}); }, []);

  return (
    <div className="panel">
      <div className="panel-head"><h3>Reviews ({list.length})</h3></div>
      <div className="panel-body flush">
        <table className="data-table">
          <thead><tr><th>Rating</th><th>Comment</th><th>Customer</th><th>Business</th><th>Date</th></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td><StarDisplay rating={r.rating} /></td>
                <td style={{ maxWidth: 320 }}>{r.comment || "—"}</td>
                <td>{r.customer?.name}</td>
                <td>{r.business?.name}</td>
                <td style={{ fontSize: "0.8rem", color: "var(--ink-2)" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Locations() {
  const [list, setList] = useState([]);
  useEffect(() => { api.adminBusinesses().then(setList).catch(() => {}); }, []);

  const counts = {};
  list.forEach((b) => {
    const c = b.city || "Unspecified";
    counts[c] = (counts[c] || 0) + 1;
  });
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="panel">
      <div className="panel-head"><h3>Locations ({rows.length})</h3></div>
      <div className="panel-body flush">
        <table className="data-table">
          <thead><tr><th>City</th><th>Businesses</th></tr></thead>
          <tbody>
            {rows.map(([city, n]) => (
              <tr key={city}>
                <td>{city}</td>
                <td>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Complaints() {
  return (
    <div className="panel">
      <div className="panel-head"><h3>Complaints</h3></div>
      <div className="panel-body">
        <p style={{ margin: 0 }}>No complaints have been reported yet. When customers flag a business, it will appear here for review.</p>
      </div>
    </div>
  );
}

function Reports() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.adminStats().then(setStats).catch(() => {}); }, []);
  if (!stats) return <p>Loading…</p>;

  const byStatus = stats.businessesByStatus || {};
  return (
    <div className="stat-grid">
      <Stat icon="wallet" color="teal" label="Total Revenue" value={formatMoney(stats.revenueCents)} />
      <Stat icon="calendar" color="blue" label="Total Bookings" value={stats.bookings} />
      <Stat icon="store" color="green" label="Approved Listings" value={byStatus.APPROVED || 0} />
      <Stat icon="star" color="purple" label="Total Services" value={stats.services} />
    </div>
  );
}

function SystemSettings() {
  return (
    <div className="panel">
      <div className="panel-head"><h3>System Settings</h3></div>
      <div className="panel-body">
        <p style={{ margin: 0 }}>Platform-wide settings (maintenance mode, payment providers, email templates) are coming soon. Categories can be managed from the <strong>Categories</strong> page.</p>
      </div>
    </div>
  );
}

function PendingListings() {
  const [pending, setPending] = useState([]);
  function load() { api.pendingBusinesses().then(setPending); }
  useEffect(load, []);

  async function setStatus(b, status) {
    await api.setBusinessStatus(b.id, status);
    load();
  }

  return (
    <div>
      {pending.length === 0 && <p>Nothing waiting on review.</p>}
      {pending.map((b) => (
        <div className="card" key={b.id} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ marginBottom: 4 }}>{b.name}</h3>
              <p style={{ margin: 0 }}>{b.category?.name} · owner: {b.owner?.name} ({b.owner?.email})</p>
              <p className="hint">{b.description}</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <button className="btn btn-primary btn-sm" onClick={() => setStatus(b, "APPROVED")}>Approve</button>
              <button className="btn btn-danger btn-sm" onClick={() => setStatus(b, "REJECTED")}>Reject</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Categories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: "", slug: "", icon: "sparkles", description: "" });
  const [error, setError] = useState("");

  function load() { api.categories(true).then(setCategories); }
  useEffect(load, []);

  async function create(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createCategory({ ...form, attributeSchema: [] });
      setForm({ name: "", slug: "", icon: "sparkles", description: "" });
      load();
    } catch (e) { setError(e.message); }
  }

  async function toggleActive(c) {
    await api.updateCategory(c.id, { active: !c.active });
    load();
  }

  return (
    <div>
      <p>This is what makes the platform expandable — add a new category here and it immediately becomes available to business owners and customers, no code changes required.</p>
      {error && <div className="alert alert-error">{error}</div>}
      <table className="data-table">
        <thead><tr><th>Name</th><th>Slug</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td><code>{c.slug}</code></td>
              <td>{c.active ? "Active" : "Hidden"}</td>
              <td><button className="btn btn-outline btn-sm" onClick={() => toggleActive(c)}>{c.active ? "Hide" : "Unhide"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="card" style={{ maxWidth: 420, marginTop: 20 }}>
        <h3>Add a category</h3>
        <form onSubmit={create}>
          <div className="field"><label>Name</label><input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))} /></div>
          <div className="field"><label>Slug</label><input required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} /></div>
          <div className="field"><label>Description</label><input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
          <button className="btn btn-primary btn-block">Create category</button>
        </form>
      </div>
    </div>
  );
}

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function Users({ roleFilter, initialSearch = "" }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [banModal, setBanModal] = useState(null); // user object being banned
  const [banReason, setBanReason] = useState("");
  const [deleteModal, setDeleteModal] = useState(null); // user object being deleted
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function load() { api.adminUsers().then(setUsers); }
  useEffect(load, []);
  useEffect(() => { setSearch(initialSearch); }, [initialSearch]);

  async function setRole(u, role) {
    await api.setUserRole(u.id, role);
    load();
  }

  async function confirmBan() {
    setBusy(true);
    setError("");
    try {
      await api.banUser(banModal.id, banReason.trim() || undefined);
      setBanModal(null);
      setBanReason("");
      load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function unban(u) {
    try { await api.unbanUser(u.id); load(); }
    catch (e) { setError(e.message); }
  }

  async function confirmDelete() {
    setBusy(true);
    setError("");
    try {
      await api.deleteUser(deleteModal.id);
      setDeleteModal(null);
      load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const filtered = users.filter((u) =>
    (!roleFilter || u.role === roleFilter) &&
    (!search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      <input
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16, maxWidth: 320 }}
      />

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.id} style={u.bannedAt ? { opacity: 0.6, background: "var(--danger-bg, #fef2f2)" } : {}}>
              <td>
                {u.name}
                {u.bannedAt && (
                  <span style={{ marginLeft: 6, fontSize: "0.7rem", background: "#ef4444", color: "white", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                    BANNED
                  </span>
                )}
              </td>
              <td>{u.email}</td>
              <td>
                {u.bannedAt ? (
                  <span style={{ color: "var(--ink-2)", fontSize: "0.85rem" }}>{u.role}</span>
                ) : (
                  <select
                    value={u.role}
                    onChange={(e) => setRole(u, e.target.value)}
                    disabled={u.role === "ADMIN"}
                  >
                    {["CUSTOMER", "BUSINESS_OWNER", "EMPLOYEE", "ADMIN"].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                )}
              </td>
              <td>
                {u.bannedAt ? (
                  <div>
                    <div style={{ color: "#ef4444", fontWeight: 600, fontSize: "0.8rem" }}>Banned {new Date(u.bannedAt).toLocaleDateString()}</div>
                    {u.banReason && <div style={{ color: "var(--ink-2)", fontSize: "0.75rem" }}>"{u.banReason}"</div>}
                  </div>
                ) : (
                  <span style={{ color: "#10b981", fontWeight: 600, fontSize: "0.8rem" }}>Active</span>
                )}
              </td>
              <td style={{ fontSize: "0.8rem", color: "var(--ink-2)" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
              <td>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {u.role !== "ADMIN" && (
                    <>
                      {u.bannedAt ? (
                        <button className="btn btn-outline btn-sm" onClick={() => unban(u)}>Unban</button>
                      ) : (
                        <button
                          className="btn btn-sm"
                          style={{ background: "#f59e0b", color: "white", border: "none" }}
                          onClick={() => { setBanModal(u); setBanReason(""); setError(""); }}
                        >
                          Ban
                        </button>
                      )}
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => { setDeleteModal(u); setError(""); }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Ban confirmation modal */}
      {banModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>Ban {banModal.name}?</h3>
            <p style={{ color: "var(--ink-2)" }}>
              This will immediately block <strong>{banModal.email}</strong> from logging in and
              suspend all their business listings. You can unban them at any time.
            </p>
            <div className="field">
              <label>Reason (shown to the user)</label>
              <textarea
                rows={3}
                placeholder="e.g. Suspected fraudulent activity, multiple customer complaints…"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setBanModal(null)} disabled={busy}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ background: "#f59e0b", color: "white", border: "none", padding: "8px 20px" }}
                onClick={confirmBan}
                disabled={busy}
              >
                {busy ? "Banning…" : "Confirm ban"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0, color: "#ef4444" }}>Permanently delete {deleteModal.name}?</h3>
            <p style={{ color: "var(--ink-2)" }}>
              This will <strong>permanently remove</strong> the account for <strong>{deleteModal.email}</strong>.
              Their bookings and reviews will be preserved for record-keeping, but the account itself cannot be recovered.
            </p>
            <p style={{ color: "#ef4444", fontWeight: 600, fontSize: "0.9rem" }}>
              Consider banning instead — it's reversible. Only delete if absolutely necessary.
            </p>
            {error && <div className="alert alert-error">{error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setDeleteModal(null)} disabled={busy}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={busy}>
                {busy ? "Deleting…" : "Yes, delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const modalOverlay = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
};

const modalBox = {
  background: "var(--paper, #fff)", borderRadius: 12, padding: 28,
  maxWidth: 480, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
};
