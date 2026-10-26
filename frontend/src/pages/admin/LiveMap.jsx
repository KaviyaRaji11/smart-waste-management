import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import MapView, { escapeHtml } from "../../components/MapView";
import { Alert, EmptyState, Loading, PageHeader } from "../../components/ui";

const COLORS = { High: "#e5484d", Medium: "#e0a020", Low: "#25a35f", clear: "#8a9aa0" };
const LABELS = { High: "High priority", Medium: "Medium priority", Low: "Low priority", clear: "No open reports" };
const REFRESH_MS = 15000;

const clock = (iso) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function popupHtml(bin) {
  const place = [bin.address, bin.area].filter(Boolean).join(", ") || `${bin.lat}, ${bin.lng}`;
  const top = bin.topReport;
  return `
    <div class="map-popup">
      <strong>${escapeHtml(place)}</strong>
      <div class="map-popup-state" style="--pin:${COLORS[bin.state]}">${escapeHtml(LABELS[bin.state])}${
        bin.openReports ? ` · score ${escapeHtml(bin.priorityScore)}/100` : ""
      }</div>
      ${top ? `<p>${escapeHtml(top.description)}</p>` : ""}
      ${top && top.imageUrl ? `<img src="${escapeHtml(top.imageUrl)}" alt="Reported waste" />` : ""}
      <small>${
        top
          ? `Fill level ${escapeHtml(top.fillLevel ?? "—")}% · ${escapeHtml(top.status)} · ${bin.openReports} open report(s)`
          : bin.lastCollectedAt
          ? `Last collected ${escapeHtml(new Date(bin.lastCollectedAt).toLocaleString())}`
          : "No open reports"
      }</small>
    </div>`;
}

// Live map of every bin, colour-coded by how urgent its open reports are
export default function LiveMap() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [show, setShow] = useState({ High: true, Medium: true, Low: true, clear: false });
  const [focus, setFocus] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/bins/map");
      setData(res.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load the live map");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const visible = useMemo(() => (data ? data.bins.filter((b) => show[b.state]) : []), [data, show]);

  const markers = useMemo(
    () =>
      visible.map((b) => ({
        id: b.id,
        lat: b.lat,
        lng: b.lng,
        color: COLORS[b.state],
        label: b.openReports > 0 ? String(b.openReports) : "",
        popup: popupHtml(b),
      })),
    [visible]
  );

  const urgent = useMemo(
    () =>
      data
        ? data.bins
            .filter((b) => b.openReports > 0)
            .sort((a, b) => b.priorityScore - a.priorityScore)
            .slice(0, 8)
        : [],
    [data]
  );

  const toggle = (state) => setShow((prev) => ({ ...prev, [state]: !prev[state] }));

  if (!data && !error) {
    return (
      <div className="page">
        <PageHeader title="Live Map" subtitle="Every bin, colour-coded by urgency." />
        <div className="card"><Loading label="Loading map..." /></div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader title="Live Map" subtitle="Every bin, colour-coded by how urgent its open reports are.">
        {data && (
          <span className="live-pill" title="The map refreshes every 15 seconds">
            <i /> Live · updated {clock(data.updatedAt)}
          </span>
        )}
      </PageHeader>

      {error && <Alert type="error">{error}</Alert>}

      {data && (
        <>
          <div className="legend" role="group" aria-label="Show bins">
            {["High", "Medium", "Low", "clear"].map((state) => (
              <label key={state} className={`legend-chip${show[state] ? " on" : ""}`}>
                <input type="checkbox" checked={show[state]} onChange={() => toggle(state)} />
                <i style={{ background: COLORS[state] }} />
                {LABELS[state]}
                <b>{data.summary[state] || 0}</b>
              </label>
            ))}
          </div>

          <div className="map-layout">
            <div className="card map-card">
              {data.bins.length === 0 ? (
                <EmptyState icon="map" title="No bins on the map yet">
                  Bins appear here as soon as citizens report overflowing bins with a location.
                </EmptyState>
              ) : (
                <MapView markers={markers} focus={focus} height={560} />
              )}
            </div>

            <aside className="card urgent">
              <h2>Most urgent bins</h2>
              {urgent.length === 0 ? (
                <p className="hint">No open reports right now.</p>
              ) : (
                <ol className="urgent-list">
                  {urgent.map((b) => (
                    <li key={b.id}>
                      <button type="button" onClick={() => setFocus({ id: b.id })}>
                        <i style={{ background: COLORS[b.state] }} />
                        <span>
                          <strong>{b.address || b.area || `${b.lat}, ${b.lng}`}</strong>
                          <small>
                            {b.openReports} open · score {b.priorityScore}/100
                          </small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
