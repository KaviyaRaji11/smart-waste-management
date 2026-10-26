const Assignment = require("../models/Assignment");
const Report = require("../models/Report");
const User = require("../models/User");
const { afterStatusChange } = require("../services/reportEvents");
const { buildStaffRoute } = require("../services/routeService");
const { notify } = require("../services/notify");

// POST /api/assignments  (admin) — assign a report to a staff member
// The Route Optimizer then re-plans that staff member's collection route.
exports.createAssignment = async (req, res) => {
  try {
    const { reportId, staffId } = req.body;
    if (!reportId || !staffId) {
      return res.status(400).json({ message: "reportId and staffId are required" });
    }

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: "Report not found" });

    if (["completed", "cancelled"].includes(report.status)) {
      return res.status(400).json({ message: `A ${report.status} report cannot be assigned` });
    }

    const alreadyAssigned = await Assignment.findOne({
      report: reportId,
      taskStatus: { $in: ["assigned", "in-progress"] },
    });
    if (alreadyAssigned) {
      return res.status(400).json({ message: "This report is already assigned to a staff member" });
    }

    const staff = await User.findOne({ _id: staffId, role: "staff" });
    if (!staff) return res.status(404).json({ message: "Staff member not found" });

    const assignment = await Assignment.create({
      report: reportId,
      staff: staffId,
      assignedBy: req.user._id,
    });

    const previous = report.status;
    report.status = "assigned";
    await report.save();

    // Notify the staff member and the citizen
    const where = report.location?.address || report.location?.area || "see map";
    await notify(staffId, {
      type: "task-assigned",
      title: "New collection task",
      message: `${report.description.slice(0, 80)} — ${where}`,
      report: report._id,
    });
    await afterStatusChange(report, previous, {
      message: `${staff.name} has been assigned to collect the waste you reported.`,
    });

    // Route Optimizer: plan the staff member's route now that a task was added
    const route = await buildStaffRoute(staffId);

    const populated = await assignment.populate([
      { path: "report" },
      { path: "staff", select: "name email" },
      { path: "assignedBy", select: "name email" },
    ]);

    res.status(201).json({ assignment: populated, route });
  } catch (err) {
    res.status(500).json({ message: "Failed to create assignment", error: err.message });
  }
};

// GET /api/assignments  (admin) — view all assignments
exports.getAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate("report")
      .populate("staff", "name email")
      .populate("assignedBy", "name email")
      .sort({ createdAt: -1 });
    res.json({ assignments });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch assignments", error: err.message });
  }
};

// GET /api/staff/tasks  (staff) — view own assigned tasks
exports.getStaffTasks = async (req, res) => {
  try {
    const assignments = await Assignment.find({ staff: req.user._id })
      .populate("report")
      .sort({ createdAt: -1 });
    res.json({ assignments });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tasks", error: err.message });
  }
};

// PATCH /api/tasks/:id/status  (staff) — update task + linked report status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskStatus } = req.body;
    const allowed = ["assigned", "in-progress", "completed"];
    if (!allowed.includes(taskStatus)) {
      return res.status(400).json({ message: "Invalid task status" });
    }

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Task not found" });

    if (String(assignment.staff) !== String(req.user._id)) {
      return res.status(403).json({ message: "You are not assigned to this task" });
    }

    assignment.taskStatus = taskStatus;
    if (taskStatus === "completed") assignment.completedAt = new Date();
    await assignment.save();

    const report = await Report.findById(assignment.report);
    if (report) {
      const previous = report.status;
      report.status = taskStatus;
      if (taskStatus === "completed" && !report.resolvedAt) report.resolvedAt = new Date();
      await report.save();
      await afterStatusChange(report, previous);
    }

    res.json({ assignment });
  } catch (err) {
    res.status(500).json({ message: "Failed to update task", error: err.message });
  }
};

// GET /api/staff/list (admin) — list staff users for the assignment dropdown
exports.listStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: "staff" }).select("name email");
    res.json({ staff });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch staff", error: err.message });
  }
};
