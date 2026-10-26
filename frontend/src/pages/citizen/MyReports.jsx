import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import StatusBadge, { PriorityBadge } from "../../components/StatusBadge";
import { Alert, EmptyState, Icon, Loading, PageHeader, Tracker } from "../../components/ui";

export default function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  // ==========================================
  // FETCH MY REPORTS
  // ==========================================

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/reports");

      const data = response.data;

      const reportList = Array.isArray(data)
        ? data
        : data.reports || [];

      setReports(reportList);
    } catch (err) {
      console.error("Fetch reports error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load your reports."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // ==========================================
  // CANCEL REPORT
  // ==========================================

  const handleCancelReport = async (reportId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this report?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingId(reportId);
      setError("");

      await api.patch(
        `/reports/${reportId}/cancel`
      );

      // Update the report immediately on screen
      setReports((previousReports) =>
        previousReports.map((report) =>
          report._id === reportId
            ? {
                ...report,
                status: "cancelled",
              }
            : report
        )
      );
    } catch (err) {
      console.error(
        "Cancel report error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to cancel report."
      );
    } finally {
      setCancellingId(null);
    }
  };

  // ==========================================
  // DATE FORMAT
  // ==========================================

  const formatDate = (date) => {
    if (!date) {
      return "Not available";
    }

    return new Date(date).toLocaleString();
  };

  // ==========================================
  // IMAGE URL
  // ==========================================

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) {
      return "";
    }

    if (
      imageUrl.startsWith("http://") ||
      imageUrl.startsWith("https://")
    ) {
      return imageUrl;
    }

    const cleanPath = imageUrl.startsWith("/")
      ? imageUrl
      : `/${imageUrl}`;

    return `http://localhost:5001${cleanPath}`;
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="page">
        <PageHeader title="My Reports" subtitle="Track every waste report you have submitted." />
        <div className="card"><Loading label="Loading your reports..." /></div>
      </div>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error && reports.length === 0) {
    return (
      <div className="page">
        <PageHeader title="My Reports" subtitle="Track every waste report you have submitted." />
        <div className="card">
          <Alert type="error">{error}</Alert>
          <button type="button" className="btn btn-primary" onClick={fetchReports}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="page">
      <PageHeader title="My Reports" subtitle="Track every waste report you have submitted.">
        <Link to="/citizen/report" className="btn btn-primary">
          <Icon name="plus" size={18} />
          New Report
        </Link>
      </PageHeader>

      {error && <Alert type="error">{error}</Alert>}

      {reports.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="inbox"
            title="No reports yet"
            to="/citizen/report"
            actionLabel="Create your first report"
          >
            You have not submitted any reports yet.
          </EmptyState>
        </div>
      ) : (
        <div className="rep-list">
          {reports.map((report) => {
            const imageUrl = getImageUrl(report.imageUrl);
            const canCancel = report.status === "pending";
            const severityLabel =
              report.severity === 1 ? "Low" : report.severity === 3 ? "High" : "Medium";

            return (
              <article className="rep-card" key={report._id}>
                {/* PHOTO */}
                <div className="rep-media">
                  {imageUrl ? (
                    <div className="report-photo-container">
                      <img
                        src={imageUrl}
                        alt="Waste report"
                        className="report-photo"
                        onError={(e) => {
                          console.error("Image failed to load:", imageUrl);

                          e.currentTarget.style.display = "none";

                          const errorMessage =
                            e.currentTarget.parentElement.querySelector(".photo-error");

                          if (errorMessage) {
                            errorMessage.style.display = "flex";
                          }
                        }}
                      />

                      <div className="photo-error" style={{ display: "none" }}>
                        <Icon name="image" size={26} />
                        <p>Unable to load this photo.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="no-photo">
                      <Icon name="image" size={26} />
                      <p>No photo uploaded</p>
                    </div>
                  )}
                </div>

                {/* REPORT INFORMATION */}
                <div className="rep-body">
                  <div className="rep-head">
                    <h3 className="rep-title">{report.description || "Waste Report"}</h3>
                    <div className="rep-badges">
                      <StatusBadge status={report.status || "pending"} />
                      <PriorityBadge level={report.priorityLevel || "Medium"} />
                    </div>
                  </div>

                  {report.status !== "cancelled" && (
                    <Tracker status={report.status || "pending"} />
                  )}

                  <dl className="rep-facts">
                    {report.location?.address && (
                      <div className="wide">
                        <dt>Address</dt>
                        <dd>{report.location.address}</dd>
                      </div>
                    )}

                    {report.location?.area && (
                      <div>
                        <dt>Area</dt>
                        <dd>{report.location.area}</dd>
                      </div>
                    )}

                    {report.location?.city && (
                      <div>
                        <dt>City</dt>
                        <dd>{report.location.city}</dd>
                      </div>
                    )}

                    {report.location?.landmark && (
                      <div>
                        <dt>Landmark</dt>
                        <dd>{report.location.landmark}</dd>
                      </div>
                    )}

                    {report.location?.lat !== undefined && (
                      <div>
                        <dt>Latitude</dt>
                        <dd>{report.location.lat}</dd>
                      </div>
                    )}

                    {report.location?.lng !== undefined && (
                      <div>
                        <dt>Longitude</dt>
                        <dd>{report.location.lng}</dd>
                      </div>
                    )}

                    {(report.fillLevel !== undefined || report.severity !== undefined) && (
                      <div>
                        <dt>Bin fill level</dt>
                        <dd>
                          {report.fillLevel !== undefined ? `${report.fillLevel}%` : severityLabel}
                        </dd>
                      </div>
                    )}

                    {report.duplicateCount > 0 && (
                      <div>
                        <dt>Similar open reports</dt>
                        <dd>{report.duplicateCount} for this bin</dd>
                      </div>
                    )}

                    {report.priorityScore !== undefined && (
                      <div>
                        <dt>Priority score</dt>
                        <dd>{report.priorityScore}/100</dd>
                      </div>
                    )}

                    <div>
                      <dt>Reported</dt>
                      <dd>{formatDate(report.createdAt)}</dd>
                    </div>
                  </dl>

                  {/* CANCEL BUTTON */}
                  {canCancel && (
                    <div className="cancel-report-container">
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleCancelReport(report._id)}
                        disabled={cancellingId === report._id}
                      >
                        {cancellingId === report._id ? "Cancelling..." : "Cancel Report"}
                      </button>
                    </div>
                  )}

                  {report.status === "cancelled" && (
                    <div className="cancelled-message">
                      <Icon name="info" size={18} />
                      This report has been cancelled.
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
