import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Avatar, BrandMark, Icon } from "./ui";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the page changes
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const item = (to, label, icon) => (
    <NavLink to={to} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
      <Icon name={icon} size={18} />
      {label}
    </NavLink>
  );

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          <BrandMark />
          <span className="brand-text">
            Smart Waste <span>Management</span>
          </span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="nav-panel"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <Icon name={open ? "close" : "menu"} size={22} />
        </button>

        <nav id="nav-panel" className={`nav-panel${open ? " open" : ""}`} aria-label="Main">
          <div className="nav-links">
            {!user && (
              <>
                {item("/login", "Login", "user")}
                <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
              </>
            )}
            {user && user.role === "citizen" && (
              <>
                {item("/citizen/report", "New Report", "plus")}
                {item("/citizen/my-reports", "My Reports", "list")}
              </>
            )}
            {user && user.role === "admin" && (
              <>
                {item("/admin/reports", "All Reports", "inbox")}
                {item("/admin/assign", "Assign", "users")}
                {item("/admin/routes", "Route Optimizer", "route")}
                {item("/map", "Live Map", "map")}
                {item("/admin/analytics", "Analytics", "bars")}
              </>
            )}
            {user && user.role === "staff" && (
              <>
                {item("/staff/tasks", "My Tasks", "truck")}
                {item("/map", "Live Map", "map")}
              </>
            )}
          </div>

          {user && (
            <div className="nav-user">
              {(user.role === "citizen" || user.role === "staff") && <NotificationBell role={user.role} />}
              <Avatar name={user.name} />
              <span className="nav-user-text">
                <strong>{user.name}</strong>
                <small>{user.role}</small>
              </span>
              <button type="button" onClick={handleLogout} className="btn btn-ghost btn-sm">
                <Icon name="logout" size={16} />
                Logout
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
