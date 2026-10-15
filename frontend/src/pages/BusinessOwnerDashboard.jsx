import { Fragment, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import { StarDisplay } from "../components/StarRating.jsx";
import MediaUpload from "../components/MediaUpload.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import DashboardShell from "../components/DashboardShell.jsx";
import Icon from "../components/Icon.jsx";
import { buckets, ChartPanel, DonutPanel, SERIES, StatCard, sumByBucket } from "../components/DashboardPanels.jsx";
import { SettingsPanel as AccountSettingsPanel } from "./Settings.jsx";
import LocationPicker from "../components/LocationPicker.jsx";
import CitySelect from "../components/CitySelect.jsx";
import useCities from "../hooks/useCities.js";
import ProfileCard from "../components/ProfileCard.jsx";
import ProviderInbox from "../components/ProviderInbox.jsx";
import TeamAvatar, { displayName, memberPhone, memberEmail } from "../components/TeamAvatar.jsx";
import { STAFF_ROLES, roleChoices, roleGrants } from "../utils/staffAccess.js";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", group: "Overview", subtitle: "Live overview of today's activity at your business." },
  { key: "mybusiness", label: "My Business", icon: "store", group: "Listing", subtitle: "Details, photos and the address customers see." },
  { key: "services", label: "My Services", icon: "tag", subtitle: "What you offer, at what price." },
  { key: "bookings", label: "Bookings", icon: "calendar", group: "Operations", subtitle: "Requests, confirmations and completed jobs." },
  { key: "team", label: "Team", icon: "team", subtitle: "Who works on this listing, and what each of their roles opens." },
  { key: "customers", label: "Customers", icon: "users", subtitle: "Everyone who has booked with you." },
  { key: "messages", label: "Messages", icon: "chat", subtitle: "Chats with the customers who message your listing." },
  { key: "reviews", label: "Reviews", icon: "star", subtitle: "Ratings left after a completed booking." },
  { key: "earnings", label: "Earnings", icon: "wallet", group: "Finance", subtitle: "Collected and outstanding payment." },
  { key: "analytics", label: "Analytics", icon: "chart", subtitle: "How the listing is performing." },
  { key: "notifications", label: "Notifications", icon: "bell", group: "Account", subtitle: "Activity worth acting on." },
  { key: "profile", label: "Profile", icon: "idcard", subtitle: "Your sign-in details, name and profile picture." },
  { key: "settings", label: "Settings", icon: "settings", subtitle: "Password and preferences." },
];

export default function BusinessOwnerDashboard() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [section, setSection] = useState("dashboard");
  const [error, setError] = useState("");
  const [showNewBiz, setShowNewBiz] = useState(false);
  const [categories, setCategories] = useState([]);

  function load() {
    api.myBusinesses().then((list) => {
      setError("");
      setBusinesses(list);
      // Keep the selected listing only while this account still owns it.
      setActiveId((current) => (list.some((b) => b.id === current) ? current : list[0]?.id || null));
    }).catch((e) => setError(e.message));
  }

  // The listings belong to the signed-in account, so a session that becomes
  // someone else's mid-page has to drop the ids it was showing: sending one of
  // those with the new sign-in is what answered "you are not the owner".
  useEffect(() => {
    if (!user?.id) return;
    setBusinesses([]);
    setActiveId(null);
    load();
  }, [user?.id]);
  useEffect(() => { api.categories().then(setCategories); }, []);

  const active = businesses.find((b) => b.id === activeId);

  // --- Pending-approval screen shown right after registration ---
  const justRegistered = businesses.length === 0 && !showNewBiz;

  // Settings and Profile describe the owner, not a listing, so they skip the
  // listing switcher and the review-status banners.
  const accountSection = section === "settings" || section === "profile";

  return (
    <DashboardShell accent="owner" navItems={NAV} active={section} onNav={setSection}
      context={{ label: "Listing", value: active?.name || "None yet", icon: "store" }}
      searchPlaceholder="Search bookings, customers, services…"
      onSearch={() => setSection("bookings")}
    >
      {error && <div className="alert alert-error">{error}</div>}

      {section === "settings" && <AccountSettingsPanel embed />}

      {section === "profile" && <ProfileCard user={user} />}

      {!accountSection && justRegistered && (
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
          onCreated={(b) => { setBusinesses((prev) => [...prev, b]); setActiveId(b.id); setShowNewBiz(false); setSection("dashboard"); }}
          onCancel={() => setShowNewBiz(false)}
        />
      )}

      {businesses.length > 0 && active && (
        <>
          {!accountSection && (businesses.length > 1 || section !== "dashboard") && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 22 }}>
            {businesses.length > 1 && businesses.map((b) => (
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
          )}

          {!accountSection && active.status === "PENDING" && (
            <div className="alert" style={{ background: "var(--amber-light)", borderLeft: "4px solid var(--amber, #f59e0b)", color: "#ffc978", marginBottom: 20 }}>
              <strong>Awaiting admin approval</strong> — your listing has been submitted and is under review.
              You'll be able to add services, manage employees, and accept bookings once it's approved.
              No action needed on your end.
            </div>
          )}
          {!accountSection && active.status === "REJECTED" && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <strong>Listing rejected</strong> — this listing was not approved. Please contact support or edit your listing details and resubmit.
            </div>
          )}
          {!accountSection && active.status === "SUSPENDED" && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <strong>Listing suspended</strong> — this listing has been suspended by an admin. Please contact support.
            </div>
          )}

          {section === "dashboard" && <Overview business={active} onNavigate={setSection} />}
          {section === "bookings" && <BookingsPanel business={active} />}
          {section === "team" && (active.status === "APPROVED"
            ? <EmployeesPanel business={active} onChange={load} />
            : <ApprovalRequired />
          )}
          {section === "customers" && <CustomersPanel business={active} onStatusChange={load} />}
          {section === "messages" && <ProviderInbox business={active} />}
          {section === "services" && (active.status === "APPROVED"
            ? <ServicesPanel business={active} onChange={load} />
            : <ApprovalRequired />
          )}
          {section === "mybusiness" && <MyBusinessSection business={active} onChange={load} />}
          {section === "reviews" && <ReviewsPanel business={active} />}
          {section === "earnings" && <EarningsPanel business={active} />}
          {section === "analytics" && <AnalyticsPanel business={active} />}
          {section === "notifications" && <OwnerNotifications />}
        </>
      )}
    </DashboardShell>
  );
}

