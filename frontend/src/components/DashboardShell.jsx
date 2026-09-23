import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "./NotificationBell.jsx";

const ICONS = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5",
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-14v5h6V6h-6Z",
  users: "M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm12.5 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  store: "M4 9h16l-1-5H5L4 9Zm1 0v11h14V9M9 20v-6h6v6",
  calendar: "M8 2v4m8-4v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z",
  tag: "M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h8l8.6 8.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01",
  star: "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z",
  chat: "M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5q0-.5-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L15.5 3h-7l-.3 2.5q-.9.4-1.7 1l-2.4-1-2 3.5 2 1.5a8 8 0 0 0 0 2l-2 1.5 2 3.5 2.4-1q.8.6 1.7 1l.3 2.5h7l.3-2.5q.9-.4 1.7-1l2.4 1 2-3.5-2-1.5q.1-.5.1-1Z",
  clipboard: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2",
  wallet: "M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M3 7h16a2 2 0 0 1 2 2v2h-5a2 2 0 0 0 0 4h5",
  grid: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z",
  heart: "M12 21S4 14.6 4 9.9A4.4 4.4 0 0 1 8.4 5.5c1.4 0 2.8.7 3.6 1.9a4.5 4.5 0 0 1 3.6-1.9A4.4 4.4 0 0 1 20 9.9C20 14.6 12 21 12 21Z",
  image: "M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm4 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-5 9 6-6 4 4 3-3 5 5",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9m-4.3 13a2 2 0 0 1-3.4 0",
  search: "m21 21-5-5M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  shield: "M12 2 4 5.5V11c0 6 3.4 10.3 8 11 4.6-.7 8-5 8-11V5.5L12 2Z",
  pin: "M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  alert: "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2m20 0V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6Z",
  idcard: "M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm5 6a2.2 2.2 0 1 0 0-4.4A2.2 2.2 0 0 0 8 11Zm-3.2 5c.5-1.7 1.6-2.6 3.2-2.6s2.7.9 3.2 2.6M14 9h6M14 13h6M14 16.5h4",
};

function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name] || ICONS.dashboard} />
    </svg>
  );
}

function initials(name) {
  return (name || "?").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function DashboardShell({
  accent,
  navItems,
  active,
  onNav,
  title,
  searchPlaceholder,
  onSearch,
  children,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const roleLabel = (user?.currentRole || user?.role || "").replace("_", " ").toLowerCase();

  const primary = navItems.slice(0, 4);
  const overflow = navItems.slice(4);

  // Tables are laid out at their natural width; on phones that pushes the page
  // sideways, so give every one a horizontally scrollable wrapper.
  useEffect(() => {
    document.querySelectorAll("table.data-table").forEach((t) => {
      const p = t.parentElement;
      if (!p || /table-scroll/.test(p.className) || /auto|scroll|hidden/.test(getComputedStyle(p).overflowX)) return;
      const wrap = document.createElement("div");
      wrap.className = "table-scroll";
      p.insertBefore(wrap, t);
      wrap.appendChild(t);
    });
  }, [children, active]);

  const go = (key) => { setMoreOpen(false); onNav(key); };

  return (
    <div className={`dash-shell dash-${accent}`}>
      <aside className="dash-sidebar">
        <Link to="/" className="dash-brand">
          <span className="brand-mark">N</span>
          Nearby
        </Link>
        <nav className="dash-menu">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={active === item.key ? "active" : ""}
              onClick={() => onNav(item.key)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="dash-side-footer">
          <div className="dash-user-card">
            <span className="dash-avatar">{initials(user?.name)}</span>
            <div className="dash-user-meta">
              <span className="dash-user-name">{user?.name}</span>
              <span className="dash-user-role">{roleLabel}</span>
            </div>
          </div>
        </div>
      </aside>

      <nav className="dash-mnav" aria-label="Dashboard sections">
        {primary.map((item) => (
          <button
            key={item.key}
            type="button"
            className={active === item.key ? "active" : ""}
            onClick={() => onNav(item.key)}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </button>
        ))}
        {overflow.length > 0 && (
          <button type="button" className={overflow.some((o) => o.key === active) ? "active" : ""} onClick={() => setMoreOpen(true)}>
            <Icon name="grid" size={20} />
            <span>More</span>
          </button>
        )}
      </nav>

      {moreOpen && (
        <div className="dash-drawer" role="dialog" aria-modal="true" aria-label="More sections">
          <div className="dash-drawer-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="dash-drawer-panel">
            <div className="dash-drawer-head">
              <span>More</span>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close">✕</button>
            </div>
            {overflow.map((item) => (
              <button
                key={item.key}
                type="button"
                className={active === item.key ? "active" : ""}
                onClick={() => go(item.key)}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="dash-main">
        <header className="dash-header">
          <h1 className="dash-title">{title}</h1>
          <div className="dash-header-right">
            {searchPlaceholder && (
              <form
                className="dash-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = new FormData(e.target).get("q") || "";
                  if (onSearch) onSearch(String(q).trim());
                }}
              >
                <Icon name="search" size={16} />
                <input name="q" placeholder={searchPlaceholder} />
              </form>
            )}
            <NotificationBell />
            <span className="dash-avatar">{initials(user?.name)}</span>
            <div className="dash-user-meta">
              <span className="dash-user-name">{user?.name}</span>
              <span className="dash-user-role">{roleLabel}</span>
            </div>
            <button
              type="button"
              className="dash-signout"
              onClick={() => { logout(); navigate("/"); }}
              aria-label="Sign out"
            >
              <Icon name="logout" size={16} />
            </button>
          </div>
        </header>
        <main className="dash-content">{children}</main>
      </div>
    </div>
  );
}

export { Icon };
