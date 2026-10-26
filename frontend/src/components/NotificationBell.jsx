import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { Icon } from "./ui";

const POLL_MS = 20000;

function timeAgo(date) {
  const s = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

// In-app notifications for citizens and staff (checked every 20 seconds)
export default function NotificationBell({ role }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    if (!localStorage.getItem("swm_token")) return;
    try {
      const { data } = await api.get("/notifications");
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      /* the bell simply stays as it was */
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) load();
  };

  const markAll = async () => {
    try {
      await api.patch("/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      /* ignore */
    }
  };

  const openItem = async (n) => {
    if (!n.read) {
      try {
        await api.patch(`/notifications/${n._id}/read`);
        setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
        setUnread((u) => Math.max(0, u - 1));
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    navigate(role === "staff" ? "/staff/tasks" : "/citizen/my-reports");
  };

  return (
    <div className="bell" ref={wrapRef}>
      <button
        type="button"
        className="bell-btn"
        onClick={toggle}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Icon name="bell" size={20} />
        {unread > 0 && <span className="bell-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <div className="bell-panel" role="dialog" aria-label="Notifications">
          <div className="bell-head">
            <strong>Notifications</strong>
            <button type="button" className="bell-link" onClick={markAll} disabled={unread === 0}>
              Mark all as read
            </button>
          </div>
          {items.length === 0 ? (
            <p className="bell-empty">You're all caught up.</p>
          ) : (
            <ul className="bell-list">
              {items.map((n) => (
                <li key={n._id}>
                  <button type="button" className={`bell-item${n.read ? "" : " unread"}`} onClick={() => openItem(n)}>
                    <span className="bell-dot" aria-hidden="true" />
                    <span className="bell-text">
                      <strong>{n.title}</strong>
                      <span>{n.message}</span>
                      <small>{timeAgo(n.createdAt)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
