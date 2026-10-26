import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import StatusBadge from "../../components/StatusBadge";
import { Alert, Avatar, EmptyState, Loading, PageHeader } from "../../components/ui";

const STATUS_OPTIONS = ["pending", "verified", "assigned", "in-progress", "completed"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High"];

export default function AllReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports", {
        params: statusFilter ? { status: statusFilter } : {},
      });
      setReports(data.reports);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/reports/${id}/status`, { status });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    }
  };

  // "auto" hands the priority back to the Smart Priority Engine
  const changePriority = async (id, priorityLevel) => {
    try {
      await api.patch(`/reports/${id}/priority`, { priorityLevel });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update priority");
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="All Reports"
        subtitle="Most urgent first. Scores come from the Smart Priority Engine (hover a score to see why)."
      >
        <div className="filter">
          <label htmlFor="status-filter">Status</label>
          <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </PageHeader>

      {error && <Alert type="error">{error}</Alert>}

      <div className="card table-card">
        {loading && <div style={{ padding: "8px 20px" }}><Loading label="Loading reports..." /></div>}

        {!loading && reports.length === 0 ? (
          <EmptyState icon="inbox" title="No reports found">
            {statusFilter ? "No reports match this status. Try another filter." : "New reports from citizens will appear here."}
          </EmptyState>
        ) : (
          !loading && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Citizen</th>
                    <th>Location</th>
                    <th>Fill</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Reported</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => {
                    const b = r.priorityBreakdown || {};
                    const why = `Fill level ${b.fill ?? 0}/40 · Age ${b.age ?? 0}/25 · Duplicates ${b.duplicates ?? 0}/20 · Area ${b.area ?? 0}/15`;
                    return (
                      <tr key={r._id}>
                        <td className="col-desc">
                          <span className="clamp-2">{r.description}</span>
                          {r.duplicateCount > 0 && (
                            <span className="dup-chip" title="Other open reports for the same bin">
                              +{r.duplicateCount} similar report{r.duplicateCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="cell-user">
                            <Avatar name={r.citizen?.name || ""} size={30} />
                            <span>{r.citizen?.name}</span>
                          </div>
                        </td>
                        <td className="cell-muted">
                          {[r.location?.address, r.location?.area].filter(Boolean).join(", ") ||
                            (r.location?.lat ? `${r.location.lat}, ${r.location.lng}` : "—")}
                        </td>
                        <td>
                          <span className="fill-meter" title={`${r.fillLevel ?? "—"}% full`}>
                            <i style={{ width: `${r.fillLevel ?? 0}%` }} />
                          </span>
                          <small className="cell-muted">{r.fillLevel ?? "—"}%</small>
                        </td>
                        <td>
                          <select
                            className="select-sm"
                            aria-label="Priority"
                            value={r.priorityLevel}
                            onChange={(e) => changePriority(r._id, e.target.value)}
                          >
                            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <div className="score-line" title={why}>
                            Score <strong>{r.priorityScore ?? 0}</strong>/100
                            {r.priorityOverridden && (
                              <button type="button" className="bell-link" onClick={() => changePriority(r._id, "auto")}>
                                Manual · reset
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="status-cell">
                            <StatusBadge status={r.status} />
                            <select
                              className="select-sm"
                              aria-label="Change status"
                              value={r.status}
                              onChange={(e) => changeStatus(r._id, e.target.value)}
                            >
                              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </td>
                        <td className="cell-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
