import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Icon from "./Icon.jsx";
import NotificationBell from "./NotificationBell.jsx";

function initials(name) {
  return (name || "?").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function Avatar({ user, className = "dash-avatar" }) {
  const [broken, setBroken] = useState(false);
  const src = user?.avatarUrl;
  useEffect(() => setBroken(false), [src]);
  if (src && !broken) {
    return <img className={`${className} avatar-img`} src={src} alt="" onError={() => setBroken(true)} />;
  }
  return <span className={className}>{initials(user?.name)}</span>;
}

// Nav items carry an optional `group`; consecutive items sharing one get a label.
function groupItems(items) {
  const out = [];
  for (const item of items) {
    const group = item.group || "";
    const last = out[out.length - 1];
    if (last && last.group === group) last.items.push(item);
    else out.push({ group, items: [item] });
  }
  return out;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const p = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "shortOffset",
  }).formatToParts(now).reduce((a, x) => ({ ...a, [x.type]: x.value }), {});
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${p.timeZoneName}`;
}

export default function DashboardShell({
  accent,
  navItems,
  active,
  onNav,
  title,
  subtitle,
  context,
  searchPlaceholder,
  onSearch,
  children,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rail, setRail] = useState(false);
  const [tip, setTip] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const searchRef = useRef(null);
  const clock = useClock();

  const current = navItems.find((n) => n.key === active);
  const heading = title || current?.label || "";
  const sub = subtitle || current?.subtitle || "";
  const roleLabel = (user?.currentRole || user?.role || "").replace("_", " ").toLowerCase();

  const primary = navItems.slice(0, 4);
  const groups = groupItems(navItems);

  // Tables keep their natural width, so their container has to scroll instead of
  // pushing the page sideways. The existing parent is marked rather than a new
  // wrapper inserted: React must stay the only owner of the node tree, or a
  // table that later unmounts (empty filter) crashes the shell.
  useEffect(() => {
    document.querySelectorAll(".dash-shell table.data-table").forEach((t) => {
      t.parentElement?.classList.add("table-scroll");
    });
  }, [children, active]);

  // The search field advertises its own shortcut, so wire it up.
  useEffect(() => {
    if (!searchPlaceholder) return undefined;
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchPlaceholder]);

  useEffect(() => {
    const onFs = () => setExpanded(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const go = (key) => { setDrawerOpen(false); onNav(key); };

  function toggleSidebar() {
    if (window.matchMedia("(min-width: 901px)").matches) setRail((r) => !r);
    else setDrawerOpen(true);
  }

  // The rail scrolls inside the sidebar, so the tooltip is placed from the button's
  // live viewport rect instead of being anchored in CSS.
  function showTip(e, label) {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2, left: r.right + 10 });
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  return (
    <div className={`dash-shell dash-${accent}${rail ? " dash-collapsed" : ""}`}>
      <aside className="dash-sidebar">
        <Link to="/" className="dash-brand">
          <span className="brand-mark">N</span>
          <span>Nearby</span>
        </Link>
        <nav className="dash-menu">
          {groups.map((g) => (
            <div key={g.group || g.items[0].key}>
              {g.group && <div className="dash-group">{g.group}</div>}
              {g.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={active === item.key ? "active" : ""}
                  onClick={() => onNav(item.key)}
                  aria-label={item.label}
                  onMouseEnter={(e) => rail && showTip(e, item.label)}
                  onMouseLeave={() => setTip(null)}
                  onFocus={(e) => rail && showTip(e, item.label)}
                  onBlur={() => setTip(null)}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="dash-side-footer">
          <div className="dash-user-card">
            <Avatar user={user} />
            <div className="dash-user-meta">
              <span className="dash-user-name">{user?.name}</span>
              <span className="dash-user-role">{roleLabel}</span>
            </div>
          </div>
          <div className="dash-version">v1.0.0</div>
        </div>
      </aside>

      {rail && tip && (
        <span className="dash-tip" style={{ top: tip.top, left: tip.left }} aria-hidden="true">
          {tip.label}
        </span>
      )}

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
      </nav>

      {drawerOpen && (
        <div className="dash-drawer" role="dialog" aria-modal="true" aria-label="All sections">
          <div className="dash-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
          <div className="dash-drawer-panel">
            <div className="dash-drawer-head">
              <span>Sections</span>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close">✕</button>
            </div>
            {groups.map((g) => (
              <div key={g.group || g.items[0].key}>
                {g.group && <div className="dash-drawer-group">{g.group}</div>}
                {g.items.map((item) => (
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
            ))}
          </div>
        </div>
      )}

      <div className="dash-main">
        <header className="dash-header">
          <button
            type="button"
            className="dash-icon-btn"
            onClick={toggleSidebar}
            aria-label="Menu"
            aria-expanded={drawerOpen}
          >
            <Icon name="menu" size={17} />
          </button>
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
              <input ref={searchRef} name="q" placeholder={searchPlaceholder} />
              <span className="dash-kbd">Ctrl K</span>
            </form>
          )}
          <div className="dash-header-right">
            <span className="dash-clock">{clock}</span>
            <div className="dash-tools">
              <button type="button" className="dash-icon-btn" onClick={() => navigate("/")} aria-label="Public site">
                <Icon name="home" size={16} />
              </button>
              <button
                type="button"
                className="dash-icon-btn"
                onClick={toggleFullscreen}
                aria-label="Toggle fullscreen"
              >
                <Icon name={expanded ? "collapse" : "expand"} size={16} />
              </button>
            </div>
            <NotificationBell />
            <div className="dash-profile">
              <Avatar user={user} />
              <div className="dash-user-meta">
                <span className="dash-user-name">{user?.name}</span>
                <span className="dash-user-role">{roleLabel}</span>
              </div>
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
        <main className="dash-content">
          <div className="dash-pagehead">
            <div>
              <h1 className="dash-title">{heading}</h1>
              {sub && <p className="dash-subtitle">{sub}</p>}
            </div>
            {context && (
              <span className="dash-context">
                <Icon name={context.icon || "shield"} size={15} />
                <span>{context.label}</span>
                <strong>{context.value}</strong>
              </span>
            )}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
