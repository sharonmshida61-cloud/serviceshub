import { useEffect, useState } from "react";
import { api, formatMoney } from "../api";
import { StarDisplay } from "../components/StarRating.jsx";
import MediaUpload from "../components/MediaUpload.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const TABS = ["Bookings", "Services", "Employees", "Messages", "Reviews", "Settings"];

// Tabs that require the business to be APPROVED before they're usable
const APPROVAL_GATED_TABS = ["Services", "Employees"];

export default function BusinessOwnerDashboard() {
  const { user } = useAuth();
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

  // --- Pending-approval screen shown right after registration ---
  // Triggered when the owner has no businesses yet and hasn't opened the
  // new-listing form. They see a clear explanation instead of a blank page.
  const justRegistered = businesses.length === 0 && !showNewBiz;

  return (
    <div className="container page">
      <h1>Business dashboard</h1>
      {error && <div className="alert alert-error">{error}</div>}

      {justRegistered && (
        <div className="card" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center", padding: "40px 32px" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🏪</div>
          <h2 style={{ marginBottom: 8 }}>Welcome, {user?.name || "there"}!</h2>
          <p style={{ color: "var(--ink-2)", marginBottom: 24 }}>
            You're registered as a business owner. Create your first listing and submit it for review.
            Once an admin approves it, it will be visible to customers and you can start accepting bookings.
          </p>
          <div className="card" style={{ background: "var(--paper-2)", marginBottom: 24, textAlign: "left", padding: "16px 20px" }}>
            <strong>How it works:</strong>
            <ol style={{ margin: "8px 0 0 0", paddingLeft: 20, color: "var(--ink-2)", lineHeight: 1.8 }}>
              <li>Submit your business listing below</li>
              <li>An admin reviews it (usually within 24 hours)</li>
              <li>Once approved, your listing goes live and you can add services, manage bookings, and more</li>
            </ol>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNewBiz(true)}>
            Create your listing
          </button>
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
                  <button
                    key={t}
                    className={tab === t ? "active" : ""}
                    onClick={() => setTab(t)}
                    disabled={active.status !== "APPROVED" && APPROVAL_GATED_TABS.includes(t)}
                    title={active.status !== "APPROVED" && APPROVAL_GATED_TABS.includes(t) ? "Available after admin approval" : undefined}
                    style={active.status !== "APPROVED" && APPROVAL_GATED_TABS.includes(t) ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div>
                {active.status === "PENDING" && (
                  <div className="alert" style={{ background: "var(--amber-light, #fef9c3)", borderLeft: "4px solid var(--amber, #f59e0b)", color: "#92400e", marginBottom: 20 }}>
                    <strong>Awaiting admin approval</strong> — your listing has been submitted and is under review.
                    You'll be able to add services, manage employees, and accept bookings once it's approved.
                    No action needed on your end.
                  </div>
                )}
                {active.status === "REJECTED" && (
                  <div className="alert alert-error" style={{ marginBottom: 20 }}>
                    <strong>Listing rejected</strong> — this listing was not approved. Please contact support or edit your listing details and resubmit.
                  </div>
                )}
                {active.status === "SUSPENDED" && (
                  <div className="alert alert-error" style={{ marginBottom: 20 }}>
                    <strong>Listing suspended</strong> — this listing has been suspended by an admin. Please contact support.
                  </div>
                )}
                {tab === "Bookings" && <BookingsPanel business={active} />}
                {tab === "Services" && (active.status === "APPROVED"
                  ? <ServicesPanel business={active} onChange={load} />
                  : <ApprovalRequired />
                )}
                {tab === "Employees" && (active.status === "APPROVED"
                  ? <EmployeesPanel business={active} onChange={load} />
                  : <ApprovalRequired />
                )}
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

function ApprovalRequired() {
  return (
    <div className="card" style={{ textAlign: "center", padding: "48px 32px", maxWidth: 480 }}>
      <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>⏳</div>
      <h3>Pending admin approval</h3>
      <p style={{ color: "var(--ink-2)" }}>
        This section will be available once an admin approves your listing.
        We'll notify you as soon as it's reviewed.
      </p>
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
  const [settingsTab, setSettingsTab] = useState("general"); // "general" or "media"
  const [mediaItems, setMediaItems] = useState([]);
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);

  useEffect(() => {
    if (settingsTab === "media") {
      setMediaLoading(true);
      api.enhancedPortfolio(business.id)
        .then(setMediaItems)
        .catch(() => setMediaItems([]))
        .finally(() => setMediaLoading(false));
    }
  }, [settingsTab, business.id]);

  async function save(e) {
    e.preventDefault();
    await api.updateBusiness(business.id, { ...form, attributes: attrs });
    setSaved(true);
    onChange();
  }

  async function deleteMediaItem(id) {
    if (confirm("Delete this media item?")) {
      try {
        await api.deleteEnhancedPortfolio(id);
        setMediaItems((items) => items.filter((item) => item.id !== id));
      } catch (e) {
        alert(`Failed to delete: ${e.message}`);
      }
    }
  }

  const schema = Array.isArray(business.category?.attributeSchema) ? business.category.attributeSchema : [];

  return (
    <div>
      <h2>Business settings</h2>
      
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${settingsTab === "general" ? "active" : ""}`} onClick={() => setSettingsTab("general")}>
          General
        </button>
        <button className={`tab ${settingsTab === "media" ? "active" : ""}`} onClick={() => setSettingsTab("media")}>
          Photos & Videos
        </button>
      </div>

      {/* General Settings Tab */}
      {settingsTab === "general" && (
        <>
          {saved && <div className="alert alert-success">Saved.</div>}
          <form onSubmit={save} className="card" style={{ maxWidth: 480 }}>
            <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="field"><label>Description</label><textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-2">
              <div className="field"><label>City</label><input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></div>
              <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="field"><label>Address</label><input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>

            {schema && schema.length > 0 && <h3>Category details ({business.category.name})</h3>}
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
        </>
      )}

      {/* Media Management Tab */}
      {settingsTab === "media" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <p style={{ margin: 0, color: "var(--ink-2)" }}>Upload photos and videos to showcase your work to customers</p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowMediaForm(!showMediaForm)}>
              {showMediaForm ? "Cancel" : "+ Upload"}
            </button>
          </div>

          {showMediaForm && (
            <div style={{ marginBottom: "32px" }}>
              <MediaUpload businessId={business.id} onUploadComplete={() => { setShowMediaForm(false); onChange(); }} onCancel={() => setShowMediaForm(false)} />
            </div>
          )}

          {mediaLoading && <p>Loading media…</p>}

          {!mediaLoading && mediaItems.length === 0 && !showMediaForm && (
            <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
              <p style={{ color: "var(--ink-2)", marginBottom: "16px" }}>No media uploaded yet.</p>
              <p style={{ color: "var(--ink-2)", fontSize: "0.9rem", marginBottom: "20px" }}>
                Photos and videos help customers see your work before booking. Start by uploading some!
              </p>
              <button className="btn btn-primary" onClick={() => setShowMediaForm(true)}>
                Upload Your First Photo
              </button>
            </div>
          )}

          {!mediaLoading && mediaItems.length > 0 && (
            <div className="grid grid-3">
              {mediaItems.map((item) => (
                <div key={item.id} className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ position: "relative", paddingBottom: "66.67%", backgroundColor: "var(--paper-2)", overflow: "hidden" }}>
                    {item.type === "VIDEO" ? (
                      <img
                        src={item.thumbnailUrl || "https://via.placeholder.com/300x200?text=Video"}
                        alt={item.title}
                        style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <img
                        src={item.mediaUrl}
                        alt={item.title}
                        style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                    <span style={{
                      position: "absolute",
                      top: "8px",
                      left: "8px",
                      padding: "4px 8px",
                      background: item.type === "VIDEO" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.5)",
                      color: "white",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                    }}>
                      {item.type === "VIDEO" ? "🎥 Video" : item.type === "CERTIFICATE" ? "📜 Certificate" : item.type === "LICENSE" ? "✅ License" : item.type === "PROJECT" ? "🏗️ Project" : "📸 Photo"}
                    </span>
                    {item.verified && (
                      <span style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        padding: "4px 8px",
                        background: "#10b981",
                        color: "white",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                      }}>
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  <div style={{ padding: "12px", flex: 1, display: "flex", flexDirection: "column" }}>
                    {item.title && <h4 style={{ margin: "0 0 4px 0", fontSize: "0.95rem" }}>{item.title}</h4>}
                    {item.description && <p style={{ margin: "0 0 8px 0", fontSize: "0.85rem", color: "var(--ink-2)", flex: 1 }}>{item.description}</p>}
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteMediaItem(item.id)}
                      style={{ alignSelf: "flex-start" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
