const Bin = require("../models/Bin");
const { notify } = require("./notify");
const { recomputeBin, OPEN_STATUSES } = require("./priorityService");

const STATUS_NOTE = {
  pending: { title: "Report received", message: "Your report is waiting to be reviewed." },
  verified: { title: "Report verified", message: "An admin verified your report." },
  assigned: { title: "Report assigned", message: "A collection staff member has been assigned to your report." },
  "in-progress": { title: "Collection started", message: "Staff are on their way to collect the waste." },
  completed: { title: "Report resolved", message: "The waste has been collected. Thank you for reporting." },
  cancelled: { title: "Report cancelled", message: "Your report was cancelled." },
};

/**
 * Runs after a report's status changes:
 *  - tells the citizen who reported it (in-app notification)
 *  - re-scores the other open reports on the same bin (duplicate counts change)
 *  - records when the bin was last collected
 */
async function afterStatusChange(report, previousStatus, { message, notifyCitizen = true } = {}) {
  if (report.status === previousStatus) return;

  if (notifyCitizen) {
    const note = STATUS_NOTE[report.status];
    if (note) {
      await notify(report.citizen?._id || report.citizen, {
        type: "report-status",
        title: note.title,
        message: message || note.message,
        report: report._id,
      });
    }
  }

  if (report.bin) {
    if (report.status === "completed") {
      await Bin.updateOne({ _id: report.bin }, { $set: { lastCollectedAt: new Date() } }, { timestamps: false });
    }
    const wasOpen = OPEN_STATUSES.includes(previousStatus);
    const isOpen = OPEN_STATUSES.includes(report.status);
    if (wasOpen !== isOpen) await recomputeBin(report.bin);
  }
}

module.exports = { afterStatusChange };
