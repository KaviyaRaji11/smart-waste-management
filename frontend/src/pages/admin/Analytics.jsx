import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { Alert, Icon, Loading, PageHeader } from "../../components/ui";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

const STATUS_COLORS = {
  Pending: "#e0a020",
  Verified: "#3b94db",
  Assigned: "#6d5fe0",
  "In Progress": "#15a7b8",
  Completed: "#25a35f",
};
const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: "1px solid #dde6df",
  boxShadow: "0 10px 24px -12px rgba(15,42,29,.35)",
  fontFamily: "Figtree, sans-serif",
  fontSize: 13,
};

const PRIORITY_COLORS = { Low: "#25a35f", Medium: "#e0a020", High: "#e5484d" };

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/analytics")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load analytics"));
  }, []);

  if (error) return <div className="page"><Alert type="error">{error}</Alert></div>;
  if (!data) return <div className="page"><Loading label="Loading analytics..." /></div>;

  const totalsData = [
    { name: "Pending", value: data.totals.pending },
    { name: "Verified", value: data.totals.verified },
    { name: "Assigned", value: data.totals.assigned },
    { name: "In Progress", value: data.totals.inProgress },
    { name: "Completed", value: data.totals.completed },
  ];

  const priorityData = Object.entries(data.priorityDistribution).map(([name, value]) => ({ name, value }));

  const maxArea = Math.max(1, ...data.areaWiseReports.map((a) => a.count));
  const staffData = data.staffPerformance || [];
  const trendData = data.trend || [];
  const hasTrend = trendData.some((d) => d.reported > 0 || d.completed > 0);

  const stats = [
    { icon: "list", tone: "tone-total", value: data.totals.total, label: "Total Reports" },
    { icon: "clock", tone: "tone-pending", value: data.totals.pending, label: "Pending" },
    { icon: "truck", tone: "tone-active", value: data.totals.assigned + data.totals.inProgress, label: "Assigned/In Progress" },
    { icon: "checkCircle", tone: "tone-done", value: data.totals.completed, label: "Completed" },
    {
      icon: "trend",
      tone: "tone-time",
      value: data.avgResolutionHours === null || data.avgResolutionHours === undefined ? "—" : `${data.avgResolutionHours} h`,
      label: "Avg. time to resolve",
    },
  ];

  const axisTick = { fontSize: 12, fill: "#566a5f" };

  return (
    <div className="page">
      <PageHeader
        title="Analytics Dashboard"
        subtitle="Reports, priorities and collection activity — trends by day, area and staff."
      />

      <div className="stat-grid">
        {stats.map((st) => (
          <div className={`stat-card ${st.tone}`} key={st.label}>
            <span className="stat-icon"><Icon name={st.icon} size={24} /></span>
            <div>
              <strong>{st.value}</strong>
              <span>{st.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card chart-card chart-wide">
        <h3>Reports vs. collections — last 14 days</h3>
        {hasTrend ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6ede8" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#dde6df" }} tick={axisTick} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" />
              <Line type="monotone" dataKey="reported" name="Reported" stroke="#e0a020" strokeWidth={3} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="completed" name="Completed" stroke="#25a35f" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="hint">No reports in the last 14 days yet.</p>
        )}
      </div>

      <div className="chart-grid">
        <div className="card chart-card">
          <h3>Report Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={totalsData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6ede8" />
              <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "#dde6df" }} tick={axisTick} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} />
              <Tooltip cursor={{ fill: "rgba(27,127,79,.08)" }} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={52}>
                {totalsData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#1b7f4f"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3>Priority of open reports</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3} label>
                {priorityData.map((entry) => (
                  <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || "#94a3b8"} />
                ))}
              </Pie>
              <Legend iconType="circle" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-grid">
        <div className="card chart-card">
          <h3>Collection activity by staff</h3>
          {staffData.length === 0 ? (
            <p className="hint">No tasks assigned yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, staffData.length * 56 + 60)}>
              <BarChart data={staffData} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e6ede8" />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} tick={axisTick} />
                <Tooltip cursor={{ fill: "rgba(27,127,79,.08)" }} contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" />
                <Bar dataKey="assigned" name="Assigned" stackId="s" fill="#6d5fe0" />
                <Bar dataKey="inProgress" name="In progress" stackId="s" fill="#15a7b8" />
                <Bar dataKey="completed" name="Completed" stackId="s" fill="#25a35f" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card chart-card">
          <h3>Area-wise reports</h3>
          {data.areaWiseReports.length === 0 && <p className="hint">No location data yet.</p>}
          <ul className="rank-list">
            {data.areaWiseReports.map((a) => (
              <li key={a.area}>
                <div className="rank-top">
                  <span>{a.area}</span>
                  <strong>{a.count}{a.completed !== undefined && <small> · {a.completed} done</small>}</strong>
                </div>
                <div className="rank-bar"><i style={{ width: `${(a.count / maxArea) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
