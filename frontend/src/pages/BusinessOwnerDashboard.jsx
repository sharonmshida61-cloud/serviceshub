import { useEffect, useState } from "react";
import { api, formatMoney } from "../api";
import { StarDisplay } from "../components/StarRating.jsx";

const TABS = ["Bookings", "Services", "Employees", "Messages", "Reviews", "Settings"];

export default function BusinessOwnerDashboard() {
  const [businesses, setBusinesses] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState("Bookings");
  const [error, setError] = useState("");
  const [showNewBiz, setShowNewBiz] = useState(false);
  const [categories, setCategories] = useState([]);

  function load() {
    api.myBusinesses().then((list) => {
      setBusinesses(list);
      if (!activeId && list.length) setActiveId(list[0].id);
    }).catch((e) => setError(e.message));
  }

  useEffect(load, []);
  useEffect(() => { api.categories().then(setCategories); }, []);

  const active = businesses.find((b) => b.id === activeId);

  return (
    <div className="container page">
      <h1>Business dashboard</h1>
      {error && <div className="alert alert-error">{error}</div>}

      {businesses.length === 0 && !showNewBiz && (
        <div className="empty-state card">
          <h3>You haven't listed a business yet</h3>
          <p>Create your first listing to start accepting bookings.</p>
          <button className="btn btn-primary" onClick={() => setShowNewBiz(true)}>List a business</button>
        </div>
      )}

      {showNewBiz && (
        <NewBusinessForm
          categories={categories}
          onCreated={(b) => { setBusinesses((prev) => [...prev, b]); setActiveId(b.id); setShowNewBiz(false); }}
          onCancel={() => setShowNewBiz(false)}
        />
      )}

      {businesses.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 24 }}>
            {businesses.map((b) => (
              <button
                key={b.id}
                className={`category-chip ${b.id === activeId ? "active" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => setActiveId(b.id)}
              >
                {b.name} <span className={`pill pill-${b.status.toLowerCase()}`} style={{ marginLeft: 6 }}>{b.status}</span>
              </button>
            ))}
            <button className="btn btn-outline btn-sm" onClick={() => setShowNewBiz(true)}>+ New listing</button>
          </div>

          {active && (
            <div className="dash-grid">
              <div className="dash-nav">
                {TABS.map((t) => (
                  <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>
                ))}
              </div>
              <div>
                {active.status === "PENDING" && (
                  <div className="alert alert-error">This listing is awaiting admin approval and isn't visible to customers yet.</div>
                )}
                {tab === "Bookings" && <BookingsPanel business={active} />}
                {tab === "Services" && <ServicesPanel business={active} onChange={load} />}
                {tab === "Employees" && <EmployeesPanel business={active} onChange={load} />}
                {tab === "Messages" && <MessagesPanel business={active} />}
                {tab === "Reviews" && <ReviewsPanel business={active} />}
                {tab === "Settings" && <SettingsPanel business={active} onChange={load} />}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NewBusinessForm({ categories, onCreated, onCancel }) {
  const [form, setForm] = useState({ name: "", description: "", categorySlug: "", city: "", address: "", phone: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const biz = await api.createBusiness(form);
      onCreated(biz);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, marginBottom: 24 }}>
      <h3>List a new business</h3>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label>Business name</label>
          <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="field">
          <label>Category</label>
          <select required value={form.categorySlug} onChange={(e) => setForm((f) => ({ ...f, categorySlug: e.target.value }))}>
            <option value="">Select a category…</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Description</label>
          <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="grid grid-2">
          <div className="field"><label>City</label><input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></div>
          <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
        </div>
        <div className="field"><label>Address</label><input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create listing"}</button>
          <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
        </div>
        <p className="hint" style={{ marginTop: 10 }}>New listings start as "Pending" until an admin approves them.</p>
      </form>
    </div>
  );
}

function BookingsPanel({ business }) {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");

  function load() { api.businessBookings(business.id).then(setBookings).catch((e) => setError(e.message)); }
  useEffect(load, [business.id]);

  async function setStatus(b, status) {
    try { await api.updateBookingStatus(b.id, status); load(); } catch (e) { setError(e.message); }
  }

  return (
    <div>
      <h2>Bookings for {business.name}</h2>
      {error && <div className="alert alert-error">{error}</div>}
      {bookings.length === 0 && <p>No bookings yet.</p>}
      <table className="data-table">
        <thead><tr><th>Customer</th><th>Service</th><th>When</th><th>Status</th><th>Paid</th><th></th></tr></thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>{b.customer?.name}</td>
              <td>{b.service?.name}</td>
              <td>{new Date(b.scheduledAt).toLocaleString()}</td>
              <td><span className={`pill pill-${b.status.toLowerCase()}`}>{b.status}</span></td>
              <td>{b.payment?.status === "PAID" ? "✓" : "—"}</td>
              <td style={{ display: "flex", gap: 6 }}>
                {b.status === "PENDING" && <>
                  <button className="btn btn-primary btn-sm" onClick={() => setStatus(b, "CONFIRMED")}>Confirm</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setStatus(b, "DECLINED")}>Decline</button>
                </>}
                {b.status === "CONFIRMED" && <button className="btn btn-outline btn-sm" onClick={() => setStatus(b, "COMPLETED")}>Mark complete</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ServicesPanel({ business, onChange }) {
  const [services, setServices] = useState(business.services || []);
  const [form, setForm] = useState({ name: "", description: "", priceCents: "", durationMinutes: 60 });
  const [error, setError] = useState("");

  function load() { api.servicesForBusiness(business.id).then(setServices); }
  useEffect(load, [business.id]);

  async function addService(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createService({ businessId: business.id, name: form.name, description: form.description, priceCents: Math.round(Number(form.priceCents) * 100), durationMinutes: Number(form.durationMinutes) });
      setForm({ name: "", description: "", priceCents: "", durationMinutes: 60 });
      load();
    } catch (e) { setError(e.message); }
  }

  async function removeService(id) {
    await api.deleteService(id);
    load();
  }

  return (
    <div>
      <h2>Services</h2>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="grid grid-2">
        {services.map((s) => (
          <div className="card" key={s.id}>
            <h3 style={{ marginBottom: 4 }}>{s.name}</h3>
            <p style={{ margin: 0 }}>{s.description}</p>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <strong>{formatMoney(s.priceCents)}</strong>
              <span className="hint">{s.durationMinutes} min</span>
            </div>
            <button className="btn btn-danger btn-sm" style={{ marginTop: 10 }} onClick={() => removeService(s.id)}>Remove</button>
          </div>
        ))}
      </div>

      <div className="card" style={{ maxWidth: 420, marginTop: 20 }}>
        <h3>Add a service</h3>
        <form onSubmit={addService}>
          <div className="field"><label>Name</label><input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div className="field"><label>Description</label><input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
          <div className="grid grid-2">
            <div className="field"><label>Price (USD)</label><input required type="number" step="0.01" value={form.priceCents} onChange={(e) => setForm((f) => ({ ...f, priceCents: e.target.value }))} /></div>
            <div className="field"><label>Duration (min)</label><input required type="number" value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} /></div>
          </div>
          <button className="btn btn-primary btn-block">Add service</button>
        </form>
      </div>
    </div>
  );
}

function EmployeesPanel({ business, onChange }) {
  const [employees, setEmployees] = useState(business.employees || []);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function add(e) {
    e.preventDefault();
    setError("");
    try {
      await api.addEmployee(business.id, { userId, title });
      setNote("Employee added.");
      setUserId(""); setTitle("");
      onChange();
    } catch (e) { setError(e.message); }
  }

  return (
    <div>
      <h2>Team</h2>
      {error && <div className="alert alert-error">{error}</div>}
      {note && <div className="alert alert-success">{note}</div>}
      <table className="data-table">
        <thead><tr><th>Name</th><th>Title</th><th>Status</th></tr></thead>
        <tbody>
          {(business.employees || []).map((e) => (
            <tr key={e.id}><td>{e.user?.name}</td><td>{e.title}</td><td>{e.active ? "Active" : "Removed"}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="card" style={{ maxWidth: 420, marginTop: 20 }}>
        <h3>Add an employee</h3>
        <p className="hint">The person must already have a Nearby account (any role). Ask for their account's user ID, shown on their profile — or have them register first.</p>
        <form onSubmit={add}>
          <div className="field"><label>User ID</label><input required value={userId} onChange={(e) => setUserId(e.target.value)} /></div>
          <div className="field"><label>Title</label><input placeholder="e.g. Senior Stylist" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <button className="btn btn-primary btn-block">Add to team</button>
        </form>
      </div>
    </div>
  );
}

function MessagesPanel({ business }) {
  const [threads, setThreads] = useState([]);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => { api.businessThreads(business.id).then(setThreads); }, [business.id]);

  function openThread(customerId) {
    setActiveCustomer(customerId);
    api.getThread(business.id, customerId).then(setMessages);
  }

  async function send() {
    if (!text.trim()) return;
    const msg = await api.sendMessage(business.id, { content: text, customerId: activeCustomer });
    setMessages((m) => [...m, msg]);
    setText("");
  }

  return (
    <div>
      <h2>Messages</h2>
      <div className="grid grid-2">
        <div className="card">
          <h3>Conversations</h3>
          {threads.length === 0 && <p className="hint">No messages yet.</p>}
          {threads.map((t) => (
            <button key={t.customerId} className="dash-nav" style={{ display: "block", width: "100%", textAlign: "left", padding: 10, borderRadius: 8, background: activeCustomer === t.customerId ? "var(--paper-2)" : "transparent", border: "none", cursor: "pointer" }} onClick={() => openThread(t.customerId)}>
              <div style={{ fontWeight: 600 }}>{t.customerId.slice(0, 8)}…</div>
              <div className="hint">{t.lastMessage}</div>
            </button>
          ))}
        </div>
        <div className="card">
          <h3>Thread</h3>
          {!activeCustomer && <p className="hint">Select a conversation to view it.</p>}
          {activeCustomer && (
            <>
              <div className="msg-thread">
                {messages.map((m) => (
                  <div key={m.id} className={`msg-bubble ${m.senderId !== activeCustomer ? "mine" : "theirs"}`}>
                    {m.content}
                    <div className="msg-time">{new Date(m.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Reply…" />
                <button className="btn btn-outline" onClick={send}>Send</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewsPanel({ business }) {
  const [reviews, setReviews] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});

  function load() { api.businessReviews(business.id).then(setReviews); }
  useEffect(load, [business.id]);

  async function reply(r) {
    await api.replyToReview(r.id, replyDrafts[r.id] || "");
    load();
  }

  return (
    <div>
      <h2>Reviews</h2>
      {reviews.length === 0 && <p>No reviews yet.</p>}
      {reviews.map((r) => (
        <div className="card" key={r.id} style={{ marginBottom: 12 }}>
          <StarDisplay rating={r.rating} />
          <p>{r.comment}</p>
          <span className="hint">— {r.customer?.name}</span>
          {r.ownerReply ? (
            <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: "2px solid var(--amber)" }}>
              <strong style={{ fontSize: "0.85rem" }}>Your reply:</strong>
              <p style={{ margin: 0 }}>{r.ownerReply}</p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input placeholder="Write a public reply…" value={replyDrafts[r.id] || ""} onChange={(e) => setReplyDrafts((d) => ({ ...d, [r.id]: e.target.value }))} />
              <button className="btn btn-outline btn-sm" onClick={() => reply(r)}>Reply</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SettingsPanel({ business, onChange }) {
  const [form, setForm] = useState({ name: business.name, description: business.description || "", city: business.city || "", address: business.address || "", phone: business.phone || "" });
  const [attrs, setAttrs] = useState(business.attributes || {});
  const [saved, setSaved] = useState(false);

  async function save(e) {
    e.preventDefault();
    await api.updateBusiness(business.id, { ...form, attributes: attrs });
    setSaved(true);
    onChange();
  }

  const schema = business.category?.attributeSchema || [];

  return (
    <div>
      <h2>Business settings</h2>
      {saved && <div className="alert alert-success">Saved.</div>}
      <form onSubmit={save} className="card" style={{ maxWidth: 480 }}>
        <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
        <div className="field"><label>Description</label><textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
        <div className="grid grid-2">
          <div className="field"><label>City</label><input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></div>
          <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
        </div>
        <div className="field"><label>Address</label><input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>

        {schema.length > 0 && <h3>Category details ({business.category.name})</h3>}
        {schema.map((field) => (
          <div className="field" key={field.key}>
            <label>{field.label}</label>
            {field.type === "boolean" ? (
              <div className="checkbox-row">
                <input type="checkbox" checked={!!attrs[field.key]} onChange={(e) => setAttrs((a) => ({ ...a, [field.key]: e.target.checked }))} />
                <span className="hint">Yes</span>
              </div>
            ) : (
              <input
                type={field.type === "number" ? "number" : "text"}
                value={attrs[field.key] || ""}
                onChange={(e) => setAttrs((a) => ({ ...a, [field.key]: e.target.value }))}
              />
            )}
          </div>
        ))}
        <button className="btn btn-primary btn-block">Save changes</button>
      </form>
    </div>
  );
}