function initials(name) {
  return (name || "?").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function timeAgo(d) {
  const days = Math.floor((Date.now() - new Date(d)) / 864e5);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return new Date(d).toLocaleDateString();
}

function Overview({ business, onNavigate }) {
  const [data, setData] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [range, setRange] = useState("Monthly");

  useEffect(() => {
    setData(null);
    Promise.all([
      api.businessBookings(business.id).catch(() => []),
      api.businessCustomers(business.id).catch(() => []),
      api.servicesForBusiness(business.id).catch(() => []),
      api.businessReviews(business.id).catch(() => []),
    ]).then(([bookings, customers, services, reviews]) => setData({ bookings, customers, services, reviews }));
    api.enhancedPortfolio(business.id)
      .then((items) => {
        const p = items.find((i) => i.type === "PHOTO" && i.mediaUrl) || items.find((i) => i.mediaUrl);
        if (p) { setPhoto(p.thumbnailUrl || p.mediaUrl); return; }
        return api.portfolioItems(business.id).then((ps) => {
          if (ps[0]?.imageUrl) setPhoto(ps[0].imageUrl);
        });
      })
      .catch(() => {});
  }, [business.id]);

  if (!data) return <p>Loading…</p>;
  const { bookings, customers, services, reviews } = data;

  const now = new Date();
  const sameDay = (d, ref) => new Date(d).toDateString() === ref.toDateString();
  const todays = bookings.filter((b) => sameDay(b.scheduledAt, now)).length;
  const pending = bookings.filter((b) => b.status === "PENDING").length;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const newCustomers = customers.filter((c) => new Date(c.customer?.createdAt) >= monthStart).length;
  const revenueThisMonth = bookings
    .filter((b) => b.payment?.status === "PAID" && new Date(b.createdAt) >= monthStart)
    .reduce((s, b) => s + (b.payment?.amountCents || b.priceCents || 0), 0);

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const displayRating = business.avgRating ?? Number(avgRating.toFixed(1));
  const reviewCount = business.reviewCount ?? reviews.length;

  const upcoming = bookings
    .filter((b) => ["PENDING", "CONFIRMED"].includes(b.status) && new Date(b.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 5);

  const bs = buckets(range);
  const paid = (b) => b.payment?.status === "PAID";
  const collected = (b) => b.payment?.amountCents || b.priceCents || 0;
  const expected = (b) => b.priceCents || 0;
  const byStatus = (s) => bookings.filter((b) => b.status === s).length;

  return (
    <div>
      <div className="stat-grid">
        <StatCard icon="calendar" color="blue" label="Today's Bookings" value={todays} foot="Scheduled" footColor="blue" />
        <StatCard icon="inbox" color="red" label="Pending Requests" value={pending} foot="Needs a reply" footColor="red" />
        <StatCard icon="users" color="green" label="Total Customers" value={customers.length} foot={`${newCustomers} new this month`} footColor="green" />
        <StatCard icon="tag" color="purple" label="My Services" value={services.length} foot="Published" footColor="purple" />
        <StatCard icon="star" color="amber" label="Average Rating" value={displayRating} foot={`${reviewCount} reviews`} footColor="amber" />
        <StatCard icon="wallet" color="teal" label="Revenue This Month" value={formatMoney(revenueThisMonth)} foot="Collected" footColor="teal" />
      </div>

      <div className="dash-2col">
        <ChartPanel
          title="Revenue overview"
          icon="chart"
          ranges={["Daily", "Weekly", "Monthly", "Yearly"]}
          range={range}
          onRange={setRange}
          labels={bs.map((b) => b.label)}
          series={[
            { name: "Collected", color: SERIES.green, points: sumByBucket(bookings, bs, collected, paid) },
            { name: "Expected", color: SERIES.amber, points: sumByBucket(bookings, bs, expected, (b) => !paid(b) && b.status !== "CANCELLED") },
          ]}
          emptyTitle="No revenue activity for this period."
          emptyText="Bookings will appear here as customers reserve your services."
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
              <h3><Icon name="calendar" size={17} />Upcoming bookings</h3>
              <button className="linklike" onClick={() => onNavigate("bookings")}>View all</button>
            </div>
            <div className="panel-body flush">
              {upcoming.length === 0 && <p style={{ padding: "16px 20px", margin: 0 }}>No upcoming bookings.</p>}
              {upcoming.length > 0 && (
                <table className="data-table">
                  <thead><tr><th>Customer</th><th>Service</th><th>Date & Time</th><th>Status</th></tr></thead>
                  <tbody>
                    {upcoming.map((b) => (
                      <tr key={b.id}>
                        <td>{b.customer?.name}</td>
                        <td>{b.service?.name}</td>
                        <td>{new Date(b.scheduledAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
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
              <h3><Icon name="star" size={17} />Recent reviews</h3>
              <button className="linklike" onClick={() => onNavigate("reviews")}>View all</button>
            </div>
            <div className="panel-body">
              {reviews.length === 0 && <p style={{ margin: 0 }}>No reviews yet.</p>}
              {reviews.slice(0, 3).map((r) => (
                <div className="review-row" key={r.id}>
                  <span className="rr-avatar">{initials(r.customer?.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="rr-head">
                      <strong>{r.customer?.name || "Customer"}</strong>
                      <span className="hint">{timeAgo(r.createdAt)}</span>
                    </div>
                    <StarDisplay rating={r.rating} />
                    {r.comment && <div className="activity-sub" style={{ marginTop: 2 }}>{r.comment}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div>
          <div className="panel biz-card-panel">
            <div
              className="biz-photo"
              style={photo ? { backgroundImage: `url(${photo})` } : { background: "linear-gradient(135deg, #0b4436, #0f9d6c)" }}
            />
            <div className="panel-body">
              <div className="biz-card-head">
                <div>
                  <div className="biz-name">{business.name}</div>
                  <div className="hint">{business.category?.name}{business.city ? ` · ${business.city}` : ""}</div>
                </div>
                <span className={`pill pill-${business.status.toLowerCase()}`}>{business.status === "APPROVED" ? "Active" : business.status}</span>
              </div>
              <div className="biz-rating">
                <StarDisplay rating={Number(displayRating)} />
                <span className="hint">{displayRating} ({reviewCount} reviews)</span>
              </div>
              <div className="btn-row" style={{ marginTop: 14 }}>
                <button className="btn btn-outline btn-sm" onClick={() => onNavigate("mybusiness")}>Edit Business</button>
                <Link to={`/business/${business.id}`} className="btn btn-outline btn-sm">View Public Page</Link>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h3><Icon name="grid" size={17} />Quick actions</h3></div>
            <div className="panel-body">
              <div className="qa-grid">
                <button className="qa-tile" onClick={() => onNavigate("services")}>
                  <span className="activity-icon tint-blue"><Icon name="tag" size={18} /></span>
                  Add Service
                </button>
                <button className="qa-tile" onClick={() => onNavigate("bookings")}>
                  <span className="activity-icon tint-green"><Icon name="calendar" size={18} /></span>
                  Manage Bookings
                </button>
                <button className="qa-tile" onClick={() => onNavigate("customers")}>
                  <span className="activity-icon tint-purple"><Icon name="users" size={18} /></span>
                  View Customers
                </button>
                <button className="qa-tile" onClick={() => onNavigate("reviews")}>
                  <span className="activity-icon tint-amber"><Icon name="star" size={18} /></span>
                  View Reviews
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MyBusinessSection({ business, onChange }) {
  const [tab, setTab] = useState("details");
  const TABS = [["details", "Details"], ["media", "Photos & Videos"]];
  return (
    <div>
      <div className="tabs">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" className={tab === k ? "tab active" : "tab"} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === "details" && <ListingDetailsPanel business={business} onChange={onChange} />}
      {tab === "media" && <MediaPanel business={business} />}
    </div>
  );
}

function EarningsPanel({ business }) {
  const [bookings, setBookings] = useState(null);
  useEffect(() => {
    api.businessBookings(business.id).then(setBookings).catch(() => setBookings([]));
  }, [business.id]);
  if (!bookings) return <p>Loading…</p>;

  const paid = bookings.filter((b) => b.payment?.status === "PAID");
  const amountOf = (b) => b.payment?.amountCents || b.priceCents || 0;
  const total = paid.reduce((s, b) => s + amountOf(b), 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const paidThisMonth = paid.filter((b) => new Date(b.scheduledAt) >= monthStart);
  const thisMonth = paidThisMonth.reduce((s, b) => s + amountOf(b), 0);
  const paidShare = bookings.length ? Math.round((paid.length / bookings.length) * 100) : 0;

  return (
    <div>
      <div className="stat-grid">
        <StatCard icon="wallet" color="green" label="Total Earnings" value={formatMoney(total)} foot="Since launch" footColor="green" />
        <StatCard icon="chart" color="blue" label="This Month" value={formatMoney(thisMonth)} foot={`${paidThisMonth.length} paid`} />
        <StatCard icon="calendar" color="purple" label="Paid Bookings" value={paid.length} foot={`${paidShare}% of bookings`} footColor="purple" />
      </div>
      <div className="panel">
        <div className="panel-head"><h3>Payments</h3></div>
        <div className="panel-body flush">
          {paid.length === 0 && <p style={{ padding: "16px 20px", margin: 0 }}>No payments yet.</p>}
          {paid.length > 0 && (
            <table className="data-table" style={{ margin: 0 }}>
              <thead><tr><th>Customer</th><th>Service</th><th>Amount</th><th>Date</th><th>Method</th></tr></thead>
              <tbody>
                {paid.slice(0, 20).map((b) => (
                  <tr key={b.id}>
                    <td>{b.customer?.name}</td>
                    <td>{b.service?.name}</td>
                    <td>{formatMoney(amountOf(b))}</td>
                    <td>{new Date(b.payment?.paidAt || b.scheduledAt).toLocaleDateString()}</td>
                    <td>{b.payment?.method || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsPanel({ business }) {
  const [bookings, setBookings] = useState(null);
  const [customers, setCustomers] = useState([]);
  useEffect(() => {
    api.businessBookings(business.id).then(setBookings).catch(() => setBookings([]));
    api.businessCustomers(business.id).then(setCustomers).catch(() => {});
  }, [business.id]);
  if (!bookings) return <p>Loading…</p>;

  const STATUSES = ["CONFIRMED", "PENDING", "COMPLETED", "DECLINED", "CANCELLED"];
  const byStatus = STATUSES.map((s) => ({ s, n: bookings.filter((b) => b.status === s).length }));
  const maxS = Math.max(...byStatus.map((x) => x.n), 1);
  const byService = {};
  bookings.forEach((b) => {
    const k = b.service?.name || "Other";
    byService[k] = (byService[k] || 0) + 1;
  });
  const top = Object.entries(byService).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxT = top.length ? top[0][1] : 1;
  const completed = bookings.filter((b) => b.status === "COMPLETED").length;
  const completion = bookings.length ? `${Math.round((completed / bookings.length) * 100)}%` : "—";
  const repeat = customers.filter((c) => (c.bookings || []).length > 1).length;

  return (
    <div>
      <div className="stat-grid">
        <StatCard icon="calendar" color="blue" label="Total Bookings" value={bookings.length} foot="All time" />
        <StatCard icon="clipboard" color="teal" label="Completion Rate" value={completion} foot={`${completed} completed`} footColor="teal" />
        <StatCard icon="users" color="green" label="Total Customers" value={customers.length} foot="Booked with you" footColor="green" />
        <StatCard icon="heart" color="purple" label="Repeat Customers" value={repeat} foot={customers.length ? `${Math.round((repeat / customers.length) * 100)}% of customers` : "None yet"} footColor="purple" />
      </div>
      <div className="grid grid-2">
        <div className="panel">
          <div className="panel-head"><h3>Bookings by Status</h3></div>
          <div className="panel-body">
            {byStatus.map(({ s, n }) => (
              <div className="hbar-row" key={s}>
                <span className="hbar-label">{s.charAt(0) + s.slice(1).toLowerCase()}</span>
                <span className="hbar-track"><span className="hbar" style={{ width: `${(n / maxS) * 100}%` }} /></span>
                <span className="hbar-n">{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Top Services</h3></div>
          <div className="panel-body">
            {top.length === 0 && <p style={{ margin: 0 }}>No bookings yet.</p>}
            {top.map(([name, n]) => (
              <div className="hbar-row" key={name}>
                <span className="hbar-label">{name}</span>
                <span className="hbar-track"><span className="hbar" style={{ width: `${(n / maxT) * 100}%` }} /></span>
                <span className="hbar-n">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OwnerNotifications() {
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
            <span className="activity-icon tint-green"><Icon name="bell" size={15} /></span>
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
  const cities = useCities();
  const [form, setForm] = useState({ name: "", description: "", categorySlug: "", city: "", address: "", phone: "", website: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]); // [{ file, objectUrl, type }]
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  function addFiles(fileList) {
    const next = [];
    for (const f of fileList) {
      if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) continue;
      next.push({ file: f, objectUrl: URL.createObjectURL(f), type: f.type.startsWith("video/") ? "VIDEO" : "PHOTO" });
    }
    if (next.length) setMediaFiles((p) => [...p, ...next]);
  }

  function removeFile(i) {
    setMediaFiles((p) => {
      URL.revokeObjectURL(p[i].objectUrl);
      return p.filter((_, idx) => idx !== i);
    });
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      // 1. Create the business listing
      const biz = await api.createBusiness(form);

      // 2. Upload any media files that were added
      if (mediaFiles.length > 0) {
        for (const item of mediaFiles) {
          try {
            const { url, type } = await api.uploadMedia(biz.id, item.file);
            await api.addEnhancedPortfolio({
              businessId: biz.id,
              type,
              title: "",
              description: "",
              mediaUrl: url,
            });
          } catch {
            // Non-fatal — listing is created, media can be added later from the Media tab
          }
        }
        mediaFiles.forEach((m) => URL.revokeObjectURL(m.objectUrl));
      }

      onCreated(biz);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const ACCEPTED = "image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,video/webm,video/quicktime";

  return (
    <div className="card" style={{ maxWidth: 560, marginBottom: 24 }}>
      <h3>List a new business</h3>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit}>
        {/* ---- Basic info ---- */}
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
          <textarea rows={3} placeholder="Tell customers what makes your business great…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="grid grid-2">
          <div className="field"><label>City</label><CitySelect cities={cities} value={form.city} onChange={(city) => setForm((f) => ({ ...f, city }))} placeholder="Select your city…" showCounts={false} /></div>
          <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
        </div>
        <div className="field"><label>Address</label><input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
        <div className="field">
          <label>Website (optional)</label>
          <input
            value={form.website}
            maxLength={200}
            placeholder="pipepro.co.ke"
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
          />
          <span className="hint">Customers open your site in a new tab from your listing page.</span>
        </div>

        <div className="field">
          <label>Pin your location</label>
          <LocationPicker
            value={form}
            name={form.name}
            onChange={(next) => setForm((f) => ({ ...f, latitude: next.latitude, longitude: next.longitude }))}
          />
        </div>

        {/* ---- Media upload ---- */}
        <div style={{ marginTop: 24, marginBottom: 8 }}>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
            📸 Photos & Videos <span style={{ fontWeight: 400, color: "var(--ink-2)", fontSize: "0.85rem" }}>(optional — helps with approval)</span>
          </label>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "var(--primary, #6366f1)" : "var(--line, #e5e7eb)"}`,
              borderRadius: 10,
              padding: "24px 16px",
              textAlign: "center",
              cursor: "pointer",
              background: dragging ? "var(--primary-light, #eef2ff)" : "var(--paper-2, #f9fafb)",
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: 6 }}>📷</div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>Drag & drop photos or videos here</p>
            <p style={{ margin: "4px 0 0", color: "var(--ink-2)", fontSize: "0.8rem" }}>
              or click to browse — JPG, PNG, WebP, MP4, WebM (max 50 MB each)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            style={{ display: "none" }}
            onChange={(e) => addFiles(e.target.files)}
          />

          {/* Preview grid */}
          {mediaFiles.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8, marginTop: 12 }}>
              {mediaFiles.map((m, i) => (
                <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: "#000" }}>
                  {m.type === "VIDEO" ? (
                    <video src={m.objectUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                  ) : (
                    <img src={m.objectUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                  {/* Type badge */}
                  <span style={{
                    position: "absolute", bottom: 4, left: 4,
                    background: "rgba(0,0,0,0.6)", color: "white",
                    fontSize: "0.65rem", padding: "2px 5px", borderRadius: 3,
                  }}>{m.type === "VIDEO" ? "🎥" : "📸"}</span>
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    style={{
                      position: "absolute", top: 4, right: 4,
                      background: "rgba(0,0,0,0.65)", color: "white",
                      border: "none", borderRadius: "50%",
                      width: 22, height: 22, cursor: "pointer",
                      fontSize: "0.75rem", lineHeight: 1, padding: 0,
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          {mediaFiles.length > 0 && (
            <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "var(--ink-2)" }}>
              {mediaFiles.length} file{mediaFiles.length !== 1 ? "s" : ""} selected — will be uploaded when you submit
            </p>
          )}
        </div>

        <div className="btn-row" style={{ marginTop: 20 }}>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create listing"}
          </button>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
        </div>
        <p className="hint" style={{ marginTop: 10 }}>New listings start as "Pending" until an admin approves them.</p>
      </form>
    </div>
  );
}

function CustomersPanel({ business, onStatusChange }) {
  const [entries, setEntries] = useState([]);   // [{ customer, bookings, totalSpentCents, ... }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null); // customer id whose bookings are expanded
  const [busy, setBusy] = useState(null); // booking id being updated

  function load() {
    setLoading(true);
    api.businessCustomers(business.id)
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, [business.id]);

  async function changeStatus(bookingId, status) {
    setBusy(bookingId);
    try {
      await api.updateBookingStatus(bookingId, status);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.customer.name.toLowerCase().includes(q) ||
      e.customer.email.toLowerCase().includes(q) ||
      (e.customer.phone || "").includes(q)
    );
  });

  const STATUS_COLOR = {
    PENDING:   { bg: "rgba(251, 133, 0, 0.16)", color: "#ffa62b" },
    CONFIRMED: { bg: "rgba(88, 166, 255, 0.16)", color: "#79b8ff" },
    COMPLETED: { bg: "rgba(45, 207, 143, 0.16)", color: "#3ddc8b" },
    DECLINED:  { bg: "rgba(255, 107, 107, 0.16)", color: "#ff8b8b" },
    CANCELLED: { bg: "rgba(142, 155, 176, 0.16)", color: "#8e9bb0" },
  };
  const NEUTRAL_CHIP = { bg: "rgba(142, 155, 176, 0.16)", color: "#8e9bb0" };

  function formatMins(mins) {
    if (!mins) return "";
    return mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}` : `${mins}m`;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <input
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
      {loading && <p>Loading customers…</p>}

      {!loading && filtered.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>👤</div>
          <h3>No customers yet</h3>
          <p style={{ color: "var(--ink-2)" }}>Customers will appear here once they book a service.</p>
        </div>
      )}

      {filtered.map(({ customer, bookings, totalSpentCents, paidCount, unpaidCount, completedCount, cancelledCount }) => {
        const isOpen = expanded === customer.id;
        const lastBooking = bookings[0];

        return (
          <div key={customer.id} className="card" style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>

            {/* ── Customer header row ── */}
            <div
              style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", cursor: "pointer", flexWrap: "wrap" }}
              onClick={() => setExpanded(isOpen ? null : customer.id)}
            >
              {/* Avatar initials */}
              <div style={{
                width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
                background: "var(--primary, #6366f1)", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "1.1rem",
              }}>
                {customer.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>

              {/* Name + contact */}
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
                  {customer.name}
                  {customer.bannedAt && (
                    <span style={{ fontSize: "0.7rem", background: "#ef4444", color: "white", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>BANNED</span>
                  )}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--ink-2)", marginTop: 2 }}>
                  {customer.email}
                  {customer.phone && <span style={{ marginLeft: 10 }}>📞 {customer.phone}</span>}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--ink-3, #9ca3af)", marginTop: 2 }}>
                  Member since {new Date(customer.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Stats pills */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div style={{ textAlign: "center", minWidth: 64 }}>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{bookings.length}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-2)" }}>bookings</div>
                </div>
                <div style={{ textAlign: "center", minWidth: 64 }}>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--good)" }}>
                    {totalSpentCents > 0 ? `$${(totalSpentCents / 100).toFixed(2)}` : "$0"}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-2)" }}>total spent</div>
                </div>
                <div style={{ textAlign: "center", minWidth: 64 }}>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: unpaidCount > 0 ? "var(--bad)" : "var(--ink-2)" }}>
                    {unpaidCount}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-2)" }}>unpaid</div>
                </div>
                <div style={{ textAlign: "center", minWidth: 64 }}>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{completedCount}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-2)" }}>completed</div>
                </div>
              </div>

              {/* Last booking snippet */}
              {lastBooking && (
                <div style={{ fontSize: "0.8rem", color: "var(--ink-2)", minWidth: 140, textAlign: "right" }}>
                  <div>Last: <strong>{lastBooking.service?.name}</strong></div>
                  <div>{new Date(lastBooking.scheduledAt).toLocaleDateString()}</div>
                  <span style={{
                    display: "inline-block", marginTop: 4, padding: "2px 8px",
                    borderRadius: 4, fontSize: "0.72rem", fontWeight: 600,
                    background: STATUS_COLOR[lastBooking.status]?.bg || NEUTRAL_CHIP.bg,
                    color: STATUS_COLOR[lastBooking.status]?.color || NEUTRAL_CHIP.color,
                  }}>{lastBooking.status}</span>
                </div>
              )}

              <div style={{ fontSize: "1.2rem", color: "var(--ink-2)", marginLeft: 4 }}>{isOpen ? "▲" : "▼"}</div>
            </div>

            {/* ── Expanded booking history ── */}
            {isOpen && (
              <div style={{ borderTop: "1px solid var(--line, #e5e7eb)" }}>
                <div style={{ padding: "12px 20px 6px", fontSize: "0.85rem", fontWeight: 600, color: "var(--ink-2)" }}>
                  Booking history ({bookings.length})
                </div>
                {bookings.map((b) => {
                  const paid = b.payment?.status === "PAID";
                  const payFailed = b.payment?.status === "FAILED";
                  const statusStyle = STATUS_COLOR[b.status] || NEUTRAL_CHIP;

                  return (
                    <div key={b.id} style={{
                      display: "flex", alignItems: "flex-start", gap: 16,
                      padding: "12px 20px", borderTop: "1px solid var(--line, #e5e7eb)",
                      flexWrap: "wrap",
                    }}>
                      {/* Date + service */}
                      <div style={{ minWidth: 160 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{b.service?.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--ink-2)", marginTop: 2 }}>
                          📅 {new Date(b.scheduledAt).toLocaleString()}
                        </div>
                        {b.service?.durationMinutes && (
                          <div style={{ fontSize: "0.78rem", color: "var(--ink-3, #9ca3af)" }}>
                            ⏱ {formatMins(b.service.durationMinutes)}
                          </div>
                        )}
                        {b.notes && (
                          <div style={{ fontSize: "0.78rem", color: "var(--ink-2)", marginTop: 4, fontStyle: "italic" }}>
                            "{b.notes}"
                          </div>
                        )}
                      </div>

                      {/* Price */}
                      <div style={{ minWidth: 80, textAlign: "center" }}>
                        <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                          ${((b.service?.priceCents || b.priceCents) / 100).toFixed(2)}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--ink-2)" }}>price</div>
                      </div>

                      {/* Payment status */}
                      <div style={{ minWidth: 100, textAlign: "center" }}>
                        <div style={{
                          display: "inline-block", padding: "4px 10px", borderRadius: 6,
                          fontWeight: 700, fontSize: "0.78rem",
                          background: paid ? "rgba(45, 207, 143, 0.16)" : payFailed ? "rgba(255, 107, 107, 0.16)" : "rgba(251, 133, 0, 0.16)",
                          color: paid ? "#3ddc8b" : payFailed ? "#ff8b8b" : "#ffa62b",
                        }}>
                          {paid ? "✓ PAID" : payFailed ? "✗ FAILED" : "⏳ UNPAID"}
                        </div>
                        {paid && b.payment?.method && (
                          <div style={{ fontSize: "0.72rem", color: "var(--ink-2)", marginTop: 3 }}>
                            via {b.payment.method}
                          </div>
                        )}
                        {paid && b.payment?.transactionRef && (
                          <div style={{ fontSize: "0.68rem", color: "var(--ink-3, #9ca3af)", marginTop: 2, fontFamily: "monospace" }}>
                            #{b.payment.transactionRef.slice(-8)}
                          </div>
                        )}
                      </div>

                      {/* Booking status badge */}
                      <div style={{ minWidth: 90, textAlign: "center" }}>
                        <span style={{
                          display: "inline-block", padding: "4px 10px", borderRadius: 6,
                          fontWeight: 700, fontSize: "0.78rem",
                          background: statusStyle.bg, color: statusStyle.color,
                        }}>
                          {b.status}
                        </span>
                      </div>

                      {/* Customer's review if any */}
                      {b.review && (
                        <div style={{ fontSize: "0.8rem", color: "var(--ink-2)", flex: 1, minWidth: 120 }}>
                          {"⭐".repeat(b.review.rating)} <em>"{b.review.comment}"</em>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginLeft: "auto" }}>
                        {b.status === "PENDING" && (
                          <>
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={busy === b.id}
                              onClick={() => changeStatus(b.id, "CONFIRMED")}
                            >
                              {busy === b.id ? "…" : "✓ Confirm"}
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={busy === b.id}
                              onClick={() => changeStatus(b.id, "DECLINED")}
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {b.status === "CONFIRMED" && (
                          <button
                            className="btn btn-sm"
                            style={{ background: "#10b981", color: "white", border: "none" }}
                            disabled={busy === b.id}
                            onClick={() => changeStatus(b.id, "COMPLETED")}
                          >
                            {busy === b.id ? "…" : "✓ Mark complete"}
                          </button>
                        )}
                        {(b.status === "COMPLETED" || b.status === "DECLINED" || b.status === "CANCELLED") && (
                          <span style={{ fontSize: "0.78rem", color: "var(--ink-3, #9ca3af)" }}>—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BookingsPanel({ business }) {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState("");
  const [busyId, setBusyId] = useState("");

  function load() { api.businessBookings(business.id).then(setBookings).catch((e) => setError(e.message)); }
  useEffect(() => { setPicking(""); load(); }, [business.id]);

  async function setStatus(b, status) {
    try { await api.updateBookingStatus(b.id, status); load(); } catch (e) { setError(e.message); }
  }

  // The same call a manager makes from their own board, so a job the owner puts
  // here lands on that teammate's dashboard under "Assigned to you".
  async function assign(b, value) {
    setError("");
    setBusyId(b.id);
    try {
      const updated = await api.assignBooking(b.id, value);
      setBookings((rows) => rows.map((x) => (x.id === b.id ? { ...x, ...updated } : x)));
      setPicking("");
    } catch (e) { setError(e.message); }
    finally { setBusyId(""); }
  }

  const team = (business.employees || []).filter((m) => m.active);
  // A job handed to someone who has since left the team still carries their name,
  // so keep naming them on that row even though they cannot take new work.
  function named(b) {
    return (business.employees || []).find((m) => m.id === b.employeeId);
  }

  const hasTeam = team.length > 0;

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}
      {bookings.length === 0 && <p>No bookings yet.</p>}
      {bookings.length > 0 && (
        <p className="hint" style={{ marginTop: 0, marginBottom: 10 }}>
          <strong>Assign</strong> puts a customer's job on that teammate's dashboard, where they can confirm and complete it.
        </p>
      )}
      <table className="data-table">
        <thead><tr><th>Customer</th><th>Service</th><th className="book-col-when">When</th><th>Assigned to</th><th>Status</th><th>Paid</th><th className="book-col-actions">Actions</th></tr></thead>
        <tbody>
          {bookings.map((b) => {
            const open = picking === b.id;
            const editable = ["PENDING", "CONFIRMED"].includes(b.status);
            const who = named(b);
            return (
              <Fragment key={b.id}>
                <tr>
                  <td>{b.customer?.name}</td>
                  <td>{b.service?.name}</td>
                  <td className="book-col-when">{jobWhen(b.scheduledAt)}</td>
                  <td>
                    {who ? (
                      <span className="assign-who">
                        <span className="assign-name">{displayName(who)}</span>
                        <span className="assign-role">{who.title}</span>
                      </span>
                    ) : <span className="assign-none">Unassigned</span>}
                  </td>
                  <td><span className={`pill pill-${b.status.toLowerCase()}`}>{b.status}</span></td>
                  <td>{b.payment?.status === "PAID" ? "✓" : "—"}</td>
                  <td className="book-col-actions">
                    <div className="book-actions">
                      {editable && (
                        <button
                          type="button"
                          className={`btn btn-sm ${who ? "btn-outline" : "btn-primary"}`}
                          disabled={!hasTeam || busyId === b.id}
                          title={hasTeam
                            ? "Choose which teammate takes this job."
                            : "Add people under Team before assigning work."}
                          onClick={() => setPicking(open ? "" : b.id)}
                        >
                          {busyId === b.id ? "…" : open ? "Close" : who ? "Change" : "Assign"}
                        </button>
                      )}
                      {b.status === "PENDING" && <>
                        <button className="btn btn-primary btn-sm" onClick={() => setStatus(b, "CONFIRMED")}>Confirm</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setStatus(b, "DECLINED")}>Decline</button>
                      </>}
                      {b.status === "CONFIRMED" && <button className="btn btn-outline btn-sm" onClick={() => setStatus(b, "COMPLETED")}>Mark complete</button>}
                    </div>
                  </td>
                </tr>
                {open && (
                  <tr className="book-pick-row">
                    <td colSpan={7}>
                      <div className="book-pick">
                        <div className="book-pick-head">
                          Who takes this job for <strong>{b.customer?.name}</strong>
                          <span className="hint">It appears on their dashboard right away.</span>
                        </div>
                        <div className="book-pick-chips">
                          {team.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className={`btn btn-sm ${t.id === b.employeeId ? "btn-primary" : "btn-outline"}`}
                              disabled={busyId === b.id}
                              onClick={() => assign(b, t.id)}
                            >
                              {displayName(t)} · {t.title}
                            </button>
                          ))}
                          {b.employeeId && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              disabled={busyId === b.id}
                              onClick={() => assign(b, "")}
                            >
                              Nobody
                            </button>
                          )}
                        </div>
                        {who && !who.active && (
                          <p className="hint book-pick-note">
                            This job still names {displayName(who)}, who is no longer on the team. Pick someone to take it over.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {bookings.length > 0 && !hasTeam && (
        <p className="hint" style={{ marginTop: 12 }}>
          Assign stays greyed until you add people under Team.
        </p>
      )}
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

// localhost, 127.0.0.1 and friends name this one computer, so a phone scanning a
// code built from them reaches nothing. Say so instead of letting it look broken.
const isLocalHost = (url) => /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(\/|$)/i.test(url || "");

const jobWhen = (d) => new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const unpaidJob = (b) => b.payment?.status !== "PAID";

// One teammate's record, counted from the listing's own bookings: how much work
// they were given, how much of it they finished, the money behind the jobs they
// closed, and how the customers they served rated them. Money follows the same
// rule the Earnings panel uses — a booking counts once its payment is PAID.
function memberProgress(member, bookings) {
  const mine = bookings.filter((b) => b.employeeId === member.id);
  const amountOf = (b) => b.payment?.amountCents || b.priceCents || 0;
  const paid = mine.filter((b) => b.payment?.status === "PAID");
  const onHand = mine.filter((b) => ["PENDING", "CONFIRMED"].includes(b.status));
  const ratings = mine.map((b) => b.review?.rating).filter((r) => typeof r === "number");

  return {
    taken: mine.length,
    done: mine.filter((b) => b.status === "COMPLETED").length,
    onHand: onHand.length,
    paidCount: paid.length,
    collected: paid.reduce((s, b) => s + amountOf(b), 0),
    unpaid: onHand.filter(unpaidJob).reduce((s, b) => s + amountOf(b), 0),
    rating: ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null,
    ratingCount: ratings.length,
    customers: new Set(mine.map((b) => b.customerId).filter(Boolean)).size,
    jobs: [...mine].sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)),
  };
}

function TeamProgressCard({ member, jobs, unclaimed, business, onClose, reload }) {
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const overlayRef = useRef(null);
  const name = displayName(member);
  const p = memberProgress(member, jobs);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function give(booking) {
    setBusyId(booking.id);
    setError("");
    try {
      await api.assignBooking(booking.id, member.id);
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div
      className="team-pop-overlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} — team progress`}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="team-pop">
        <div className="team-pop-head">
          <TeamAvatar member={member} />
          <div className="team-pop-id">
            <h3>{name}</h3>
            <p>{member.title} · {business.name}</p>
          </div>
          <button type="button" className="team-pop-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="team-pop-body">
          <div className="stat-grid">
            <StatCard icon="clipboard" color="blue" label="Work taken on" value={p.taken} foot={`${p.done} completed`} footColor="blue" />
            <StatCard icon="wallet" color="green" label="Money collected" value={formatMoney(p.collected)} foot={`${p.paidCount} paid job${p.paidCount === 1 ? "" : "s"}`} footColor="green" />
            <StatCard icon="calendar" color="purple" label="Still on their board" value={p.onHand} foot={p.unpaid ? `${formatMoney(p.unpaid)} not paid yet` : "Nothing unpaid"} footColor="purple" />
            <StatCard icon="star" color="amber" label="Customer rating" value={p.rating ? p.rating.toFixed(1) : "—"} foot={p.ratingCount ? `${p.ratingCount} rating${p.ratingCount === 1 ? "" : "s"}` : "No ratings yet"} footColor="amber" />
          </div>

          <p className="team-pop-note">
            {p.customers ? `${p.customers} customer${p.customers === 1 ? "" : "s"} served.` : "No customers yet."}{" "}
            These numbers count only the bookings on {business.name} that carry their name.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="team-pop-section">
            <h4>Work waiting to be claimed</h4>
            {unclaimed.length === 0 ? (
              <p className="team-pop-empty">
                Every open booking already has a name against it. New requests from customers land here.
              </p>
            ) : (
              <ul className="team-pop-queue">
                {unclaimed.slice(0, 8).map((b) => (
                  <li key={b.id}>
                    <div className="team-pop-job">
                      <span className="team-pop-who">{b.customer?.name || "Customer"}</span>
                      <span className="team-pop-what">
                        {b.service?.name || "Booking"} · {jobWhen(b.scheduledAt)}
                      </span>
                    </div>
                    <div className="team-pop-job-actions">
                      <span className={`pill pill-${b.status.toLowerCase()}`}>{b.status}</span>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={!member.active || busyId === b.id}
                        onClick={() => give(b)}
                      >
                        {busyId === b.id ? "…" : `Give to ${name}`}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!member.active && (
              <p className="hint">Bring {name} back to the team before handing them new work.</p>
            )}
          </div>

          <div className="team-pop-section">
            <h4>Their jobs</h4>
            {p.jobs.length === 0 ? (
              <p className="team-pop-empty">
                Nothing has been put on {name}'s name yet. Assign them a job above and it shows up on their own
                dashboard as soon as they sign in.
              </p>
            ) : (
              <>
                <div className="table-scroll">
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr><th>Customer</th><th>Service</th><th>When</th><th>Status</th><th>Paid</th></tr>
                    </thead>
                    <tbody>
                      {p.jobs.slice(0, 12).map((b) => (
                        <tr key={b.id}>
                          <td>{b.customer?.name || "Customer"}</td>
                          <td>{b.service?.name || "—"}</td>
                          <td>{jobWhen(b.scheduledAt)}</td>
                          <td><span className={`pill pill-${b.status.toLowerCase()}`}>{b.status}</span></td>
                          <td>{b.payment?.status === "PAID" ? formatMoney(b.payment?.amountCents || b.priceCents || 0) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {p.jobs.length > 12 && <p className="hint">Plus {p.jobs.length - 12} earlier jobs.</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeesPanel({ business, onChange }) {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(STAFF_ROLES[0]);
  const [customRole, setCustomRole] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [inviteFor, setInviteFor] = useState(null);
  const [invite, setInvite] = useState(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [progressFor, setProgressFor] = useState(null);
  const inviteCardRef = useRef(null);

  // Every progress card is counted from this one list, so opening a card costs no
  // extra request and a job handed over shows up immediately.
  function loadJobs() {
    api.businessBookings(business.id).then(setJobs).catch(() => setJobs([]));
  }

  useEffect(() => {
    setJobs([]);
    loadJobs();
  }, [business.id]);

  const members = [...(business.employees || [])].sort(
    (a, b) => Number(b.active) - Number(a.active) || displayName(a).localeCompare(displayName(b))
  );
  // Right after an add the refreshed team list may not carry the member yet, so the
  // row the card was opened for stands in until it does — and one that has picked up
  // a sign-in closes the card, because there is nothing left to invite.
  const invitedRow = inviteFor ? members.find((m) => m.id === inviteFor.id) : null;
  const inviteMember = invitedRow ? (invitedRow.userId ? null : invitedRow) : inviteFor;

  // The card is below the table — a screen away on a phone — so bring the code
  // itself to the top of the view. Centring the card would clip the QR, which is
  // taller than a phone screen together with the rest of the card.
  useEffect(() => {
    if (!inviteFor) return;
    const card = inviteCardRef.current;
    const target = card?.querySelector(".team-invite-qrbox") || card;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [inviteFor, invite]);
  const term = query.trim().toLowerCase();
  const shown = term
    ? members.filter((m) => [displayName(m), memberPhone(m), memberEmail(m), m.title]
        .some((v) => (v || "").toLowerCase().includes(term)))
    : members;

  async function run(id, action, message) {
    setBusy(id);
    setError("");
    setNote("");
    try {
      const result = await action();
      setNote(typeof message === "function" ? message(result) : message);
      onChange();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy("");
    }
  }

  async function add(e) {
    e.preventDefault();
    const entry = { name, phone, email, role, title: role === "Other" ? customRole : "" };
    if (!entry.name.trim() && !entry.phone.trim() && !entry.email.trim()) {
      setError("Give them a name, phone or email so you recognise them later.");
      return;
    }
    const who = name.trim() || email.trim() || phone.trim();
    const title = role === "Other" ? customRole.trim() || "Staff" : role;
    let created = null;
    const added = await run(
      "add",
      async () => {
        created = await api.addEmployee(business.id, entry);
        return created;
      },
      // Their email can belong to an account that already exists, in which case
      // Nearby links them on the spot and there is no code to send — the owner has
      // to hear that, or it looks like the invitation failed.
      (member) =>
        member?.userId
          ? `${who} already has a Nearby sign-in, so they are on your team as ${title} right away — no link or QR code needed. Ask them to sign in and they land on their own ${title} dashboard for ${business.name}.`
          : `${who} is on your team. Send them the link below or let them scan the code to create their sign-in.`
    );
    if (!added) return;
    setName("");
    setPhone("");
    setEmail("");
    setCustomRole("");
    setRole(STAFF_ROLES[0]);
    setShowForm(false);
    // Added without an account: the link is what turns the name on the roster
    // into a person who can sign in and see their own dashboard.
    if (created && !created.userId) openInvite(created);
  }

  function changeRole(member, value) {
    run(member.id, () => api.updateEmployee(business.id, member.id, { title: value }), `${displayName(member)} is now ${value}.`);
  }

  function remove(member) {
    if (!confirm(`Remove ${displayName(member)} from your team? Customers will no longer see them on your listing.`)) return;
    if (inviteFor?.id === member.id) closeInvite();
    run(member.id, () => api.removeEmployee(business.id, member.id), `${displayName(member)} was removed.`);
  }

  function restore(member) {
    run(member.id, () => api.updateEmployee(business.id, member.id, { active: true }), `${displayName(member)} is back on the team.`);
  }

  function drop(member) {
    if (!confirm(`Delete ${displayName(member)} from this listing for good?`)) return;
    if (inviteFor?.id === member.id) closeInvite();
    run(member.id, () => api.deleteEmployee(business.id, member.id), `${displayName(member)} was deleted.`);
  }

  // Every call mints a new link, so the card always shows the one that currently
  // works; the QR or message sent before it stops opening the sign-up.
  async function openInvite(member) {
    setInviteFor(member);
    setInvite(null);
    setCopied(false);
    setError("");
    setInviteBusy(true);
    try {
      setInvite(await api.employeeInvite(business.id, member.id));
    } catch (e) {
      setError(e.message);
      setInviteFor(null);
    } finally {
      setInviteBusy(false);
    }
  }

  function closeInvite() {
    setInviteFor(null);
    setInvite(null);
    setCopied(false);
  }

  function copyLink(url) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const activeCount = members.filter((m) => m.active).length;

  // Looked up fresh from the roster, so a role change or removal shows in the open
  // card — and deleting the row closes it, since there is nothing left to show.
  const progressMember = progressFor ? members.find((m) => m.id === progressFor.id) : null;

  // Work a customer asked for that nobody has claimed yet: the owner hands it over
  // straight from the card instead of hunting through the booking table.
  const unclaimed = jobs
    .filter((b) => !b.employeeId && ["PENDING", "CONFIRMED"].includes(b.status))
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}
      {note && !error && <div className="alert alert-success">{note}</div>}

      <div className="panel">
        <div className="panel-head">
          <h3><Icon name="team" size={17} />Team <span className="inbox-count">{activeCount}</span></h3>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setShowForm((v) => !v); setError(""); }}>
            {showForm ? "Close" : "+ Add a team member"}
          </button>
        </div>

        {showForm && (
          <div className="panel-body">
            <form onSubmit={add} className="team-add">
              <div className="team-add-fields">
                <div className="field">
                  <label>Name</label>
                  <input maxLength={60} placeholder="e.g. Amina Juma" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input maxLength={30} placeholder="e.g. +255 712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input maxLength={120} placeholder="e.g. amina@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  <option value="Other">Write your own…</option>
                </select>
                {role === "Other" && (
                  <input
                    className="team-role-custom"
                    maxLength={40}
                    placeholder="e.g. Senior Stylist"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                  />
                )}
                <p className="team-grants">{roleGrants(role === "Other" ? customRole : role)}</p>
              </div>
              <button className="btn btn-primary">Add to team</button>
              <p className="hint team-add-hint">
                Any of name, phone or email is enough. If the email already has a Nearby account, they are linked to
                your listing and can sign in as staff — and the next time they sign in they land on their own dashboard
                for {business.name || "this listing"}. Anyone without an account gets an invitation link and QR code you
                can send straight away.
              </p>
            </form>
          </div>
        )}

        {!showForm && members.length > 0 && (
          <div className="inbox-search" style={{ margin: "0 20px 12px" }}>
            <Icon name="search" size={16} />
            <input value={query} placeholder="Search your team by name, role or email" onChange={(e) => setQuery(e.target.value)} />
            {query && (
              <button type="button" className="inbox-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
        )}

        <div className="panel-body flush">
          {members.length === 0 && (
            <p className="team-empty">No team members yet. Add the people you work with — customers see them on your listing page.</p>
          )}
          {members.length > 0 && shown.length === 0 && (
            <p className="team-empty">No one on your team matches “{query.trim()}”.</p>
          )}
          {shown.length > 0 && (
            <div className="table-scroll">
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr><th>Team member</th><th>Role</th><th className="team-col-status">Status</th><th className="team-col-joined">Joined</th><th className="team-col-actions">Actions</th></tr>
                </thead>
                <tbody>
                  {shown.map((m) => (
                    <tr key={m.id} className={m.active ? "" : "team-row--out"}>
                      <td>
                        <div className="team-member">
                          <TeamAvatar member={m} />
                          <div className="team-id">
                            <div className="team-name">{displayName(m)}</div>
                            {m.active && memberPhone(m) && <div className="team-mail">{memberPhone(m)}</div>}
                            {m.active && memberEmail(m) && <div className="team-mail">{memberEmail(m)}</div>}
                            {m.active && (
                              <span className={`team-signin ${m.userId ? "team-signin--on" : "team-signin--off"}`}>
                                {m.userId ? "Signs in as staff" : "No account yet"}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          className="team-role"
                          value={m.title}
                          disabled={!m.active || busy === m.id}
                          onChange={(e) => changeRole(m, e.target.value)}
                        >
                          {roleChoices(m.title).map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        {m.active && <div className="team-grants">{roleGrants(m.title)}</div>}
                      </td>
                      <td className="team-col-status">
                        <span className={m.active ? "pill pill-approved" : "pill pill-suspended"}>
                          {m.active ? "Active" : "Removed"}
                        </span>
                      </td>
                      <td className="team-joined team-col-joined">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—"}</td>
                      <td className="team-col-actions">
                        <div className="team-actions">
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setProgressFor(m)}>View</button>
                          {m.active && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={!!m.userId || (inviteBusy && inviteFor?.id === m.id)}
                              title={m.userId
                                ? `${displayName(m)} already signs in as staff, so there is nothing to invite — no link or QR code is needed.`
                                : `Get a link and QR code for ${displayName(m)} to create their sign-in.`}
                              onClick={() => openInvite(m)}
                            >
                              {inviteBusy && inviteFor?.id === m.id ? "…" : "Invite"}
                            </button>
                          )}
                          {m.active ? (
                            <button type="button" className="btn btn-sm" disabled={busy === m.id} onClick={() => remove(m)}>
                              {busy === m.id ? "…" : "Remove"}
                            </button>
                          ) : (
                            <>
                              <button type="button" className="btn btn-primary btn-sm" disabled={busy === m.id} onClick={() => restore(m)}>
                                {busy === m.id ? "…" : "Bring back"}
                              </button>
                              <button type="button" className="btn btn-danger btn-sm" disabled={busy === m.id} onClick={() => drop(m)}>
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
            </div>
          )}
        </div>

        {inviteMember && (
          <div className="panel-body" ref={inviteCardRef}>
            <div className="team-invite">
              <div className="team-invite-qrbox">
                {invite ? (
                  <img className="team-invite-qr" src={invite.qrDataUrl} alt={`Invitation QR code for ${displayName(inviteMember)}`} />
                ) : (
                  <div className="team-invite-qr team-invite-qr--pending">
                    <Icon name="expand" size={22} />
                  </div>
                )}
                {invite && (
                  <a
                    className="team-invite-download"
                    href={invite.qrDataUrl}
                    download={`nearby-invite-${displayName(inviteMember).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`}
                  >
                    <Icon name="download" size={14} /> Save the QR image
                  </a>
                )}
              </div>

              <div className="team-invite-main">
                <div className="team-invite-head">
                  <h4>Invite {displayName(inviteMember)}</h4>
                  <button type="button" className="linklike" onClick={closeInvite}>
                    Done
                  </button>
                </div>
                <p className="hint">
                  {displayName(inviteMember)} has no sign-in yet. Send them the link below or let them scan the code:
                  it opens a one-page sign-up for the {inviteMember.title} role at {business.name}.
                </p>

                <div className="team-invite-link">
                  <input readOnly value={invite?.url || ""} onFocus={(e) => e.target.select()} aria-label="Invitation link" />
                  <button type="button" className="btn btn-sm" disabled={!invite} onClick={() => invite && copyLink(invite.url)}>
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </div>

                <div className="team-invite-actions">
                  <button type="button" className="btn btn-sm" disabled={inviteBusy} onClick={() => openInvite(inviteMember)}>
                    {inviteBusy ? "Working…" : "New link"}
                  </button>
                  <span className="hint">
                    {invite
                      ? `Works until ${new Date(invite.expiresAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}, or until they sign up.`
                      : "Preparing the link…"}
                  </span>
                </div>
                <p className="hint">Asking for a new link stops the one you sent before from working.</p>

                {invite && isLocalHost(invite.url) && (
                  <div className="team-invite-local">
                    <Icon name="alert" size={15} />
                    <span>
                      This link says <strong>localhost</strong>, which only names this computer — a phone that scans
                      the code has nothing to open, and pasting the link fails the same way. The same code works as
                      soon as you invite from the deployed site.
                    </span>
                  </div>
                )}

                <ol className="team-invite-steps">
                  <li>They scan the QR code or open the link.</li>
                  <li>They enter their name, email, phone number, a photo of their national ID and a password.</li>
                  <li>
                    Their own dashboard opens on {business.name} with only what a {inviteMember.title} is allowed to
                    see.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="hint" style={{ marginTop: 12 }}>
        Removing someone keeps their past bookings; deleting them clears the name from this listing.{" "}
        <strong>Invite</strong> on a row always reopens that teammate's link and QR code — it is greyed only when they
        already sign in as staff, which means no code was ever needed.
      </p>

      {progressMember && (
        <TeamProgressCard
          member={progressMember}
          jobs={jobs}
          unclaimed={unclaimed}
          business={business}
          onClose={() => setProgressFor(null)}
          reload={loadJobs}
        />
      )}
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
            <div className="msg-row" style={{ marginTop: 8 }}>
              <input placeholder="Write a public reply…" value={replyDrafts[r.id] || ""} onChange={(e) => setReplyDrafts((d) => ({ ...d, [r.id]: e.target.value }))} />
              <button className="btn btn-outline btn-sm" onClick={() => reply(r)}>Reply</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ListingDetailsPanel({ business, onChange }) {
  const cities = useCities();
  const [form, setForm] = useState({ name: business.name, description: business.description || "", city: business.city || "", address: business.address || "", phone: business.phone || "", website: business.website || "", latitude: business.latitude, longitude: business.longitude });
  const [attrs, setAttrs] = useState(business.attributes || {});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      await api.updateBusiness(business.id, { ...form, attributes: attrs });
      setSaved(true);
      onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  const schema = Array.isArray(business.category?.attributeSchema) ? business.category.attributeSchema : [];

  return (
    <div>
      <h2>Business settings</h2>
      {saved && <div className="alert alert-success">Saved.</div>}
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={save} className="card" style={{ maxWidth: 480 }}>
        <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
        <div className="field"><label>Description</label><textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
        <div className="grid grid-2">
          <div className="field"><label>City</label><CitySelect cities={cities} value={form.city} onChange={(city) => setForm((f) => ({ ...f, city }))} placeholder="Select your city…" showCounts={false} /></div>
          <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
        </div>
        <div className="field"><label>Address</label><input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
        <div className="field">
          <label>Website (optional)</label>
          <input
            value={form.website}
            maxLength={200}
            placeholder="pipepro.co.ke"
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
          />
          <span className="hint">Customers open your site in a new tab from your listing page.</span>
        </div>

        <div className="field">
          <label>Pin your location</label>
          <LocationPicker
            value={form}
            name={form.name}
            onChange={(next) => setForm((f) => ({ ...f, latitude: next.latitude, longitude: next.longitude }))}
          />
        </div>

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
    </div>
  );
}

function MediaPanel({ business }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    api.enhancedPortfolio(business.id)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }
  useEffect(load, [business.id]);

  async function remove(id) {
    if (!confirm("Delete this item?")) return;
    try {
      await api.deleteEnhancedPortfolio(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  const TYPE_LABEL = { PHOTO: "📸 Photo", VIDEO: "🎥 Video", CERTIFICATE: "📜 Certificate", LICENSE: "✅ License", PROJECT: "🏗️ Project" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Photos & Videos</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowUpload((v) => !v)}>
          {showUpload ? "✕ Cancel" : "+ Add media"}
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      {showUpload && (
        <div style={{ marginBottom: 28 }}>
          <MediaUpload
            businessId={business.id}
            onUploadComplete={() => { setShowUpload(false); load(); }}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      )}

      {loading && <p>Loading…</p>}

      {!loading && items.length === 0 && !showUpload && (
        <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🖼️</div>
          <h3>No media yet</h3>
          <p style={{ color: "var(--ink-2)", marginBottom: 20 }}>
            Photos and videos help customers trust your business and make booking decisions.
            Upload your best work!
          </p>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>Upload your first photo</button>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-3">
          {items.map((item) => (
            <div key={item.id} className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ position: "relative", paddingBottom: "66.67%", background: "#000", overflow: "hidden" }}>
                {item.type === "VIDEO" ? (
                  <video
                    src={item.mediaUrl}
                    poster={item.thumbnailUrl}
                    style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }}
                    muted
                  />
                ) : (
                  <img
                    src={item.mediaUrl}
                    alt={item.title || item.type}
                    style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
                <span style={{
                  position: "absolute", top: 8, left: 8,
                  padding: "3px 8px", borderRadius: 4,
                  background: "rgba(0,0,0,0.6)", color: "white",
                  fontSize: "0.72rem", fontWeight: 600,
                }}>
                  {TYPE_LABEL[item.type] || item.type}
                </span>
                {item.verified && (
                  <span style={{
                    position: "absolute", top: 8, right: 8,
                    padding: "3px 8px", borderRadius: 4,
                    background: "#10b981", color: "white",
                    fontSize: "0.72rem", fontWeight: 600,
                  }}>✓ Verified</span>
                )}
              </div>
              <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                {item.title && <h4 style={{ margin: 0, fontSize: "0.9rem" }}>{item.title}</h4>}
                {item.description && <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--ink-2)", flex: 1 }}>{item.description}</p>}
                <button
                  className="btn btn-danger btn-sm"
                  style={{ alignSelf: "flex-start", marginTop: 6 }}
                  onClick={() => remove(item.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
