import React from "react";
import { Link } from "react-router-dom";

/* ------------------------------------------------------------------
   Tiny dependency-free icon set (stroke icons, 24x24 grid)
------------------------------------------------------------------ */
const PATHS = {
  bin: <><path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M10 11v6M14 11v6" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  checkCircle: <><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  route: <><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" /></>,
  chart: <><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></>,
  bars: <path d="M5 21V10M12 21V4M19 21v-8" />,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z" /><circle cx="12" cy="13" r="3" /></>,
  alert: <><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  list: <><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6M9 16h4" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  arrowRight: <path d="M5 12h14M12 5l7 7-7 7" />,
  arrowLeft: <path d="M19 12H5M12 19l-7-7 7-7" />,
  truck: <><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>,
  inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1Z" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  locate: <><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /><path d="M4 4l16 16" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  leaf: <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  map: <><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4Z" /><path d="M8 2v16M16 6v16" /></>,
  trend: <><path d="M22 7 13.5 15.5 8.5 10.5 2 17" /><path d="M16 7h6v6" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  navigate: <path d="m3 11 19-9-9 19-2-8-8-2Z" />,
  flag: <><path d="M4 22V4" /><path d="M4 4h13l-2 4 2 4H4" /></>,
};

export function Icon({ name, size = 20, className = "", ...rest }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

/* ------------------------------------------------------------------
   Brand mark
------------------------------------------------------------------ */
export function BrandMark({ size = 36 }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <Icon name="bin" size={Math.round(size * 0.55)} />
    </span>
  );
}

/* ------------------------------------------------------------------
   Page header: title + short description + optional actions
------------------------------------------------------------------ */
export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </header>
  );
}

/* ------------------------------------------------------------------
   Alerts (error / success / info)
------------------------------------------------------------------ */
export function Alert({ type = "error", children }) {
  const icon = type === "success" ? "checkCircle" : type === "info" ? "info" : "alert";
  return (
    <div className={`alert alert-${type}`} role={type === "error" ? "alert" : "status"}>
      <Icon name={icon} size={18} />
      <span>{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------------
   Loading + empty states
------------------------------------------------------------------ */
export function Loading({ label = "Loading..." }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon = "inbox", title, children, to, actionLabel }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon name={icon} size={26} /></span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {to && <Link to={to} className="btn btn-primary">{actionLabel}</Link>}
    </div>
  );
}

/* ------------------------------------------------------------------
   Avatar with initials
------------------------------------------------------------------ */
export function Avatar({ name = "", size = 32 }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
      {initials}
    </span>
  );
}

/* ------------------------------------------------------------------
   Progress tracker for the report / task lifecycle.
   This IS a real sequence, so the steps are drawn in order.
------------------------------------------------------------------ */
export const REPORT_STEPS = [
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Verified" },
  { key: "assigned", label: "Assigned" },
  { key: "in-progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

export const TASK_STEPS = [
  { key: "assigned", label: "Assigned" },
  { key: "in-progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

export function Tracker({ status, steps = REPORT_STEPS }) {
  const current = steps.findIndex((s) => s.key === status);
  return (
    <ol className="tracker" aria-label="Progress">
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={s.key} className={`tracker-step is-${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="tracker-dot">{state === "done" && <Icon name="check" size={12} strokeWidth={3} />}</span>
            <span className="tracker-label">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
