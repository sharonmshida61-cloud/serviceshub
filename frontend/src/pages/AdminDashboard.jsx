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
  const [search, setSearch] = useState("");
  const [banModal, setBanModal] = useState(null); // user object being banned
  const [banReason, setBanReason] = useState("");
  const [deleteModal, setDeleteModal] = useState(null); // user object being deleted
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function load() { api.adminUsers().then(setUsers); }
  useEffect(load, []);

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
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h2>Users</h2>
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
