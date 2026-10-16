import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import { StarDisplay } from "../components/StarRating.jsx";
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
import ChatComposer from "../components/ChatComposer.jsx";
import MessageBubble from "../components/MessageBubble.jsx";
import useChatThread, { stickToBottom } from "../hooks/useChatThread.js";
import { hasCoords } from "../utils/geolocation.js";
import { siteLabel } from "../utils/website.js";
import TeamAvatar, { displayName, memberPhone, memberEmail } from "../components/TeamAvatar.jsx";
import { STAFF_ROLES, roleGrants } from "../utils/staffAccess.js";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", group: "Overview", subtitle: "Live overview of today's activity at your business." },
  { key: "mybusiness", label: "My Business", icon: "store", group: "Listing", subtitle: "Details, your website and the address customers see." },
  { key: "services", label: "My Services", icon: "tag", subtitle: "What you offer, at what price, with a photo of the work." },
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
  // Set by a "Message" click under Customers: the inbox opens that conversation, then
  // clears it so a later visit to Messages shows the whole list again.
  const [chatWith, setChatWith] = useState(null);

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
    setChatWith(null);
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
          {!accountSection && active.status === "CLOSED" && (
            <div className="alert alert-warn" style={{ marginBottom: 20 }}>
              <strong>Listing closed</strong> — you closed this listing, so customers cannot find it. Reopen it under
              My Business; it goes back into the review queue before it goes live again.
            </div>
          )}

          {section === "dashboard" && <Overview business={active} onNavigate={setSection} />}
          {section === "bookings" && <BookingsPanel business={active} />}
          {section === "team" && (active.status === "APPROVED"
            ? <EmployeesPanel business={active} onChange={load} />
            : <ApprovalRequired closed={active.status === "CLOSED"} />
          )}
          {section === "customers" && (
            <CustomersPanel
              business={active}
              onMessage={(who) => { setChatWith(who); setSection("messages"); }}
            />
          )}
          {section === "messages" && <ProviderInbox business={active} openWith={chatWith} onOpened={() => setChatWith(null)} />}
          {section === "services" && (active.status === "APPROVED"
            ? <ServicesPanel key={active.id} business={active} categories={categories} onChange={load} />
            : <ApprovalRequired closed={active.status === "CLOSED"} />
          )}
          {section === "mybusiness" && (
            <MyBusinessSection
              business={active}
              businesses={businesses}
              onSelect={setActiveId}
              onCreate={() => setShowNewBiz(true)}
              onChange={load}
            />
          )}
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
    setPhoto(null);
    (async () => {
      const [bookings, customers, services, reviews] = await Promise.all([
        api.businessBookings(business.id).catch(() => []),
        api.businessCustomers(business.id).catch(() => []),
        api.servicesForBusiness(business.id).catch(() => []),
        api.businessReviews(business.id).catch(() => []),
      ]);
      setData({ bookings, customers, services, reviews });

      // The cover is whichever picture the owner has: a photo they attached to a
      // service first, then anything still in the older listing gallery.
      const shot = services.find((s) => s.attributes?.photoUrl)?.attributes.photoUrl;
      if (shot) { setPhoto(shot); return; }
      try {
        const items = await api.enhancedPortfolio(business.id);
        const p = items.find((i) => i.type === "PHOTO" && i.mediaUrl) || items.find((i) => i.mediaUrl);
        if (p) { setPhoto(p.thumbnailUrl || p.mediaUrl); return; }
        const ps = await api.portfolioItems(business.id);
        if (ps[0]?.imageUrl) setPhoto(ps[0].imageUrl);
      } catch {
        // The overview works without a cover photo.
      }
    })();
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
              {business.website && (
                <a className="biz-web" href={business.website} target="_blank" rel="noreferrer">
                  <Icon name="globe" size={14} />
                  {siteLabel(business.website)}
                </a>
              )}
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

// A listing carries its own details; the pictures live with the services that
// were done, so they are uploaded under My Services instead of here.
function MyBusinessSection({ business, businesses, onSelect, onCreate, onChange }) {
  return (
    <div>
      <ListingsPanel
        businesses={businesses}
        activeId={business.id}
        onSelect={onSelect}
        onCreate={onCreate}
        reload={onChange}
        onEdit={onSelect}
      />
      <div style={{ marginTop: 22 }}>
        <ListingDetailsPanel key={business.id} business={business} onChange={onChange} />
      </div>
    </div>
  );
}

const STATUS_LABEL = { APPROVED: "Active", PENDING: "Pending", REJECTED: "Rejected", SUSPENDED: "Suspended", CLOSED: "Closed" };

