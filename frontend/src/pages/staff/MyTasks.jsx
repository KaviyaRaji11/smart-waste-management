import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import StatusBadge, { PriorityBadge } from "../../components/StatusBadge";
import MapView, { escapeHtml } from "../../components/MapView";
import { Alert, EmptyState, Icon, Loading, PageHeader, Tracker, TASK_STEPS } from "../../components/ui";

const NEXT_STATUS = {
  assigned: "in-progress",
  "in-progress": "completed",
};

const NEXT_LABEL = {
  assigned: "Start Collection",
  "in-progress": "Mark Completed",
};

const PRIORITY_COLORS = { High: "#e5484d", Medium: "#e0a020", Low: "#25a35f" };

const directionsUrl = (lat, lng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

export default function MyTasks() {
  const [assignments, setAssignments] = useState([]);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [position, setPosition] = useState(null); // live GPS position of the staff member
  const [geoNote, setGeoNote] = useState("");
  const [routeBusy, setRouteBusy] = useState(false);
  const positionRef = useRef(null);
  const firstFix = useRef(true);

  // Nearest Neighbor route over my open tasks, starting from where I am
  const loadRoute = useCallback(async (from, reorder = false) => {
    setRouteBusy(true);
    try {
      const params = from ? { lat: from.lat, lng: from.lng } : {};
      if (reorder) params.reorder = 1;
      const { data } = await api.get("/staff/route", { params });
      setRoute(data.route);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to plan the route");
    } finally {
      setRouteBusy(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/staff/tasks");
      setAssignments(data.assignments);
      await loadRoute(positionRef.current);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [loadRoute]);

  useEffect(() => {
    load();
  }, [load]);

  // Track my live position for the blue dot on the map
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoNote("Live location is not supported here, so the route starts at the most urgent bin.");
      return undefined;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        positionRef.current = here;
        setPosition(here);
        setGeoNote("");
        // Re-plan once, from the first position we get
        if (firstFix.current) {
          firstFix.current = false;
          loadRoute(here);
        }
      },
      () => setGeoNote("Location access is off, so the route starts at the most urgent bin."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [loadRoute]);

  const advance = async (assignment) => {
    const next = NEXT_STATUS[assignment.taskStatus];
    if (!next) return;
    setError("");
    try {
      await api.patch(`/tasks/${assignment._id}/status`, { taskStatus: next });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update task");
    }
  };

  const stops = route?.order || [];

  const markers = useMemo(
    () =>
      stops.map((s) => ({
        id: s.id,
        lat: s.lat,
        lng: s.lng,
        color: PRIORITY_COLORS[s.priorityLevel] || "#1b7f4f",
        label: String(s.stop),
        popup: `<div class="map-popup"><strong>Stop ${s.stop}: ${escapeHtml(s.name)}</strong>
          <div class="map-popup-state" style="--pin:${PRIORITY_COLORS[s.priorityLevel] || "#1b7f4f"}">${escapeHtml(
            s.priorityLevel
          )} priority</div><p>${escapeHtml(s.description)}</p></div>`,
      })),
    [stops]
  );

  const line = useMemo(() => {
    const pts = stops.map((s) => [s.lat, s.lng]);
    return route?.startsFromStaffLocation && route.depot ? [[route.depot.lat, route.depot.lng], ...pts] : pts;
  }, [stops, route]);

  // Open tasks in route order first, finished ones after
  const orderOf = Object.fromEntries(stops.map((s) => [s.taskId, s.stop]));
  const sorted = [...assignments].sort((a, b) => {
    const ao = orderOf[a._id];
    const bo = orderOf[b._id];
    if (ao && bo) return ao - bo;
    if (ao) return -1;
    if (bo) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div className="page">
      <PageHeader
        title="My Assigned Tasks"
        subtitle="Follow your route to collect the bins in order, start each collection and mark it completed when you are done."
      />
      {error && <Alert type="error">{error}</Alert>}
      {geoNote && <Alert type="info">{geoNote}</Alert>}
      {loading && <Loading label="Loading tasks..." />}

      {!loading && assignments.length === 0 && (
        <div className="card">
          <EmptyState icon="truck" title="No tasks yet">
            No tasks assigned to you yet.
          </EmptyState>
        </div>
      )}

      {stops.length > 0 && (
        <section className="card route-panel">
          <div className="route-panel-head">
            <div>
              <h2>Your route to collect bins</h2>
              <p className="hint">
                {stops.length} stop{stops.length > 1 ? "s" : ""} · about {route.totalDistanceKm} km
                {route.startsFromStaffLocation ? " from your location" : ""} ·{" "}
                {route.plannedByAdmin ? "Route set by your admin" : "Nearest Neighbor on Haversine distance"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {route.hasAdminRoute && !route.plannedByAdmin && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadRoute(position)} disabled={routeBusy}>
                  Use admin's order
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => loadRoute(position, true)}
                disabled={routeBusy}
              >
                <Icon name="route" size={16} />
                {routeBusy ? "Planning..." : "Re-plan from my location"}
              </button>
            </div>
          </div>

          <div className="route-panel-body">
            <MapView markers={markers} polyline={line} user={position} height={380} />

            <ol className="stop-list">
              {stops.map((s) => (
                <li key={s.id}>
                  <span className="stop-num" style={{ background: PRIORITY_COLORS[s.priorityLevel] || "#1b7f4f" }}>
                    {s.stop}
                  </span>
                  <div>
                    <strong>{s.name}</strong>
                    <small>
                      {s.legKm} km {s.stop === 1 && !route.startsFromStaffLocation ? "(start)" : "from previous"} ·{" "}
                      {s.priorityLevel}
                    </small>
                  </div>
                  <a
                    className="btn btn-ghost btn-sm"
                    href={directionsUrl(s.lat, s.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name="navigate" size={14} />
                    Directions
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <div className="task-grid">
        {sorted.map((a) => (
          <article className="task-card" key={a._id}>
            <div className="task-top">
              <span className="task-badges">
                {orderOf[a._id] && <span className="badge stop-chip">Stop {orderOf[a._id]}</span>}
                <PriorityBadge level={a.report?.priorityLevel} />
              </span>
              <StatusBadge status={a.taskStatus} />
            </div>
            <h3 className="task-title">{a.report?.description}</h3>
            <ul className="task-meta">
              <li><Icon name="flag" size={16} /><span>Priority: <strong>{a.report?.priorityLevel}</strong>{a.report?.priorityScore !== undefined && ` (score ${a.report.priorityScore}/100)`}</span></li>
              <li>
                <Icon name="pin" size={16} />
                <span>
                  Location: {a.report?.location?.address ||
                    (a.report?.location?.lat ? `${a.report.location.lat}, ${a.report.location.lng}` : "Not provided")}
                </span>
              </li>
              <li><Icon name="calendar" size={16} /><span>Assigned: {new Date(a.createdAt).toLocaleString()}</span></li>
            </ul>
            <Tracker status={a.taskStatus} steps={TASK_STEPS} />
            {NEXT_STATUS[a.taskStatus] && (
              <button type="button" className="btn btn-primary btn-block" onClick={() => advance(a)}>
                {NEXT_LABEL[a.taskStatus]}
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
