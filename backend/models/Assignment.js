const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    report: { type: mongoose.Schema.Types.ObjectId, ref: "Report", required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    taskStatus: {
      type: String,
      enum: ["assigned", "in-progress", "completed"],
      default: "assigned",
    },
    completedAt: { type: Date },
    // Set when the admin assigned a whole generated route to this staff member
    routeOrder: { type: Number },   // stop number in that route (1, 2, 3...)
    routeId: { type: String },      // same value for every stop of one route
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
