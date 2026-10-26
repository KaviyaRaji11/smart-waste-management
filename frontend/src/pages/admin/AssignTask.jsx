import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import StatusBadge, { PriorityBadge } from "../../components/StatusBadge";
import { Alert, EmptyState, Icon, Loading, PageHeader } from "../../components/ui";

export default function AssignTask() {
  const [reports, setReports] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [selections, setSelections] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [reportsRes, staffRes] = await Promise.all([
        api.get("/reports", { params: { status: "verified" } }),
        api.get("/assignments/staff-list"),
      ]);
      // Also show pending, since a small class project may skip a separate "verify" step
      const pendingRes = await api.get("/reports", { params: { status: "pending" } });
      // Most urgent first
      const merged = [...reportsRes.data.reports, ...pendingRes.data.reports].sort(
        (a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)
      );
      setReports(merged);
      setStaffList(staffRes.data.staff);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const assign = async (reportId) => {
    const staffId = selections[reportId];
    if (!staffId) {
      setError("Select a staff member first");
      return;
    }
    setError("");
    setMessage("");
    try {
      const { data } = await api.post("/assignments", { reportId, staffId });
      const staffName = staffList.find((s) => s._id === staffId)?.name || "the staff member";
      const stops = data.route?.order?.length;
      setMessage(
        stops
          ? `Task assigned. Route Optimizer planned ${stops} stop${stops > 1 ? "s" : ""} (about ${data.route.totalDistanceKm} km) for ${staffName}.`
          : "Task assigned successfully"
      );
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign task");
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Assign Reports to Collection Staff"
        subtitle="Choose a staff member for each report that is waiting to be collected."
      />
      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}
      {loading && <Loading />}

      {staffList.length === 0 && !loading && (
        <Alert type="info">No staff accounts yet — have a staff member register first.</Alert>
      )}

      <div className="task-grid">
        {reports.map((r) => (
          <article className="task-card" key={r._id}>
            <div className="task-top">
              <PriorityBadge level={r.priorityLevel} />
              <StatusBadge status={r.status} />
            </div>
            <h3 className="task-title">{r.description}</h3>
            <ul className="task-meta">
              <li><Icon name="user" size={16} /><span>Citizen: <strong>{r.citizen?.name}</strong></span></li>
              <li><Icon name="flag" size={16} /><span>Priority: <strong>{r.priorityLevel}</strong> (score {r.priorityScore ?? 0}/100)</span></li>
              <li><Icon name="bin" size={16} /><span>Fill level: <strong>{r.fillLevel ?? "—"}%</strong>{r.duplicateCount > 0 && ` · ${r.duplicateCount} similar report${r.duplicateCount > 1 ? "s" : ""}`}</span></li>
              {(r.location?.address || r.location?.area) && (
                <li><Icon name="pin" size={16} /><span>{[r.location.address, r.location.area].filter(Boolean).join(", ")}</span></li>
              )}
            </ul>
            <div className="assign-row">
              <select
                aria-label="Select staff"
                value={selections[r._id] || ""}
                onChange={(e) => setSelections({ ...selections, [r._id]: e.target.value })}
              >
                <option value="">Select staff...</option>
                {staffList.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
              <button type="button" className="btn btn-primary" onClick={() => assign(r._id)}>Assign</button>
            </div>
          </article>
        ))}
      </div>

      {!loading && reports.length === 0 && (
        <div className="card">
          <EmptyState icon="checkCircle" title="All caught up">
            No unassigned reports right now.
          </EmptyState>
        </div>
      )}
    </div>
  );
}
