import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { Alert, EmptyState, Icon, PageHeader } from "../../components/ui";
import MapView, { escapeHtml } from "../../components/MapView";

export default function RouteOptimizer() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [staffId, setStaffId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [success, setSuccess] = useState("");

  const loadReports = () =>
    api.get("/reports").then(({ data }) => {
      // Only open reports with coordinates that nobody has been given yet
      setReports(
        data.reports.filter(
          (r) => typeof r.location?.lat === "number" && ["pending", "verified"].includes(r.status)
        )
      );
    });

  useEffect(() => {
    loadReports().catch(() => setError("Failed to load reports"));
    api
      .get("/assignments/staff-list")
      .then(({ data }) => setStaffList(data.staff))
      .catch(() => setError("Failed to load staff list"));
  }, []);

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    // The selection changed, so the old route no longer matches it
    setResult(null);
    setSuccess("");
  };

  const assignRoute = async () => {
    setError("");
    setSuccess("");
    if (!result) return;
    if (!staffId) {
      setError("Select the staff member who will collect this route.");
      return;
    }
    setAssigning(true);
    try {
      const { data } = await api.post("/routes/assign", {
        staffId,
        reportIds: result.order.map((p) => String(p.id)),
      });
      const skippedNote = data.skipped?.length ? ` (${data.skipped.length} skipped: already assigned or closed)` : "";
      setSuccess(`${data.message}${skippedNote}`);
      setResult(null);
      setSelected([]);
      setStaffId("");
      loadReports();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign route");
    } finally {
      setAssigning(false);
    }
  };

  const generate = async () => {
    setError("");
    setSuccess("");
    setResult(null);
    if (selected.length === 0) {
      setError("Select at least one report with a location.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/routes/optimize", { reportIds: selected });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate route");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Route Optimizer"
        subtitle="Pick the reports to collect, generate the best visiting order, then assign the whole route to one staff member."
      />
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <div className="route-layout">
        <section className="card">
          <div className="pick-head">
            <h2>Select locations to include</h2>
            <span className="hint">{selected.length} selected</span>
          </div>

          {reports.length === 0 && <p className="hint" style={{ marginBottom: 18 }}>No unassigned reports with a location right now.</p>}

          <div className="pick-list">
            {reports.map((r) => (
              <label key={r._id} className={`pick-item${selected.includes(r._id) ? " is-selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={selected.includes(r._id)}
                  onChange={() => toggle(r._id)}
                />
                <span>
                  <span className="pick-title">{r.location.address || r.description.slice(0, 40)}</span>
                  <span className="pick-coords">({r.location.lat}, {r.location.lng})</span>
                </span>
              </label>
            ))}
          </div>

          <button type="button" className="btn btn-primary btn-lg" onClick={generate} disabled={busy}>
            <Icon name="route" size={18} />
            {busy ? "Calculating..." : "Generate Route"}
          </button>
        </section>

        <section className="card route-result" aria-live="polite">
          {result ? (
            <>
              <h2>Suggested Collection Order</h2>
              <div className="route-stat">
                <span className="icon-tile"><Icon name="truck" size={22} /></span>
                <div>
                  <small>Estimated total distance</small>
                  <strong>{result.totalDistanceKm} km</strong>
                </div>
              </div>
              <MapView
                height={300}
                markers={result.order.map((p, i) => ({
                  id: String(p.id),
                  lat: p.lat,
                  lng: p.lng,
                  color: "#1b7f4f",
                  label: String(i + 1),
                  popup: `<div class="map-popup"><strong>Stop ${i + 1}: ${escapeHtml(p.name)}</strong></div>`,
                }))}
                polyline={result.order.map((p) => [p.lat, p.lng])}
              />
              <ol className="route-steps route-steps-spaced">
                {result.order.map((p) => (
                  <li key={p.id}>
                    <div>
                      <strong>{p.name}</strong>
                      <small>({p.lat}, {p.lng})</small>
                    </div>
                  </li>
                ))}
              </ol>
              {result.skippedNoCoordinates?.length > 0 && (
                <p className="hint">{result.skippedNoCoordinates.length} report(s) skipped — no coordinates on file.</p>
              )}
              <p className="hint" style={{ marginTop: 8 }}>{result.note}</p>

              <div className="assign-row" style={{ marginTop: 16 }}>
                <select
                  aria-label="Select staff for this route"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                >
                  <option value="">Select staff for this route...</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
                <button type="button" className="btn btn-primary" onClick={assignRoute} disabled={assigning}>
                  <Icon name="truck" size={16} />
                  {assigning ? "Assigning..." : "Assign route"}
                </button>
              </div>
            </>
          ) : (
            <EmptyState icon="route" title="No route yet">
              Select one or more locations and choose Generate Route. The suggested order will appear here.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}
