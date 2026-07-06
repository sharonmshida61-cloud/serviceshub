import { useEffect, useState } from "react";
import { api } from "../api";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadUnreadCount() {
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
    if (!showDropdown) {
      loadNotifications();
    }
    setShowDropdown(!showDropdown);
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        className="linklike"
        onClick={toggleDropdown}
        style={{ position: "relative", fontSize: "1.2rem" }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -8,
              background: "#e53e3e",
              color: "white",
              borderRadius: "50%",
              width: 18,
              height: 18,
              fontSize: "0.7rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 8,
            width: 320,
            maxHeight: 400,
            overflowY: "auto",
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button className="linklike" onClick={markAllRead} style={{ fontSize: "0.85rem" }}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 && (
            <div style={{ padding: 16, textAlign: "center", color: "#666" }}>
              No notifications
            </div>
          )}

          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                padding: 16,
                borderBottom: "1px solid #eee",
                background: n.readAt ? "white" : "#f0f8ff",
              }}
            >
              {n.subject && <div style={{ fontWeight: 600, marginBottom: 4 }}>{n.subject}</div>}
              <div style={{ fontSize: "0.9rem", color: "#333" }}>{n.message}</div>
              <div style={{ fontSize: "0.75rem", color: "#999", marginTop: 4 }}>
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