// One row per listing the owner runs. Everything else on this dashboard follows
// whichever row is marked "Working on it", so the table is also how they switch.
function ListingsPanel({ businesses, activeId, onSelect, onCreate, reload, onEdit }) {
  const [open, setOpen] = useState("");
  const detail = businesses.find((b) => b.id === open) || null;
  const live = businesses.filter((b) => b.status === "APPROVED").length;

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <h3>
            <Icon name="store" size={17} />Your listings
            <span className="inbox-count">{businesses.length}</span>
          </h3>
          <button type="button" className="btn btn-outline btn-sm" onClick={onCreate}>+ Add a listing</button>
        </div>

        <div className="panel-body flush">
          <div className="table-scroll">
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Listing</th>
                  <th className="biz-col-city">City</th>
                  <th>Services</th>
                  <th className="biz-col-rating">Rating</th>
                  <th className="biz-col-status">Status</th>
                  <th className="biz-col-when">Listed since</th>
                  <th className="biz-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className="team-member">
                        <span className="team-avatar team-avatar--initials">{initials(b.name)}</span>
                        <div className="team-id">
                          <div className="team-name">
                            {b.name}
                            {b.id === activeId && <span className="biz-you">Working on it</span>}
                          </div>
                          <div className="team-mail">{b.category?.name || "No category"}</div>
                          {b.website && (
                            <a className="biz-web-row" href={b.website} target="_blank" rel="noreferrer">
                              <Icon name="globe" size={13} />
                              {siteLabel(b.website)}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="biz-col-city">{b.city || "—"}</td>
                    <td>{(b.services || []).filter((s) => s.active).length}</td>
                    <td className="biz-col-rating">
                      {b.reviewCount ? `${Number(b.avgRating).toFixed(1)} · ${b.reviewCount}` : "No reviews yet"}
                    </td>
                    <td className="biz-col-status">
                      <span className={`pill pill-${b.status.toLowerCase()}`}>{STATUS_LABEL[b.status] || b.status}</span>
                    </td>
                    <td className="biz-col-when team-joined">{new Date(b.createdAt).toLocaleDateString()}</td>
                    <td className="biz-col-actions">
                      <div className="team-actions">
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(b.id)}>View</button>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => onEdit(b)}>Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="hint" style={{ marginTop: 12 }}>
        {live} of {businesses.length} {businesses.length === 1 ? "listing is" : "listings are"} live for customers.
        <strong>View</strong> shows everything you entered and lets you edit, switch to or close that listing;
        <strong>Edit</strong> opens its details below. A listing you close stops appearing in searches but keeps its
        bookings, chats and reviews.
      </p>

      {detail && (
        <BusinessCard
          business={detail}
          isActive={detail.id === activeId}
          onSelect={onSelect}
          onEdit={onEdit}
          onClose={() => setOpen("")}
          reload={reload}
        />
      )}
    </>
  );
}

// Everything the owner put into one listing, and the ways to change it.
function BusinessCard({ business, isActive, onSelect, onEdit, onClose, reload }) {
  const overlayRef = useRef(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const services = (business.services || []).filter((s) => s.active);
  const team = (business.employees || []).filter((m) => m.active);
  const closed = business.status === "CLOSED";
  const attrs = Object.entries(business.attributes || {});

  async function setVisibility(next) {
    const verb = next ? "close" : "reopen";
    if (!confirm(next
      ? `Close ${business.name}? Customers will stop seeing it in searches and on the map. Its bookings, chats and reviews stay.`
      : `Reopen ${business.name}? It goes back in the review queue, and an admin approves it before customers see it again.`)) return;
    setBusy("visibility");
    setError("");
    try {
      await api.setBusinessVisibility(business.id, next);
      reload();
      onClose();
    } catch (e) {
      setError(`${e.message} — could not ${verb} this listing.`);
    } finally {
      setBusy("");
    }
  }

  return (
    <div
      className="team-pop-overlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${business.name} details`}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="team-pop">
        <div className="team-pop-head">
          <span className="team-avatar team-avatar--initials">{initials(business.name)}</span>
          <div className="team-pop-id">
            <h3>{business.name}</h3>
            <p>
              {business.category?.name || "No category"} · {business.city || "no city set"} ·{" "}
              <span className={`pill pill-${business.status.toLowerCase()}`}>{STATUS_LABEL[business.status] || business.status}</span>
            </p>
          </div>
          <button type="button" className="team-pop-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="team-pop-body">
          <div className="stat-grid">
            <StatCard icon="tag" color="amber" label="Services on offer" value={services.length} />
            <StatCard icon="team" color="blue" label="Team" value={team.length} />
            <StatCard
              icon="star"
              color="green"
              label="Rating"
              value={business.reviewCount ? Number(business.avgRating).toFixed(1) : "—"}
              foot={business.reviewCount ? `${business.reviewCount} review(s)` : "No reviews yet"}
            />
            <StatCard icon="pin" color="purple" label="Pinned location" value={hasCoords(business) ? "Yes" : "No"} />
          </div>

          <div className="team-pop-section">
            <h4>What customers see</h4>
            <dl className="biz-facts">
              <div><dt>Description</dt><dd>{business.description || "Nothing written yet."}</dd></div>
              <div><dt>Category</dt><dd>{business.category?.name || "—"}</dd></div>
              <div><dt>City</dt><dd>{business.city || "—"}</dd></div>
              <div><dt>Address</dt><dd>{business.address || "—"}</dd></div>
              <div>
                <dt>Phone</dt>
                <dd>{business.phone
                  ? <a className="cust-link" href={`tel:${business.phone}`}><Icon name="chat" size={15} />{business.phone}</a>
                  : "—"}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{business.email
                  ? <a className="cust-link" href={`mailto:${business.email}`}><Icon name="inbox" size={15} />{business.email}</a>
                  : "—"}</dd>
              </div>
              <div>
                <dt>Website</dt>
                <dd>{business.website
                  ? <a className="cust-link" href={business.website} target="_blank" rel="noreferrer"><Icon name="globe" size={15} />{siteLabel(business.website)}</a>
                  : "—"}</dd>
              </div>
              <div>
                <dt>Pin</dt>
                <dd>{hasCoords(business)
                  ? `${business.latitude.toFixed(5)}, ${business.longitude.toFixed(5)}`
                  : "Not pinned — customers cannot get directions to you."}</dd>
              </div>
              {attrs.length > 0 && (
                <div>
                  <dt>{business.category?.name || "Listing"} details</dt>
                  <dd>{attrs.map(([k, v]) => `${k}: ${v}`).join(" · ")}</dd>
                </div>
              )}
              <div><dt>Listed since</dt><dd>{new Date(business.createdAt).toLocaleDateString()}</dd></div>
            </dl>
          </div>

          {services.length > 0 && (
            <div className="team-pop-section">
              <h4>Services</h4>
              <ul className="biz-services">
                {services.map((s) => (
                  <li key={s.id}>
                    <span>{s.name}</span>
                    <span className="biz-service-price">{formatMoney(s.priceCents)}</span>
                  </li>
                ))}
              </ul>
              <p className="team-pop-note">Add, change or remove them under My Services.</p>
            </div>
          )}

          {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}

          <div className="biz-act">
            <Link className="btn btn-outline btn-sm" to={`/business/${business.id}`}>Open public page</Link>
            {business.website && (
              <a className="btn btn-outline btn-sm" href={business.website} target="_blank" rel="noreferrer">
                <Icon name="globe" size={14} /> Open website
              </a>
            )}
            {!isActive && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => { onSelect(business.id); onClose(); }}
              >
                Work on this listing
              </button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { onEdit(business); onClose(); }}>
              Edit details
            </button>
            <button
              type="button"
              className={`btn btn-sm ${closed ? "btn-outline" : "btn-danger"}`}
              disabled={!!busy}
              onClick={() => setVisibility(!closed)}
            >
              {busy === "visibility" ? "…" : closed ? "Reopen listing" : "Close this listing"}
            </button>
          </div>

          <p className="team-pop-note" style={{ marginTop: 12 }}>
            {closed
              ? "This listing is closed — customers cannot find it. Reopening sends it back to the review queue."
              : "Closing takes the listing out of searches without deleting its bookings, chats or reviews."}
          </p>
        </div>
      </div>
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

function ApprovalRequired({ closed }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "48px 32px", maxWidth: 480 }}>
      <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>{closed ? "🔒" : "⏳"}</div>
      <h3>{closed ? "This listing is closed" : "Pending admin approval"}</h3>
      <p style={{ color: "var(--ink-2)" }}>
        {closed
          ? "Customers cannot see a closed listing. Reopen it under My Business — it goes back through the review queue."
          : "This section will be available once an admin approves your listing. We'll notify you as soon as it's reviewed."}
      </p>
    </div>
  );
}

