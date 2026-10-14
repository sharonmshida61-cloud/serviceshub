import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMoney } from "../api";
import { StarDisplay } from "../components/StarRating.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import DashboardShell from "../components/DashboardShell.jsx";
import Icon from "../components/Icon.jsx";
import { StatCard } from "../components/DashboardPanels.jsx";
import { SettingsPanel as AccountSettingsPanel } from "./Settings.jsx";
import ProfileCard from "../components/ProfileCard.jsx";
import ProviderInbox from "../components/ProviderInbox.jsx";
import TeamAvatar, { displayName, memberPhone, memberEmail } from "../components/TeamAvatar.jsx";
import { roleGrants } from "../utils/staffAccess.js";

// The panels a staff account may open are decided by the backend and sent with
// the workspace, so the sidebar can never offer something the API would refuse.
const META = {
  overview: { key: "overview", label: "Dashboard", icon: "dashboard", group: "Overview", subtitle: "What is on your board right now." },
  bookings: { key: "bookings", label: "Bookings", icon: "calendar", group: "Work", subtitle: "The jobs your role opens at this listing." },
  team: { key: "team", label: "Team", icon: "users", group: "Work", subtitle: "The people you work with here." },
  messages: { key: "messages", label: "Messages", icon: "chat", group: "Work", subtitle: "Chats with customers of this listing." },
  profile: { key: "profile", label: "Profile", icon: "idcard", group: "Account", subtitle: "Your sign-in details, name and profile picture." },
  settings: { key: "settings", label: "Settings", icon: "settings", group: "Account", subtitle: "Password and preferences." },
};
const ORDER = ["overview", "bookings", "team", "messages", "profile", "settings"];

function navFor(sections) {
  const allowed = new Set([...(sections || []), "settings"]);
  return ORDER.filter((k) => allowed.has(k)).map((k) => META[k]);
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [section, setSection] = useState("overview");
  const [error, setError] = useState("");

  useEffect(() => {
    api.staffWorkspaces()
      .then((list) => {
        setWorkspaces(list);
        setActiveId(list[0]?.employeeId ?? null);
      })
      .catch((e) => {
        setWorkspaces([]);
        setError(e.message);
      });
  }, []);

  const list = workspaces || [];
  const active = list.find((w) => w.employeeId === activeId) || null;
  const nav = navFor(active?.permissions?.sections || (workspaces === null ? ["overview"] : ["profile"]));

  // A teammate can be added at several listings with a different role at each,
  // so the current panel is whatever this workspace's role actually opens.
  const keys = nav.map((n) => n.key);
  const current = keys.includes(section) ? section : keys[0];
  const accountSection = current === "profile" || current === "settings";

  return (
    <DashboardShell
      accent="staff"
      navItems={nav}
      active={current}
      onNav={setSection}
      subtitle={accountSection ? META[current]?.subtitle : `${user?.name || "You"} · ${active?.title || "Team member"} at ${active?.business?.name || "your listing"}`}
      context={{ icon: "store", label: "Listing", value: active?.business?.name || (workspaces === null ? "Loading…" : "No listing yet") }}
      searchPlaceholder={keys.includes("bookings") ? "Search your jobs…" : undefined}
      onSearch={() => setSection("bookings")}
    >
      {error && <div className="alert alert-error">{error}</div>}

      {current === "settings" && <AccountSettingsPanel embed />}
      {current === "profile" && <ProfileCard user={user} />}

      {workspaces === null && <p>Loading…</p>}

      {workspaces !== null && list.length === 0 && (
        <div className="card staff-no-team">
          <span className="activity-icon tint-blue" style={{ margin: "0 auto 12px" }}><Icon name="users" size={22} /></span>
          <h2 style={{ marginBottom: 8 }}>No listing has added you yet</h2>
          <p style={{ color: "var(--ink-2)", marginBottom: 0 }}>
            When a business owner puts you on their team with this email, you sign in and land straight on your own
            dashboard for their listing. If they already added you, sign out and in again and the team will be picked up.
          </p>
        </div>
      )}

      {active && (
        <>
          {!accountSection && list.length > 1 && (
            <div className="staff-switcher">
              {list.map((w) => (
                <button
                  key={w.employeeId}
                  type="button"
                  className={`category-chip ${w.employeeId === activeId ? "active" : ""}`}
                  onClick={() => setActiveId(w.employeeId)}
                >
                  {w.business.name} <span className="staff-switcher-role">{w.title}</span>
                </button>
              ))}
            </div>
          )}

          {!accountSection && active.business.status !== "APPROVED" && (
            <div className="alert" style={{ background: "var(--amber-light)", borderLeft: "4px solid var(--amber, #f59e0b)", color: "#ffc978", marginBottom: 20 }}>
              <strong>{active.business.name} is {active.business.status.toLowerCase()}</strong> — the owner cannot take
              bookings on it yet, so there is nothing to work here until an admin approves it.
            </div>
          )}

          {current === "overview" && <StaffOverview workspace={active} onNavigate={setSection} />}
          {current === "bookings" && <StaffBookings workspace={active} />}
          {current === "team" && <StaffTeam workspace={active} />}
          {current === "messages" && <ProviderInbox business={active.business} />}
        </>
      )}
    </DashboardShell>
  );
}

