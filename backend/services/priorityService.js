const Report = require("../models/Report");
const Bin = require("../models/Bin");
const { findOrCreateBin, hasCoords } = require("./binService");
const { calculatePriority, fillFromSeverity, severityFromFill } = require("../utils/priority");

const OPEN_STATUSES = ["pending", "verified", "assigned", "in-progress"];
const CLOSED_STATUSES = ["completed", "cancelled"];

const priorityText = (r) =>
  [r.location?.address, r.location?.area, r.location?.landmark, r.description].filter(Boolean).join(" ");

/**
 * Makes sure every report is linked to its bin, then (re)scores the open ones.
 * Age keeps growing and duplicate counts change, so scores are refreshed
 * whenever reports are listed. Mutates the passed documents and saves changes.
 */
async function refreshOpenReports(reports) {
  const writes = [];

  // 1) Link reports to a bin and fill in a missing fill level
  for (const r of reports) {
    const set = {};

    if (!r.bin && hasCoords(r.location)) {
      const bin = await findOrCreateBin(r.location);
      if (bin) {
        r.bin = bin._id;
        set.bin = bin._id;
        await Bin.updateOne({ _id: bin._id }, { $inc: { reportCount: 1 } }, { timestamps: false });
      }
    }

    if (r.fillLevel === undefined || r.fillLevel === null) {
      r.fillLevel = fillFromSeverity(r.severity);
      set.fillLevel = r.fillLevel;
    }

    if (Object.keys(set).length) writes.push({ updateOne: { filter: { _id: r._id }, update: { $set: set } } });
  }

  // 2) Count open reports per bin
  const open = reports.filter((r) => OPEN_STATUSES.includes(r.status));
  const binIds = [...new Set(open.filter((r) => r.bin).map((r) => String(r.bin)))];
  const counts = {};
  if (binIds.length) {
    const agg = await Report.aggregate([
      { $match: { bin: { $in: open.filter((r) => r.bin).map((r) => r.bin) }, status: { $in: OPEN_STATUSES } } },
      { $group: { _id: "$bin", n: { $sum: 1 } } },
    ]);
    agg.forEach((a) => {
      counts[String(a._id)] = a.n;
    });
  }

  // 3) Re-score open reports the admin has not overridden by hand
  for (const r of open) {
    if (r.priorityOverridden) continue;

    const duplicateCount = r.bin ? Math.max(0, (counts[String(r.bin)] || 1) - 1) : 0;
    const { score, level, breakdown } = calculatePriority({
      fillLevel: r.fillLevel,
      createdAt: r.createdAt,
      duplicateCount,
      text: priorityText(r),
    });

    const changed =
      Math.abs((r.priorityScore || 0) - score) >= 0.1 ||
      r.priorityLevel !== level ||
      r.duplicateCount !== duplicateCount;

    if (changed || !r.priorityBreakdown || r.priorityBreakdown.fill === undefined) {
      r.priorityScore = score;
      r.priorityLevel = level;
      r.duplicateCount = duplicateCount;
      r.priorityBreakdown = breakdown;
      writes.push({
        updateOne: {
          filter: { _id: r._id },
          update: {
            $set: {
              priorityScore: score,
              priorityLevel: level,
              duplicateCount,
              priorityBreakdown: breakdown,
              severity: severityFromFill(r.fillLevel),
            },
          },
        },
      });
    }
  }

  if (writes.length) await Report.bulkWrite(writes, { timestamps: false });
  return reports;
}

// Re-scores every open report on one bin (call after a report opens/closes)
async function recomputeBin(binId) {
  if (!binId) return;
  const reports = await Report.find({ bin: binId, status: { $in: OPEN_STATUSES } });
  await refreshOpenReports(reports);
}

// Open reports first (most urgent on top), closed ones after (newest first)
function sortByUrgency(reports) {
  const isOpen = (r) => OPEN_STATUSES.includes(r.status);
  return [...reports].sort((a, b) => {
    if (isOpen(a) !== isOpen(b)) return isOpen(a) ? -1 : 1;
    if (isOpen(a) && b.priorityScore !== a.priorityScore) return (b.priorityScore || 0) - (a.priorityScore || 0);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

module.exports = { refreshOpenReports, recomputeBin, sortByUrgency, OPEN_STATUSES, CLOSED_STATUSES, priorityText };
