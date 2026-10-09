import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Icon from "./Icon.jsx";
import { readToken } from "../utils/tokenStore";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const popRef = useRef(null);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showDropdown) return undefined;
    function onDown(e) {
      if (!popRef.current?.contains(e.target)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showDropdown]);

  async function loadUnreadCount() {
    if (!readToken()) return;
    try {
      const data = await api.unreadCount();
      setUnreadCount(data.count);
    } catch (err) {
      console.error("Failed to load unread count", err);
    }
  }

  async function loadNotifications() {
    try {
      const data = await api.notifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  }

  async function markAllRead() {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  }

  function toggleDropdown() {
    if (!showDropdown) loadNotifications();
    setShowDropdown(!showDropdown);
  }

  return (
    <div className="dash-bell" ref={popRef}>
      <button
        type="button"
        className="dash-icon-btn"
        onClick={toggleDropdown}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      >
        <Icon name="bell" size={16} />
        {unreadCount > 0 && <span className="dash-bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="notif-pop">
          <div className="notif-pop-head">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button type="button" className="linklike" onClick={markAllRead}>Mark all read</button>
            )}
          </div>

          {notifications.length === 0 && <div className="notif-empty">No notifications</div>}

          {notifications.map((n) => (
            <div key={n.id} className={`notif-item${n.readAt ? "" : " notif-item--unread"}`}>
              {n.subject && <strong>{n.subject}</strong>}
              <p>{n.message}</p>
              <time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString()}</time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