function StaffOverview({ workspace, onNavigate }) {
  const { business, employeeId, permissions } = workspace;
  const [data, setData] = useState(null);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    setData(null);
    Promise.all([
      api.businessBookings(business.id).catch(() => []),
      api.servicesForBusiness(business.id).catch(() => []),
    ]).then(([bookings, services]) => setData({ bookings, services }));
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
  const { bookings, services } = data;
  const now = new Date();
  const sameDay = (d) => new Date(d).toDateString() === now.toDateString();
  const live = (b) => !["CANCELLED", "DECLINED"].includes(b.status);
  const mine = bookings.filter((b) => b.employeeId === employeeId && live(b));
  const todays = bookings.filter((b) => sameDay(b.scheduledAt) && live(b));
  const pending = bookings.filter((b) => b.status === "PENDING").length;
  const unclaimed = todays.filter((b) => !b.employeeId).length;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const collected = bookings
    .filter((b) => b.payment?.status === "PAID" && new Date(b.scheduledAt) >= monthStart)
    .reduce((s, b) => s + (b.payment?.amountCents || b.priceCents || 0), 0);

  const rating = business.avgRating ?? "—";
  const reviewCount = business.reviewCount ?? 0;

  const upcoming = bookings
    .filter((b) => ["PENDING", "CONFIRMED"].includes(b.status) && new Date(b.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 6);

  const about = [
    { label: "Your role", value: workspace.title },
    { label: "Owner", value: business.owner?.name },
    { label: "Owner phone", value: business.owner?.phone },
    { label: "Address", value: business.address },
    { label: "City", value: business.city },
  ].filter((r) => r.value);

  return (
    <div>
      <div className="stat-grid">
        <StatCard icon="calendar" color="blue" label="Today" value={todays.length} foot="On the board" footColor="blue" />
        <StatCard icon="clipboard" color="teal" label="My jobs" value={mine.length} foot="Assigned to you" footColor="teal" />
        {permissions.scope === "all" ? (
          <StatCard icon="inbox" color="red" label="Waiting for an answer" value={pending} foot="New requests" footColor="red" />
        ) : (
          <StatCard icon="inbox" color="amber" label="Unclaimed today" value={unclaimed} foot="Nobody on them yet" footColor="amber" />
        )}
        <StatCard icon="tag" color="purple" label="Services here" value={services.length} foot="Published" footColor="purple" />
        <StatCard icon="star" color="amber" label="Listing rating" value={rating} foot={`${reviewCount} reviews`} footColor="amber" />
        {permissions.money && (
          <StatCard icon="wallet" color="green" label="Collected this month" value={formatMoney(collected)} foot="Paid in" footColor="green" />
        )}
      </div>

      <div className="dash-2col">
        <section className="panel">
          <div className="panel-head">
            <h3><Icon name="calendar" size={17} />Next on your board</h3>
            {permissions.sections.includes("bookings") && (
              <button className="linklike" onClick={() => onNavigate("bookings")}>View all</button>
            )}
          </div>
          <div className="panel-body flush">
            {upcoming.length === 0 && <p style={{ padding: "16px 20px", margin: 0 }}>Nothing booked ahead of you.</p>}
            {upcoming.length > 0 && (
              <table className="data-table">
                <thead><tr><th>Customer</th><th>Service</th><th>When</th><th>Status</th></tr></thead>
                <tbody>
                  {upcoming.map((b) => (
                    <tr key={b.id}>
                      <td>{b.customer?.name || "Customer"}</td>
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

        <div>
          <div className="panel">
            <div className="panel-head"><h3><Icon name="shield" size={17} />Your role here</h3></div>
            <div className="panel-body">
              <p className="hint" style={{ margin: 0 }}>{roleGrants(workspace.title)}</p>
              {about.map((r) => (
                <div className="profile-row" key={r.label}>
                  <span className="hint">{r.label}</span>
                  <strong>{r.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="panel biz-card-panel">
            <div
              className="biz-photo"
              style={photo ? { backgroundImage: `url(${photo})` } : { background: "linear-gradient(135deg, #123a52, #1d6f8f)" }}
            />
            <div className="panel-body">
              <div className="biz-card-head">
                <div>
                  <div className="biz-name">{business.name}</div>
                  <div className="hint">{business.category?.name}{business.city ? ` · ${business.city}` : ""}</div>
                </div>
                <span className={`pill pill-${business.status.toLowerCase()}`}>
                  {business.status === "APPROVED" ? "Active" : business.status}
                </span>
              </div>
              <div className="biz-rating">
                <StarDisplay rating={Number(rating) || 0} />
                <span className="hint">{rating} ({reviewCount} reviews)</span>
              </div>
              <div className="btn-row" style={{ marginTop: 14 }}>
                <Link to={`/business/${business.id}`} className="btn btn-outline btn-sm">View public page</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffBookings({ workspace }) {
  const { business, employeeId, permissions } = workspace;
  const [rows, setRows] = useState(null);
  const [team, setTeam] = useState([]);
  const [error, setError] = useState("");
  const [scope, setScope] = useState("all");

  function load() { api.businessBookings(business.id).then(setRows).catch((e) => setError(e.message)); }

  useEffect(() => {
    setRows(null);
    setError("");
    load();
    // Only a role whose sections include the team list may read it; the API
    // refuses anyone else, so the assign picker is simply left empty.
    if (permissions.sections.includes("team")) {
      api.staffTeam(business.id).then(setTeam).catch(() => setTeam([]));
    } else {
      setTeam([]);
    }
  }, [business.id]);

  async function setStatus(b, status) {
    setError("");
    try { await api.updateBookingStatus(b.id, status); load(); } catch (e) { setError(e.message); }
  }

  async function assign(b, value) {
    setError("");
    try {
      const updated = await api.assignBooking(b.id, value);
      setRows((r) => r.map((x) => (x.id === b.id ? { ...x, ...updated } : x)));
    } catch (e) { setError(e.message); }
  }

  if (!rows) return <p>Loading…</p>;

  const now = new Date();
  const sameDay = (d) => new Date(d).toDateString() === now.toDateString();
  const shown = scope === "today"
    ? rows.filter((b) => sameDay(b.scheduledAt))
    : scope === "mine"
      ? rows.filter((b) => b.employeeId === employeeId)
      : rows;

  const who = (b) => b.assignedTo?.name
    || team.find((t) => t.id === b.employeeId)?.name
    || (b.employeeId === employeeId ? "You" : null);

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="staff-switcher">
        {[["all", "Everything you can see"], ["today", "Today"], ["mine", "Assigned to me"]].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`category-chip ${scope === key ? "active" : ""}`}
            onClick={() => setScope(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3><Icon name="calendar" size={17} />Bookings <span className="inbox-count">{shown.length}</span></h3>
          <span className="hint">
            {permissions.scope === "all" ? "The whole listing" : "Your jobs plus today's unclaimed work"}
          </span>
        </div>
        <div className="panel-body flush">
          {shown.length === 0 && (
            <p className="team-empty">
              Nothing here yet. {permissions.scope === "mine"
                ? "Jobs the owner puts your name on land on this board, along with anything unclaimed for today."
                : "New requests from customers will show up here."}
            </p>
          )}
          {shown.length > 0 && (
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Customer</th><th>Service</th><th>When</th><th>On it</th><th>Status</th>
                  {permissions.money && <th>Paid</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((b) => (
                  <tr key={b.id}>
                    <td>{b.customer?.name || "Customer"}</td>
                    <td>{b.service?.name}</td>
                    <td>{new Date(b.scheduledAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                    <td>
                      {permissions.assign ? (
                        <select
                          className="team-role"
                          value={b.employeeId || ""}
                          onChange={(e) => assign(b, e.target.value)}
                          disabled={!["PENDING", "CONFIRMED"].includes(b.status)}
                        >
                          <option value="">Unclaimed</option>
                          {team.map((t) => (
                            <option key={t.id} value={t.id}>
                              {displayName(t)} · {t.title}{t.isMe ? " (you)" : ""}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="hint">{who(b) || "Unclaimed"}</span>
                      )}
                    </td>
                    <td><span className={`pill pill-${b.status.toLowerCase()}`}>{b.status}</span></td>
                    {permissions.money && <td>{b.payment?.status === "PAID" ? "✓" : "—"}</td>}
                    <td>
                      <div className="team-actions">
                        {b.status === "PENDING" && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => setStatus(b, "CONFIRMED")}>Confirm</button>
                            {permissions.assign && (
                              <button className="btn btn-danger btn-sm" onClick={() => setStatus(b, "DECLINED")}>Decline</button>
                            )}
                          </>
                        )}
                        {b.status === "CONFIRMED" && (
                          <>
                            <button className="btn btn-outline btn-sm" onClick={() => setStatus(b, "COMPLETED")}>Mark complete</button>
                            {permissions.assign && (
                              <button className="btn btn-sm" onClick={() => setStatus(b, "CANCELLED")}>Cancel</button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {!permissions.assign && (
        <p className="hint" style={{ marginTop: 12 }}>
          Turning a booking down or moving it to someone else is the owner's or a manager's call.
        </p>
      )}
    </div>
  );
}

function StaffTeam({ workspace }) {
  const { business } = workspace;
  const [members, setMembers] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setMembers(null);
    api.staffTeam(business.id).then(setMembers).catch((e) => { setError(e.message); setMembers([]); });
  }, [business.id]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!members) return <p>Loading…</p>;

  return (
    <div>
      <div className="panel">
        <div className="panel-head">
          <h3><Icon name="users" size={17} />Team <span className="inbox-count">{members.length}</span></h3>
          <span className="hint">Read-only</span>
        </div>
        <div className="panel-body flush">
          {members.length === 0 && <p className="team-empty">You are the only one listed here so far.</p>}
          {members.length > 0 && (
            <table className="data-table" style={{ margin: 0 }}>
              <thead><tr><th>Team member</th><th>Role</th><th>Joined</th></tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="team-member">
                        <TeamAvatar member={m} />
                        <div className="team-id">
                          <div className="team-name">{displayName(m)}{m.isMe && <span className="staff-you">You</span>}</div>
                          {memberPhone(m) && <div className="team-mail">{memberPhone(m)}</div>}
                          {memberEmail(m) && <div className="team-mail">{memberEmail(m)}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{m.title}</td>
                    <td className="team-joined">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p className="hint" style={{ marginTop: 12 }}>
        Only the owner of {business.name} can add people, change roles or remove anyone.
      </p>
    </div>
  );
}
