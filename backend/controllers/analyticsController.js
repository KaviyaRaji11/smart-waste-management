const Report = require("../models/Report");
const Assignment = require("../models/Assignment");

const TZ = "Asia/Kolkata";
const TREND_DAYS = 14;

// YYYY-MM-DD for a date, in the project's timezone
const dayKey = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });

// GET /api/analytics  (admin)
exports.getAnalytics = async (req, res) => {
  try {
    const [total, pending, verified, assigned, inProgress, completed] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: "pending" }),
      Report.countDocuments({ status: "verified" }),
      Report.countDocuments({ status: "assigned" }),
      Report.countDocuments({ status: "in-progress" }),
      Report.countDocuments({ status: "completed" }),
    ]);

    // Priority split of the reports that still need work
    const priorityAgg = await Report.aggregate([
      { $match: { status: { $in: ["pending", "verified", "assigned", "in-progress"] } } },
      { $group: { _id: "$priorityLevel", count: { $sum: 1 } } },
    ]);
    const priorityDistribution = { Low: 0, Medium: 0, High: 0 };
    priorityAgg.forEach((p) => {
      if (p._id) priorityDistribution[p._id] = p.count;
    });

    // Area-wise reports (area name, falling back to the address)
    const areaAgg = await Report.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $gt: [{ $strLenCP: { $ifNull: ["$location.area", ""] } }, 0] },
              "$location.area",
              { $ifNull: ["$location.address", "Unspecified"] },
            ],
          },
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    const areaWiseReports = areaAgg.map((a) => ({
      area: a._id || "Unspecified",
      count: a.count,
      completed: a.completed,
    }));

    // Staff performance
    const staffAgg = await Assignment.aggregate([
      {
        $group: {
          _id: "$staff",
          assigned: { $sum: { $cond: [{ $eq: ["$taskStatus", "assigned"] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$taskStatus", "in-progress"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$taskStatus", "completed"] }, 1, 0] } },
        },
      },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "staffInfo" } },
      { $unwind: "$staffInfo" },
      {
        $project: {
          _id: 0,
          name: "$staffInfo.name",
          assigned: 1,
          inProgress: 1,
          completed: 1,
        },
      },
      { $sort: { completed: -1 } },
    ]);
    const staffPerformance = staffAgg;
    // Kept for older screens
    const collectionActivity = staffAgg
      .filter((s) => s.completed > 0)
      .map((s) => ({ name: s.name, completedCount: s.completed }));

    // Trend: reports raised vs reports completed per day
    const since = new Date();
    since.setDate(since.getDate() - (TREND_DAYS + 1));

    const [createdAgg, completedAgg] = await Promise.all([
      Report.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } }, n: { $sum: 1 } } },
      ]),
      Report.aggregate([
        { $match: { status: "completed" } },
        { $addFields: { doneAt: { $ifNull: ["$resolvedAt", "$updatedAt"] } } },
        { $match: { doneAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$doneAt", timezone: TZ } }, n: { $sum: 1 } } },
      ]),
    ]);
    const createdMap = Object.fromEntries(createdAgg.map((d) => [d._id, d.n]));
    const completedMap = Object.fromEntries(completedAgg.map((d) => [d._id, d.n]));

    const trend = [];
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      trend.push({
        date: key,
        label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: TZ }),
        reported: createdMap[key] || 0,
        completed: completedMap[key] || 0,
      });
    }

    // Average time from report to resolution
    const resolutionAgg = await Report.aggregate([
      { $match: { status: "completed" } },
      { $addFields: { doneAt: { $ifNull: ["$resolvedAt", "$updatedAt"] } } },
      { $group: { _id: null, avgMs: { $avg: { $subtract: ["$doneAt", "$createdAt"] } } } },
    ]);
    const avgResolutionHours = resolutionAgg[0]
      ? Math.round((resolutionAgg[0].avgMs / 3600000) * 10) / 10
      : null;

    res.json({
      totals: { total, pending, verified, assigned, inProgress, completed },
      priorityDistribution,
      areaWiseReports,
      collectionActivity,
      staffPerformance,
      trend,
      avgResolutionHours,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to compute analytics", error: err.message });
  }
};
