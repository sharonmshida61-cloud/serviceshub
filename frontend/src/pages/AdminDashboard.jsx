import { useEffect, useState } from "react";
import { api, formatMoney } from "../api";

const TABS = ["Overview", "Pending listings", "Categories", "Users"];

export default function AdminDashboard() {
  const [tab, setTab] = useState("Overview");
  return (
    <div className="container page">
      <h1>Admin dashboard</h1>
      <div className="dash-grid">
        <div className="dash-nav">
          {TABS.map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}
        </div>
        <div>
          {tab === "Overview" && <Overview />}
          {tab === "Pending listings" && <PendingListings />}
          {tab === "Categories" && <Categories />}
          {tab === "Users" && <Users />}
        </div>
      </div>
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.adminStats().then(setStats); }, []);
  if (!stats) return <p>Loading…</p>;
  return (
    <div>
      <h2>Platform overview</h2>
      <div className="grid grid-4">
        <Stat label="Users" value={stats.users} />
        <Stat label="Businesses" value={stats.businesses} />
        <Stat label="Bookings" value={stats.bookings} />
        <Stat label="Revenue" value={formatMoney(stats.revenueCents)} />
      </div>
      <h3 style={{ marginTop: 24 }}>Listings by status</h3>
      <div className="attr-list">
        {Object.entries(stats.businessesByStatus).map(([k, v]) => (
          <span className="attr-chip" key={k}>{k}: {v}</span>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card">
      <div style={{ fontSize: "1.8rem", fontWeight: 700, fontFamily: "Fraunces, serif" }}>{value}</div>
      <div className="hint">{label}</div>
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
      <h2>Pending listings</h2>
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
      <h2>Categories</h2>
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

function Users() {
  const [users, setUsers] = useState([]);
  function load() { api.adminUsers().then(setUsers); }
  useEffect(load, []);

  async function setRole(u, role) {
    await api.setUserRole(u.id, role);
    load();
  }

  return (
    <div>
      <h2>Users</h2>
      <table className="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>ID (for adding as staff)</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td><code style={{ fontSize: "0.72rem" }}>{u.id}</code></td>
              <td>
                <select value={u.role} onChange={(e) => setRole(u, e.target.value)}>
                  {["CUSTOMER", "BUSINESS_OWNER", "EMPLOYEE", "ADMIN"].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
