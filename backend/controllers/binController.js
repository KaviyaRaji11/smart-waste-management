const Bin = require("../models/Bin");
const Report = require("../models/Report");
const { refreshOpenReports, OPEN_STATUSES } = require("../services/priorityService");

// GET /api/bins/map  (admin, staff)
// Every bin with its current state, for the colour-coded live map:
//   High / Medium / Low = has open reports (colour = most urgent open report)
//   clear               = no open reports
exports.getMapBins = async (req, res) => {
  try {
    // Older reports may not be linked to a bin yet — refreshing links them
    const unlinked = await Report.find({ bin: { $exists: false } });
    if (unlinked.length) await refreshOpenReports(unlinked);

    const openReports = await Report.find({ status: { $in: OPEN_STATUSES }, bin: { $exists: true } });
    await refreshOpenReports(openReports);

    const byBin = {};
    openReports.forEach((r) => {
      const key = String(r.bin);
      (byBin[key] = byBin[key] || []).push(r);
    });

    const bins = await Bin.find();
    const summary = { High: 0, Medium: 0, Low: 0, clear: 0 };

    const data = bins.map((bin) => {
      const open = (byBin[String(bin._id)] || []).sort(
        (a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)
      );
      const top = open[0];
      const state = top ? top.priorityLevel : "clear";
      summary[state] = (summary[state] || 0) + 1;

      return {
        id: String(bin._id),
        lat: bin.location.lat,
        lng: bin.location.lng,
        address: bin.location.address,
        area: bin.location.area,
        city: bin.location.city,
        state,
        priorityScore: top ? top.priorityScore : 0,
        openReports: open.length,
        reportCount: bin.reportCount,
        lastCollectedAt: bin.lastCollectedAt || null,
        topReport: top
          ? {
              id: String(top._id),
              description: top.description,
              status: top.status,
              fillLevel: top.fillLevel,
              imageUrl: top.imageUrl,
              createdAt: top.createdAt,
            }
          : null,
      };
    });

    res.json({ bins: data, summary, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Map bins error:", err);
    res.status(500).json({ message: "Failed to load map data", error: err.message });
  }
};
