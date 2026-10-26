import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Icon } from "../components/ui";

/* Illustration of the product itself: a street map with a planned
   collection route, a citizen report and its progress. */
function HeroVisual() {
  return (
    <div className="hv" aria-hidden="true">
      <svg className="hv-map" viewBox="0 0 520 400" preserveAspectRatio="xMidYMid slice">
        <rect width="520" height="400" fill="#e6efe7" />
        <path d="M-10 90 C120 60 200 140 330 110 S500 60 540 90 V0 H-10Z" fill="#cfe4d5" />
        <path d="M0 330 C90 300 160 360 250 340 S430 290 520 330 V400 H0Z" fill="#cfe4d5" />
        <g stroke="#fff" strokeWidth="14" strokeLinecap="round" fill="none">
          <path d="M-10 210 H540" />
          <path d="M130 -10 V410" />
          <path d="M360 -10 V410" />
          <path d="M-10 300 L540 140" />
        </g>
        <g stroke="#fff" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.9">
          <path d="M-10 150 H540" />
          <path d="M250 -10 V410" />
          <path d="M440 -10 V410" />
        </g>
        <path
          d="M72 250 C130 250 130 210 190 205 S300 190 360 210 S420 130 452 112"
          fill="none" stroke="#1b7f4f" strokeWidth="4" strokeDasharray="1 10" strokeLinecap="round"
        />
        {[[72, 250, "#e5484d", 1], [250, 197, "#f4b73f", 2], [360, 210, "#f4b73f", 3], [452, 112, "#1b7f4f", 4]].map(([x, y, c, n]) => (
          <g key={n} transform={`translate(${x} ${y})`}>
            <circle r="16" fill={c} stroke="#fff" strokeWidth="4" />
            <text y="5" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff" fontFamily="Figtree, sans-serif">{n}</text>
          </g>
        ))}
      </svg>

      <div className="hv-card hv-report">
        <div className="hv-thumb"><Icon name="image" size={22} /></div>
        <div>
          <strong>Overflowing bin near bus stop</strong>
          <div className="hv-badges">
            <span className="badge p-high">High</span>
            <span className="badge s-assigned"><i className="dot" />Assigned</span>
          </div>
        </div>
      </div>

      <div className="hv-card hv-route">
        <span className="hv-route-icon"><Icon name="route" size={18} /></span>
        <div>
          <small>Suggested route</small>
          <strong>4 stops · 6.2 km</strong>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: "pin", title: "Report overflows", text: "Citizens submit a report with description, location and severity in seconds." },
  { icon: "shield", title: "Review & assign", text: "Admins verify reports, set priority and assign them to collection staff." },
  { icon: "route", title: "Route planning", text: "A nearest-neighbor route planner suggests a practical collection order." },
  { icon: "chart", title: "Analytics", text: "A live dashboard tracks pending, assigned and completed collection work." },
];

const ROLES = [
  { icon: "user", name: "Citizens", points: ["Report a bin with a photo and location", "Track the status of every report", "Cancel a report that is still pending"] },
  { icon: "users", name: "Admins", points: ["Review reports and adjust priority", "Assign collection tasks to staff", "Plan routes and monitor analytics"] },
  { icon: "truck", name: "Collection staff", points: ["See the tasks assigned to you", "Start and complete each collection", "Follow the suggested route order"] },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <h1>Overflowing bins, reported and cleared faster.</h1>
          <p>
            Connecting citizens, administrators and collection staff to report, prioritize,
            assign and track overflowing public waste bins — with a route planner to help
            organize collection.
          </p>
          {!user && (
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                Get Started
                <Icon name="arrowRight" size={18} />
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg">Login</Link>
            </div>
          )}
        </div>
        <HeroVisual />
      </section>

      <section className="section" aria-labelledby="features-title">
        <h2 id="features-title" className="section-title">What the system does</h2>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <article className="feature" key={f.title}>
              <span className="feature-icon"><Icon name={f.icon} size={22} /></span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="roles-title">
        <h2 id="roles-title" className="section-title">Built for three kinds of users</h2>
        <div className="role-grid">
          {ROLES.map((r) => (
            <article className="role" key={r.name}>
              <div className="role-head">
                <span className="role-icon"><Icon name={r.icon} size={20} /></span>
                <h3>{r.name}</h3>
              </div>
              <ul>
                {r.points.map((p) => (
                  <li key={p}><Icon name="check" size={16} />{p}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
