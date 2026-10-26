const crypto = require("crypto");
const Report = require("../models/Report");
const Assignment = require("../models/Assignment");
const User = require("../models/User");
const { afterStatusChange } = require("../services/reportEvents");
const { notify } = require("../services/notify");
const { nearestNeighborRoute } = require("../utils/nearestNeighbor");
const { buildStaffRoute } = require("../services/routeService");

// POST /api/routes/optimize (admin) — FR-09 / Section 10 of the requirement doc.
// Body: { reportIds: [...], depot?: { lat, lng } }
// Uses a nearest-neighbor heuristic on stored lat/lng. Locations missing coordinates
// are skipped and reported back, since this is not a real map/geocoding service.
exports.optimizeRoute = async (req, res) => {
  try {
    const { reportIds, depot } = req.body;
    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ message: "reportIds must be a non-empty array" });
    }

    const reports = await Report.find({ _id: { $in: reportIds } });

    const withCoords = [];
    const skipped = [];
    reports.forEach((r) => {
      if (typeof r.location?.lat === "number" && typeof r.location?.lng === "number") {
        withCoords.push({
          id: r._id,
          name: r.location.address || r.description.slice(0, 40),
          lat: r.location.lat,
          lng: r.location.lng,
        });
      } else {
        skipped.push(r._id);
      }
    });

    const { order, totalDistanceKm } = nearestNeighborRoute(withCoords, depot);

    res.json({
      depot: depot || (withCoords[0] ? { lat: withCoords[0].lat, lng: withCoords[0].lng } : null),
      order,
      totalDistanceKm,
      skippedNoCoordinates: skipped,
      note: "Generated using a nearest-neighbor heuristic on stored coordinates. Not connected to a live map/routing service.",
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate route", error: err.message });
  }
};

// GET /api/staff/route?lat=..&lng=..  (staff)
// The Nearest Neighbor route over the logged-in staff member's open tasks.
exports.getMyRoute = async (req, res) => {
  try {
    const lat = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
    const lng = req.query.lng !== undefined ? Number(req.query.lng) : undefined;
    const depot = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;

    const route = await buildStaffRoute(req.user._id, depot, { reorder: req.query.reorder === "1" });
    res.json({ route });
  } catch (err) {
    res.status(500).json({ message: "Failed to build route", error: err.message });
  }
};

// POST /api/routes/assign (admin)
// Body: { staffId, reportIds: [...] }  — reportIds in the visiting order shown to the admin.
// Gives every report in the generated route to ONE staff member, remembering the stop order.
exports.assignRoute = async (req, res) => {
  try {
    const { staffId, reportIds } = req.body;
    if (!staffId) return res.status(400).json({ message: "Select a staff member" });
    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ message: "Generate a route first" });
    }

    const staff = await User.findOne({ _id: staffId, role: "staff" });
    if (!staff) return res.status(404).json({ message: "Staff member not found" });

    const reports = await Report.find({ _id: { $in: reportIds } });
    const byId = new Map(reports.map((r) => [String(r._id), r]));

    const open = await Assignment.find({
      report: { $in: reportIds },
      taskStatus: { $in: ["assigned", "in-progress"] },
    }).select("report");
    const busy = new Set(open.map((a) => String(a.report)));

    const routeId = crypto.randomUUID();
    const created = [];
    const skipped = [];
    let stop = 0;

    for (const id of reportIds) {
      const report = byId.get(String(id));
      if (!report) { skipped.push({ id, reason: "not found" }); continue; }
      if (["completed", "cancelled"].includes(report.status)) {
        skipped.push({ id, reason: `already ${report.status}` });
        continue;
      }
      if (busy.has(String(report._id))) {
        skipped.push({ id, reason: "already assigned to a staff member" });
        continue;
      }

      stop += 1;
      await Assignment.create({
        report: report._id,
        staff: staffId,
        assignedBy: req.user._id,
        routeOrder: stop,
        routeId,
      });

      const previous = report.status;
      report.status = "assigned";
      await report.save();
      await afterStatusChange(report, previous, {
        message: `${staff.name} has been assigned to collect the waste you reported.`,
      });
      created.push(String(report._id));
    }

    if (created.length === 0) {
      return res.status(400).json({
        message: "None of the selected reports could be assigned",
        skipped,
      });
    }

    await notify(staffId, {
      type: "task-assigned",
      title: "New collection route",
      message: `You have been given a route with ${created.length} bin${created.length > 1 ? "s" : ""} to collect. Open My Tasks to follow it.`,
    });

    res.status(201).json({
      message: `Route with ${created.length} stop${created.length > 1 ? "s" : ""} assigned to ${staff.name}`,
      routeId,
      assigned: created.length,
      skipped,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to assign route", error: err.message });
  }
};
