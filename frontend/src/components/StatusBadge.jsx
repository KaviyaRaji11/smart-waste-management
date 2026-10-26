import React from "react";

const LABELS = {
  pending: "Pending",
  verified: "Verified",
  assigned: "Assigned",
  "in-progress": "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function StatusBadge({ status }) {
  const key = LABELS[status] ? status : "default";
  return (
    <span className={`badge s-${key}`}>
      <i className="dot" />
      {LABELS[status] || status}
    </span>
  );
}

export function PriorityBadge({ level = "Medium" }) {
  const key = ["High", "Medium", "Low"].includes(level) ? level.toLowerCase() : "medium";
  return <span className={`badge p-${key}`}>{level}</span>;
}