function NewBusinessForm({ categories, onCreated, onCancel }) {
  const cities = useCities();
  const [form, setForm] = useState({ name: "", description: "", categorySlug: "", city: "", address: "", phone: "", website: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!form.city) {
      setError("Choose the place your business is in — customers search listings by city.");
      return;
    }
    if (!hasCoords(form)) {
      setError("Pin your location on the map — customers use it for directions, so a listing needs one.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      onCreated(await api.createBusiness(form));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560, marginBottom: 24 }}>
      <h3>List a new business</h3>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label>Business name</label>
          <input required maxLength={80} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        {/* A listing cannot exist without one: the category is also the bucket your
            services are filed under, so it is asked for here rather than later. */}
        <div className="field">
          <label>Category</label>
          <select required value={form.categorySlug} onChange={(e) => setForm((f) => ({ ...f, categorySlug: e.target.value }))}>
            <option value="">Select a category…</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-2">
          <div className="field">
            <label>Place</label>
            <CitySelect cities={cities} value={form.city} onChange={(city) => setForm((f) => ({ ...f, city }))} placeholder="Select your city…" showCounts={false} />
          </div>
          <div className="field">
            <label>Phone number</label>
            <input required type="tel" maxLength={30} placeholder="e.g. 0712 345 678" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>
        <div className="field">
          <label>Street address <span style={{ color: "var(--ink-2)", fontWeight: 400 }}>(optional)</span></label>
          <input maxLength={120} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea required rows={3} maxLength={500} placeholder="Tell customers what makes your business great…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>

        <div className="field">
          <label>Location on Google Maps</label>
          <LocationPicker
            value={form}
            name={form.name}
            onChange={(next) => setForm((f) => ({ ...f, latitude: next.latitude, longitude: next.longitude }))}
          />
        </div>

        <div className="field">
          <label>Website</label>
          <input
            required
            value={form.website}
            maxLength={200}
            placeholder="pipepro.co.ke"
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
          />
          <span className="hint">Customers open your site in a new tab from your listing page, and it stays linked in your dashboard.</span>
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

// Everything the owner can still act on for one customer: how to reach them and
// every job they asked for, each with the same confirm/decline/complete controls
// the Bookings table carries.
function CustomerDetailCard({ entry, business, onClose, onMessage, reload }) {
  const overlayRef = useRef(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const { customer, bookings, totalSpentCents, unpaidCount, completedCount } = entry;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function setStatus(booking, status) {
    setBusy(booking.id);
    setError("");
    try {
      await api.updateBookingStatus(booking.id, status);
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div
      className="team-pop-overlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${customer.name} — customer details`}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="team-pop">
        <div className="team-pop-head">
          <span className="team-avatar team-avatar--initials">{initials(customer.name)}</span>
          <div className="team-pop-id">
            <h3>{customer.name}</h3>
            <p>
              {bookings.length} booking{bookings.length === 1 ? "" : "s"} on {business.name} · joined{" "}
              {new Date(customer.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button type="button" className="team-pop-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="team-pop-body">
          {customer.bannedAt && (
            <div className="alert alert-error">
              This account is banned{customer.banReason ? `: ${customer.banReason}` : " an admin."} Its bookings stay
              here for the records.
            </div>
          )}
          <div className="cust-contact">
            <a className="cust-link" href={`mailto:${customer.email}`}>
              <Icon name="idcard" size={14} /> {customer.email}
            </a>
            {customer.phone && (
              <a className="cust-link" href={`tel:${customer.phone}`}>
                <Icon name="bell" size={14} /> {customer.phone}
              </a>
            )}
          </div>

          <div className="stat-grid">
            <StatCard icon="clipboard" color="blue" label="Bookings" value={bookings.length} foot={`${completedCount} completed`} footColor="blue" />
            <StatCard icon="wallet" color="green" label="Spent with you" value={formatMoney(totalSpentCents)} foot={totalSpentCents ? "Paid jobs" : "Nothing paid yet"} footColor="green" />
            <StatCard icon="alert" color="amber" label="Unpaid" value={unpaidCount} foot={unpaidCount ? "Chase these up" : "All settled"} footColor="amber" />
            <StatCard icon="star" color="purple" label="Reviews left" value={bookings.filter((b) => b.review).length} foot="From their finished jobs" footColor="purple" />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="team-pop-section">
            <h4>Booking history</h4>
            <div className="table-scroll">
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr><th>Service</th><th>When</th><th>Price</th><th>Paid</th><th>Status</th><th className="cust-col-actions">Actions</th></tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const paid = b.payment?.status === "PAID";
                    return (
                      <tr key={b.id}>
                        <td>
                          <div className="team-name">{b.service?.name || "Booking"}</div>
                          {b.notes && <div className="team-mail">{b.notes}</div>}
                          {b.review && (
                            <div className="team-mail">
                              {"⭐".repeat(b.review.rating)} {b.review.comment}
                            </div>
                          )}
                        </td>
                        <td>{jobWhen(b.scheduledAt)}</td>
                        <td>{formatMoney(b.service?.priceCents || b.priceCents || 0)}</td>
                        <td>{paid ? "✓" : b.payment?.status === "FAILED" ? "Failed" : "—"}</td>
                        <td><span className={`pill pill-${b.status.toLowerCase()}`}>{b.status}</span></td>
                        <td className="cust-col-actions">
                          <div className="book-actions">
                            {b.status === "PENDING" && (
                              <>
                                <button type="button" className="btn btn-primary btn-sm" disabled={busy === b.id} onClick={() => setStatus(b, "CONFIRMED")}>
                                  {busy === b.id ? "…" : "Confirm"}
                                </button>
                                <button type="button" className="btn btn-danger btn-sm" disabled={busy === b.id} onClick={() => setStatus(b, "DECLINED")}>
                                  Decline
                                </button>
                              </>
                            )}
                            {b.status === "CONFIRMED" && (
                              <button type="button" className="btn btn-outline btn-sm" disabled={busy === b.id} onClick={() => setStatus(b, "COMPLETED")}>
                                {busy === b.id ? "…" : "Mark complete"}
                              </button>
                            )}
                            {["PENDING", "CONFIRMED"].includes(b.status) && (
                              <button type="button" className="btn btn-sm" disabled={busy === b.id} onClick={() => setStatus(b, "CANCELLED")}>
                                Cancel
                              </button>
                            )}
                            {["COMPLETED", "DECLINED", "CANCELLED"].includes(b.status) && <span className="assign-none">—</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm assign-clear"
            onClick={() => onMessage({ customerId: customer.id, customerName: customer.name })}
          >
            Message {customer.name}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomersPanel({ business, onMessage }) {
  const [entries, setEntries] = useState([]);   // [{ customer, bookings, totalSpentCents, ... }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState("");         // customer id shown in the detail card

  function load() {
    setLoading(true);
    api.businessCustomers(business.id)
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => { setOpen(""); load(); }, [business.id]);

  const term = search.trim().toLowerCase();
  const shown = term
    ? entries.filter((e) =>
        [e.customer.name, e.customer.email, e.customer.phone || ""].some((v) => String(v).toLowerCase().includes(term)))
    : entries;

  // Looked up fresh from the list, so a status change in the open card shows on the
  // row and in the history at once — and a customer who no longer has bookings here
  // closes the card rather than leaving it showing a stale file.
  const detail = open ? entries.find((e) => e.customer.id === open) : null;

  return (
    <div>
      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="panel">
        <div className="panel-head">
          <h3><Icon name="users" size={17} />Customers <span className="inbox-count">{entries.length}</span></h3>
        </div>

        {entries.length > 0 && (
          <div className="inbox-search" style={{ margin: "0 20px 12px" }}>
            <Icon name="search" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers by name, email or phone"
              aria-label="Search customers"
            />
            {search && (
              <button type="button" className="inbox-search-clear" onClick={() => setSearch("")} aria-label="Clear search">
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
        )}

        <div className="panel-body flush">
          {loading && <p className="team-empty">Loading customers…</p>}
          {!loading && entries.length === 0 && (
            <p className="team-empty">No customers yet. They appear here as soon as someone books a service.</p>
          )}
          {!loading && entries.length > 0 && shown.length === 0 && (
            <p className="team-empty">No customer matches “{search.trim()}”.</p>
          )}
          {shown.length > 0 && (
            <div className="table-scroll">
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th className="cust-col-contact">Contact</th>
                    <th>Bookings</th>
                    <th>Spent</th>
                    <th className="cust-col-unpaid">Unpaid</th>
                    <th className="cust-col-last">Last booking</th>
                    <th className="cust-col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map(({ customer, bookings, totalSpentCents, unpaidCount }) => {
                    const last = bookings[0];
                    return (
                      <tr key={customer.id}>
                        <td>
                          <div className="team-member">
                            <span className="team-avatar team-avatar--initials">{initials(customer.name)}</span>
                            <div className="team-id">
                              <div className="team-name">{customer.name}</div>
                              {customer.bannedAt && <span className="pill pill-suspended">Banned</span>}
                            </div>
                          </div>
                        </td>
                        <td className="cust-col-contact">
                          <div className="team-mail">{customer.email}</div>
                          {customer.phone && <div className="team-mail">{customer.phone}</div>}
                        </td>
                        <td>{bookings.length}</td>
                        <td><strong>{formatMoney(totalSpentCents)}</strong></td>
                        <td className="cust-col-unpaid">{unpaidCount ? <span className="cust-due">{unpaidCount}</span> : "—"}</td>
                        <td className="cust-col-last">
                          {last ? (
                            <div className="cust-last">
                              <span>{last.service?.name || "Booking"}</span>
                              <span className="team-mail">{jobWhen(last.scheduledAt)}</span>
                              <span className={`pill pill-${last.status.toLowerCase()}`}>{last.status}</span>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="cust-col-actions">
                          <div className="team-actions">
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(customer.id)}>View</button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => onMessage({ customerId: customer.id, customerName: customer.name })}
                            >
                              Message
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {entries.length > 0 && (
        <p className="hint" style={{ marginTop: 12 }}>
          Customers join Nearby by booking, so there is nothing to add or delete here — <strong>View</strong> opens their
          whole file and lets you confirm, complete or cancel each of their bookings.
        </p>
      )}

      {detail && (
        <CustomerDetailCard
          entry={detail}
          business={business}
          onClose={() => setOpen("")}
          onMessage={onMessage}
          reload={load}
        />
      )}
    </div>
  );
}

// The card the Assign button opens: everyone on this listing, each on their own
// row, and one tap puts the customer's job on that person's board.
function AssignJobCard({ booking, employees, business, onPick, onClose }) {
  const overlayRef = useRef(null);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function run(value, key) {
    setBusyId(key);
    setError("");
    try {
      await onPick(booking, value);
      onClose();
    } catch (e) {
      setError(e.message);
      setBusyId("");
    }
  }

  const active = employees.filter((m) => m.active);
  const removed = employees.filter((m) => !m.active);
  const holder = employees.find((m) => m.id === booking.employeeId);
  const holderOff = holder && !holder.active;

  // A busy listing can have more names than fit on the screen, so the card can be
  // searched by anything the owner remembers: name, role, phone or email.
  const needle = q.trim().toLowerCase();
  const matches = (m) =>
    !needle ||
    [displayName(m), m.title, memberEmail(m), memberPhone(m)].some((v) => String(v || "").toLowerCase().includes(needle));
  const shownActive = active.filter(matches);
  const shownRemoved = removed.filter(matches);

  return (
    <div
      className="team-pop-overlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Assign the job from ${booking?.customer?.name || "this customer"}`}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="team-pop team-pop--narrow">
        <div className="team-pop-head">
          <div className="team-pop-id">
            <h3>Assign this job</h3>
            <p>{booking?.service?.name || "Booking"} · {booking?.scheduledAt ? jobWhen(booking.scheduledAt) : ""}</p>
          </div>
          <button type="button" className="team-pop-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="team-pop-body">
          <p className="team-pop-note">
            {booking?.customer?.name || "This customer"} booked {booking?.service?.name || "a service"} on {business.name}.
            Hand it to one of your team and it appears on their dashboard right away.
          </p>
          {holderOff && (
            <div className="alert alert-warn">
              This job is on {displayName(holder)}’s name, but {displayName(holder)} is off the team. Give it to an
              active member below to take it over.
            </div>
          )}
          {error && <div className="alert alert-error">{error}</div>}

          {employees.length === 0 ? (
            <p className="team-pop-empty">
              Nobody is on this listing yet. Add them under Team and they will show up here to take jobs.
            </p>
          ) : (
            <>
              <div className="dash-search assign-search">
                <Icon name="search" size={15} />
                <input
                  type="search"
                  value={q}
                  autoFocus
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search your team by name, role, phone or email"
                  aria-label="Search your team"
                />
              </div>

              {needle && shownActive.length + shownRemoved.length === 0 ? (
                <p className="team-pop-empty">
                  Nobody on {business.name} matches “{q.trim()}”. Close this and check the spelling, or add the person
                  under Team first.
                </p>
              ) : (
                <>
                  <div className="team-pop-section">
                    <h4>Your team · {needle ? `${shownActive.length} of ${active.length}` : active.length}</h4>
                    {shownActive.length === 0 ? (
                      <p className="team-pop-empty">
                        {needle
                          ? "No active teammate matches that search — the matches below have been removed from the team."
                          : "Everyone on this listing has been removed, so there is no one to give work to."}
                      </p>
                    ) : (
                      <ul className="assign-list">
                        {shownActive.map((m) => (
                          <li key={m.id} className={m.id === booking.employeeId ? "assign-row assign-row--on" : "assign-row"}>
                            <TeamAvatar member={m} />
                            <div className="assign-id">
                              <span className="assign-name">{displayName(m)}</span>
                              <span className="assign-role">{m.title}</span>
                            </div>
                            <div className="assign-act">
                              {m.id === booking.employeeId ? (
                                <span className="pill pill-approved">On this job</span>
                              ) : (
                                <button type="button" className="btn btn-primary btn-sm" disabled={!!busyId} onClick={() => run(m.id, m.id)}>
                                  {busyId === m.id ? "…" : "Give this job"}
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {shownRemoved.length > 0 && (
                    <div className="team-pop-section">
                      <h4>Removed · {needle ? `${shownRemoved.length} of ${removed.length}` : removed.length}</h4>
                      <ul className="assign-list">
                        {shownRemoved.map((m) => (
                          <li key={m.id} className="assign-row assign-row--out">
                            <TeamAvatar member={m} />
                            <div className="assign-id">
                              <span className="assign-name">{displayName(m)}</span>
                              <span className="assign-role">{m.title}</span>
                            </div>
                            <div className="assign-act">
                              {m.id === booking.employeeId ? (
                                <span className="pill pill-suspended">On this job</span>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  disabled
                                  title={`${displayName(m)} is off the team, so they cannot take new work.`}
                                >
                                  Give this job
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {booking.employeeId && (
                <button type="button" className="btn btn-outline btn-sm assign-clear" disabled={!!busyId} onClick={() => run("", "clear")}>
                  {busyId === "clear" ? "…" : "Nobody — put it back on the board"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingsPanel({ business }) {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState("");

  function load() { api.businessBookings(business.id).then(setBookings).catch((e) => setError(e.message)); }
  useEffect(() => { setPicking(""); load(); }, [business.id]);

  async function setStatus(b, status) {
    try { await api.updateBookingStatus(b.id, status); load(); } catch (e) { setError(e.message); }
  }

  // The same call a manager makes from their own board, so a job the owner puts
  // here lands on that teammate's dashboard under "Assigned to you". The assign
  // card reports a failure itself, so this only has to keep the row in step.
  async function assign(b, value) {
    const updated = await api.assignBooking(b.id, value);
    setBookings((rows) => rows.map((x) => (x.id === b.id ? { ...x, ...updated } : x)));
  }

  const team = (business.employees || []).filter((m) => m.active);
  // A job handed to someone who has since left the team still carries their name,
  // so keep naming them on that row even though they cannot take new work.
  function named(b) {
    return (business.employees || []).find((m) => m.id === b.employeeId);
  }

  const hasTeam = team.length > 0;
  const pickingBooking = picking ? bookings.find((b) => b.id === picking) : null;

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
            const editable = ["PENDING", "CONFIRMED"].includes(b.status);
            const who = named(b);
            return (
              <tr key={b.id}>
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
                        disabled={!hasTeam}
                        title={hasTeam
                          ? "Choose which teammate takes this job."
                          : "Add people under Team before assigning work."}
                        onClick={() => setPicking(b.id)}
                      >
                        {who ? "Change" : "Assign"}
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
            );
          })}
        </tbody>
      </table>
      {bookings.length > 0 && !hasTeam && (
        <p className="hint" style={{ marginTop: 12 }}>
          Assign stays greyed until you add people under Team.
        </p>
      )}
      {pickingBooking && (
        <AssignJobCard
          booking={pickingBooking}
          employees={business.employees || []}
          business={business}
          onPick={assign}
          onClose={() => setPicking("")}
        />
      )}
    </div>
  );
}

// One picture per service, stored on the service itself, so customers see the work
// next to the price they book at. Uploads reuse the listing's own media route.
function ServicePhotoField({ businessId, value, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(file) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { url } = await api.uploadMedia(businessId, file);
      onChange(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <label>Photo of this service</label>
      <div className="svc-photo-row">
        {value ? <img className="svc-photo" src={value} alt="" /> : <span className="svc-photo svc-photo--empty">No photo</span>}
        <div className="svc-photo-actions">
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Uploading…" : value ? "Replace" : "Upload"}
          </button>
          {!!value && !busy && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange("")}>Remove</button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {error
        ? <span className="hint svc-photo-error">{error}</span>
        : <span className="hint">A photo of finished work sells the service — JPG, PNG or WebP up to 50 MB.</span>}
    </div>
  );
}

// The price and the duration are what a customer books on, so the edit card takes
// the same fields the add form does — the PATCH route accepts them verbatim.
function ServiceEditCard({ service, business, categories, onClose, onSave }) {
  const overlayRef = useRef(null);
  const [name, setName] = useState(service.name || "");
  const [description, setDescription] = useState(service.description || "");
  const [price, setPrice] = useState(((service.priceCents || 0) / 100).toFixed(2));
  const [duration, setDuration] = useState(String(service.durationMinutes || 60));
  const listingCategory = categories.find((c) => c.id === business.categoryId);
  const [categorySlug, setCategorySlug] = useState(
    (categories.find((c) => c.id === service.categoryId) || listingCategory)?.slug || ""
  );
  const [photo, setPhoto] = useState(service.attributes?.photoUrl || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const attributes = { ...(service.attributes || {}) };
      if (photo) attributes.photoUrl = photo;
      else delete attributes.photoUrl;
      await onSave({
        name: name.trim(),
        description: description.trim(),
        priceCents: Math.round(Number(price) * 100),
        durationMinutes: Number(duration),
        categorySlug,
        attributes,
      });
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div
      className="team-pop-overlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${service.name}`}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="team-pop team-pop--narrow">
        <div className="team-pop-head">
          <div className="team-pop-id">
            <h3>Edit this service</h3>
            <p>{business.name}</p>
          </div>
          <button type="button" className="team-pop-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="team-pop-body">
          <p className="team-pop-note">
            Customers book on the price and the time you set here, so the listing page changes the moment you save.
          </p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label>Name</label>
              <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label>Description</label>
              <input maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="field">
              <label>Category of this service</label>
              <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}>
                {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
              <span className="hint">Your listing sits in {listingCategory?.name || "its own category"}; this service can be filed elsewhere.</span>
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label>Price (USD)</label>
                <input required type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="field">
                <label>Duration (min)</label>
                <input required type="number" min="5" step="5" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </div>
            <ServicePhotoField businessId={business.id} value={photo} onChange={setPhoto} />
            <button className="btn btn-primary btn-block" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ServicesPanel({ business, categories, onChange }) {
  const [services, setServices] = useState(business.services || []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", priceCents: "", durationMinutes: 60, photo: "", categorySlug: business.category?.slug || "" });
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState("");

  const categoryOf = (id) => categories.find((c) => c.id === id)?.name || "No category";

  function load() { api.servicesForBusiness(business.id).then(setServices).catch((e) => setError(e.message)); }
  useEffect(load, [business.id]);

  async function addService(e) {
    e.preventDefault();
    setError("");
    setNote("");
    const name = form.name.trim();
    try {
      await api.createService({ businessId: business.id, name, description: form.description.trim(), priceCents: Math.round(Number(form.priceCents) * 100), durationMinutes: Number(form.durationMinutes), categorySlug: form.categorySlug, attributes: form.photo ? { photoUrl: form.photo } : {} });
      setNote(`${name} is on your listing.`);
      setForm({ name: "", description: "", priceCents: "", durationMinutes: 60, photo: "", categorySlug: business.category?.slug || "" });
      setShowForm(false);
      load();
      onChange();
    } catch (err) { setError(err.message); }
  }

  function removeService(s) {
    if (!confirm(`Remove ${s.name} from your listing? Customers can no longer book it.`)) return;
    setBusy(s.id);
    setError("");
    setNote("");
    api.deleteService(s.id)
      .then(() => { setNote(`${s.name} was removed.`); load(); onChange(); })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(""));
  }

  // A failing save is reported inside the card, which keeps the fields the owner
  // typed intact instead of dropping them on a reload.
  async function saveService(s, payload) {
    await api.updateService(s.id, payload);
    setNote(`${payload.name} is updated.`);
    load();
    onChange();
  }

  const editService = editing ? services.find((s) => s.id === editing) : null;

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}
      {note && !error && <div className="alert alert-success">{note}</div>}

      <div className="panel">
        <div className="panel-head">
          <h3><Icon name="tag" size={17} />My services <span className="inbox-count">{services.length}</span></h3>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setShowForm((v) => !v); setError(""); }}>
            {showForm ? "Close" : "+ Add a service"}
          </button>
        </div>

        {showForm && (
          <div className="panel-body">
            <form onSubmit={addService} className="team-add">
              <div className="team-add-fields">
                <div className="field">
                  <label>Name</label>
                  <input required maxLength={80} placeholder="e.g. Burst pipe repair" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Description</label>
                  <input maxLength={200} placeholder="What the customer gets for this price" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Category of this service</label>
                  <select value={form.categorySlug} onChange={(e) => setForm((f) => ({ ...f, categorySlug: e.target.value }))}>
                    {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
                  </select>
                  <span className="hint">
                    Your listing itself sits in {business.category?.name || "its own category"} — a service can be filed under a
                    different one, e.g. a plumber selling a boiler service under Heating.
                  </span>
                </div>
                <div className="grid grid-2">
                  <div className="field">
                    <label>Price (USD)</label>
                    <input required type="number" min="0.01" step="0.01" value={form.priceCents} onChange={(e) => setForm((f) => ({ ...f, priceCents: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label>Duration (min)</label>
                    <input required type="number" min="5" step="5" value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} />
                  </div>
                </div>
                <ServicePhotoField businessId={business.id} value={form.photo} onChange={(photo) => setForm((f) => ({ ...f, photo }))} />
              </div>
              <button className="btn btn-primary">Add service</button>
              <p className="hint team-add-hint">
                Services appear on your listing page right away, and a customer booking one lands under Bookings where
                you can assign it to your team.
              </p>
            </form>
          </div>
        )}

        <div className="panel-body flush">
          {services.length === 0 && (
            <p className="team-empty">
              Nothing on offer yet. Add the services you do, at the price and time each one takes.
            </p>
          )}
          {services.length > 0 && (
            <div className="table-scroll">
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th className="svc-col-desc">Description</th>
                    <th className="svc-col-price">Price</th>
                    <th className="svc-col-duration">Duration</th>
                    <th className="svc-col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="svc-cell">
                          {s.attributes?.photoUrl ? (
                            <img className="svc-photo" src={s.attributes.photoUrl} alt="" />
                          ) : (
                            <span className="svc-photo svc-photo--empty" aria-hidden="true" />
                          )}
                          <div>
                            <div className="team-name">{s.name}</div>
                            <div className="svc-cat">
                              {categoryOf(s.categoryId)}
                              {s.categoryId !== business.categoryId && (
                                <em className="svc-cat-diff">not {categoryOf(business.categoryId)}</em>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="svc-col-desc"><span className="team-mail svc-desc">{s.description || "—"}</span></td>
                      <td className="svc-col-price"><strong>{formatMoney(s.priceCents)}</strong></td>
                      <td className="svc-col-duration">{s.durationMinutes || 60} min</td>
                      <td className="svc-col-actions">
                        <div className="team-actions">
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(s.id)}>Edit</button>
                          <button type="button" className="btn btn-danger btn-sm" disabled={busy === s.id} onClick={() => removeService(s)}>
                            {busy === s.id ? "…" : "Remove"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {services.length > 0 && (
        <p className="hint" style={{ marginTop: 12 }}>
          <strong>Edit</strong> changes what customers see and book — including the photo of the work — and <strong>Remove</strong> takes it off your listing.
        </p>
      )}

      {editService && (
        <ServiceEditCard
          service={editService}
          business={business}
          categories={categories}
          onClose={() => setEditing("")}
          onSave={(payload) => saveService(editService, payload)}
        />
      )}
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
  // Which row's role is being typed, so its access note can keep up with the words.
  const [roleDraft, setRoleDraft] = useState(null);
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

  // Any role the owner types is stored as written — the names in the list are
  // only suggestions, and an unchanged or blank field is not worth a request.
  function commitRole(member, value) {
    setRoleDraft(null);
    const title = String(value || "").trim();
    if (!title || title === member.title) return;
    changeRole(member, title);
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
              <datalist id="staff-role-list">
                {STAFF_ROLES.map((r) => <option key={r} value={r} />)}
              </datalist>
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
                        <input
                          className="team-role"
                          list="staff-role-list"
                          maxLength={40}
                          defaultValue={m.title}
                          placeholder="Their role"
                          disabled={!m.active || busy === m.id}
                          onChange={(e) => setRoleDraft({ id: m.id, title: e.target.value })}
                          onBlur={(e) => commitRole(m, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            commitRole(m, e.target.value);
                            e.target.blur();
                          }}
                        />
                        {m.active && (
                          <div className="team-grants">{roleGrants(roleDraft?.id === m.id ? roleDraft.title : m.title)}</div>
                        )}
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

// A review is the start of a conversation, not just a form field. The card keeps
// the one public line the listing page shows and adds the real chat underneath it,
// so the owner can send the same photos, stickers, emoji and voice notes a customer
// can — and both sides see it, because it is the Messages thread.
function ReviewChatCard({ review, business, onClose, reload }) {
  const overlayRef = useRef(null);
  const endRef = useRef(null);
  const [draft, setDraft] = useState(review.ownerReply || "");
  const [saving, setSaving] = useState(false);
  const [replyError, setReplyError] = useState("");
  const { messages, error, push } = useChatThread(business.id, review.customerId);
  const name = review.customer?.name || "Customer";

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => { stickToBottom(endRef.current); }, [messages]);

  const addressPin = hasCoords(business)
    ? { latitude: business.latitude, longitude: business.longitude, name: `${business.name} address` }
    : null;

  async function saveReply(e) {
    e.preventDefault();
    setSaving(true);
    setReplyError("");
    try {
      await api.replyToReview(review.id, draft);
      reload();
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="team-pop-overlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Reply to ${name}’s review`}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="team-pop">
        <div className="team-pop-head">
          <span className="team-avatar team-avatar--initials">{initials(name)}</span>
          <div className="team-pop-id">
            <h3>{name}’s review</h3>
            <p>{business.name} · {new Date(review.createdAt).toLocaleDateString()}</p>
          </div>
          <button type="button" className="team-pop-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="team-pop-body">
          <div className="review-quote">
            <StarDisplay rating={review.rating} />
            <p>{review.comment || "They rated the job without writing anything."}</p>
          </div>

          <div className="team-pop-section">
            <h4>Public reply on your listing</h4>
            {review.ownerReply && <p className="review-reply">{review.ownerReply}</p>}
            {replyError && <div className="alert alert-error">{replyError}</div>}
            <form onSubmit={saveReply} className="msg-row">
              <input
                maxLength={500}
                placeholder={review.ownerReply ? "Update your public reply…" : "Write a public reply…"}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" className="btn btn-outline btn-sm" disabled={saving || !draft.trim()}>
                {saving ? "…" : review.ownerReply ? "Update" : "Reply"}
              </button>
            </form>
          </div>

          <div className="team-pop-section">
            <h4>Chat with {name}</h4>
            <p className="team-pop-note">
              Photos, video, documents, stickers, emoji, voice notes and locations all work here — this is the same
              conversation {name} has under Messages, so their answers arrive in both places.
            </p>
            <div className="msg-thread review-thread">
              {messages.length === 0 && <p className="hint">Nothing sent yet. Thanks, apologies and fixes all land here.</p>}
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} mine={m.senderId !== review.customerId} />
              ))}
              <div ref={endRef} />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <ChatComposer
              businessId={business.id}
              customerId={review.customerId}
              addressPin={addressPin}
              onSent={push}
              placeholder={`Message ${name}…`}
            />
            {!addressPin && (
              <p className="hint">Pin your location under Business details to send customers your address.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewsPanel({ business }) {
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState("");       // review id shown in the card

  function load() { api.businessReviews(business.id).then(setReviews).catch((e) => setError(e.message)); }
  useEffect(() => { setOpen(""); load(); }, [business.id]);

  const detail = open ? reviews.find((r) => r.id === open) : null;
  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel">
        <div className="panel-head">
          <h3><Icon name="star" size={17} />Reviews <span className="inbox-count">{reviews.length}</span></h3>
          {avg && <span className="hint">{avg} average</span>}
        </div>

        <div className="panel-body flush">
          {reviews.length === 0 && (
            <p className="team-empty">
              No reviews yet. A customer can rate a job once it is marked complete.
            </p>
          )}
          {reviews.length > 0 && (
            <div className="table-scroll">
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Reviewer</th>
                    <th>Rating</th>
                    <th className="rev-col-words">Their words</th>
                    <th className="rev-col-reply">Public reply</th>
                    <th className="rev-col-when">When</th>
                    <th className="rev-col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="team-member">
                          <span className="team-avatar team-avatar--initials">{initials(r.customer?.name)}</span>
                          <div className="team-id">
                            <div className="team-name">{r.customer?.name || "Customer"}</div>
                            {r.customer?.email && <div className="team-mail">{r.customer.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td><StarDisplay rating={r.rating} /></td>
                      <td className="rev-col-words"><span className="team-mail svc-desc">{r.comment || "—"}</span></td>
                      <td className="rev-col-reply">
                        {r.ownerReply
                          ? <span className="pill pill-approved">Replied</span>
                          : <span className="assign-none">Not replied</span>}
                      </td>
                      <td className="rev-col-when team-joined">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="rev-col-actions">
                        <div className="team-actions">
                          <button
                            type="button"
                            className={`btn btn-sm ${r.ownerReply ? "btn-outline" : "btn-primary"}`}
                            onClick={() => setOpen(r.id)}
                          >
                            {r.ownerReply ? "Reply & chat" : "Reply"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {reviews.length > 0 && (
        <p className="hint" style={{ marginTop: 12 }}>
          The public line stays on your listing page for everyone to read; the chat underneath it is private between
          you and that customer.
        </p>
      )}

      {detail && (
        <ReviewChatCard review={detail} business={business} onClose={() => setOpen("")} reload={load} />
      )}
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
        <div className="field"><label>Name</label><input required maxLength={80} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
        <div className="field"><label>Description</label><textarea required rows={3} maxLength={500} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
        <div className="grid grid-2">
          <div className="field"><label>Place</label><CitySelect cities={cities} value={form.city} onChange={(city) => setForm((f) => ({ ...f, city }))} placeholder="Select your city…" showCounts={false} /></div>
          <div className="field"><label>Phone number</label><input required type="tel" maxLength={30} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
        </div>
        <div className="field"><label>Address</label><input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
        <div className="field">
          <label>Website</label>
          <input
            required
            value={form.website}
            maxLength={200}
            placeholder="pipepro.co.ke"
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
          />
          <span className="hint">Customers open your site in a new tab from your listing page, and the same link shows in your dashboard.</span>
        </div>

        <div className="field">
          <label>Location on Google Maps</label>
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
