const Report = require("../models/Report");
const Bin = require("../models/Bin");
const {
  calculatePriority,
  fillFromSeverity,
  severityFromFill,
} = require("../utils/priority");
const { findOrCreateBin } = require("../services/binService");
const {
  refreshOpenReports,
  recomputeBin,
  sortByUrgency,
  OPEN_STATUSES,
  priorityText,
} = require("../services/priorityService");
const { afterStatusChange } = require("../services/reportEvents");
const { notify } = require("../services/notify");

const ALL_STATUSES = ["pending", "verified", "assigned", "in-progress", "completed", "cancelled"];
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || "").trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || "").trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || "").trim(),
});
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "smart-waste-reports",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    stream.end(buffer);
  });
};
// ==========================================
// CREATE REPORT - CITIZEN
// ==========================================

exports.createReport = async (req, res) => {
  try {
    const { description, location, severity, fillLevel } = req.body;

    // Validate description
    if (!description || !description.trim()) {
      return res.status(400).json({
        message: "Description is required",
      });
    }

    // Parse location
    let parsedLocation = {};

    if (location) {
      try {
        parsedLocation =
          typeof location === "string"
            ? JSON.parse(location)
            : location;
      } catch (err) {
        return res.status(400).json({
          message: "Invalid location data",
        });
      }
    }

    // Fill level (0-100 %). Older clients only send a 1-3 severity.
    let fill;
    if (fillLevel !== undefined && fillLevel !== "") {
      fill = Number(fillLevel);
      if (Number.isNaN(fill) || fill < 0 || fill > 100) {
        return res.status(400).json({
          message: "Fill level must be between 0 and 100",
        });
      }
    } else {
      fill = fillFromSeverity(severity);
    }

    // ==========================================
    // PHOTO UPLOAD
    // ==========================================

    let imageUrl = "";

    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        imageUrl = result.secure_url;
      } catch (uploadErr) {
        console.error("Photo upload error:", uploadErr.message);
        return res.status(502).json({
          message:
            "The photo could not be uploaded (" +
            (uploadErr.message || "storage error") +
            "). Check the Cloudinary keys in backend/.env, or submit the report without a photo.",
        });
      }
    }

    // ==========================================
    // CREATE REPORT
    // ==========================================

    const lat =
      parsedLocation.lat !== undefined && parsedLocation.lat !== ""
        ? Number(parsedLocation.lat)
        : undefined;
    const lng =
      parsedLocation.lng !== undefined && parsedLocation.lng !== ""
        ? Number(parsedLocation.lng)
        : undefined;

    const report = new Report({
      citizen: req.user._id,

      description: description.trim(),

      location: {
        address: parsedLocation.address || "",
        area: parsedLocation.area || "",
        city: parsedLocation.city || "",
        landmark: parsedLocation.landmark || "",
        lat,
        lng,
      },

      fillLevel: fill,
      severity: severityFromFill(fill),

      imageUrl: imageUrl,
    });

    // ==========================================
    // LINK TO A BIN (duplicate detection)
    // ==========================================

    const bin = await findOrCreateBin(report.location);
    let duplicateCount = 0;

    if (bin) {
      report.bin = bin._id;
      duplicateCount = await Report.countDocuments({
        bin: bin._id,
        status: { $in: OPEN_STATUSES },
      });
      bin.reportCount += 1;
      bin.lastReportedAt = new Date();
      await bin.save();
    }

    // ==========================================
    // SMART PRIORITY ENGINE
    // ==========================================

    report.createdAt = new Date();
    const { score, level, breakdown } = calculatePriority({
      fillLevel: fill,
      createdAt: report.createdAt,
      duplicateCount,
      text: priorityText(report),
    });

    report.priorityScore = score;
    report.priorityLevel = level;
    report.priorityBreakdown = breakdown;
    report.duplicateCount = duplicateCount;

    await report.save();

    // Other open reports on this bin now have one more duplicate
    if (bin && duplicateCount > 0) {
      await recomputeBin(bin._id);
    }

    await notify(req.user._id, {
      type: "report-submitted",
      title: "Report submitted",
      message: `Priority ${level} (score ${score}/100).${
        duplicateCount > 0
          ? ` ${duplicateCount} similar open report(s) already exist for this bin.`
          : ""
      }`,
      report: report._id,
    });

    // ==========================================
    // RESPONSE
    // ==========================================

    res.status(201).json({
      message: "Report created successfully",
      report,
    });
  } catch (err) {
    console.error("Create report error:", err);

    res.status(500).json({
      message: "Failed to create report",
      error: err.message,
    });
  }
};

// ==========================================
// GET REPORTS
// Optional filter: ?status=pending
// Admin / staff see the most urgent open reports first
// ==========================================

exports.getReports = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "citizen") {
      filter.citizen = req.user._id;
    }

    if (req.query.status) {
      if (!ALL_STATUSES.includes(req.query.status)) {
        return res.status(400).json({ message: "Invalid status filter" });
      }
      filter.status = req.query.status;
    }

    let reports = await Report.find(filter)
      .populate("citizen", "name email")
      .sort({ createdAt: -1 });

    // Age and duplicate counts change over time, so refresh the scores
    await refreshOpenReports(reports);

    if (req.user.role !== "citizen") {
      reports = sortByUrgency(reports);
    }

    res.status(200).json({
      reports,
    });
  } catch (err) {
    console.error("Get reports error:", err);

    res.status(500).json({
      message: "Failed to fetch reports",
      error: err.message,
    });
  }
};

// ==========================================
// GET SINGLE REPORT
// ==========================================

exports.getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("citizen", "name email");

    if (!report) {
      return res.status(404).json({
        message: "Report not found",
      });
    }

    // Citizen can only view their own report
    if (
      req.user.role === "citizen" &&
      report.citizen._id.toString() !==
        req.user._id.toString()
    ) {
      return res.status(403).json({
        message: "You are not authorized to view this report",
      });
    }

    await refreshOpenReports([report]);

    res.status(200).json({
      report,
    });
  } catch (err) {
    console.error("Get report by ID error:", err);

    res.status(500).json({
      message: "Failed to fetch report",
      error: err.message,
    });
  }
};

// ==========================================
// CANCEL REPORT
// CITIZEN ONLY
// ==========================================

exports.cancelReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    // Report doesn't exist
    if (!report) {
      return res.status(404).json({
        message: "Report not found",
      });
    }

    // Make sure this report belongs to the logged-in citizen
    if (
      report.citizen.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message:
          "You are not authorized to cancel this report",
      });
    }

    // Only pending reports can be cancelled
    if (report.status !== "pending") {
      return res.status(400).json({
        message:
          "Only pending reports can be cancelled",
      });
    }

    // Cancel report
    const previous = report.status;
    report.status = "cancelled";

    await report.save();

    // Cancelled reports no longer count as duplicates for the same bin
    await afterStatusChange(report, previous, { notifyCitizen: false });

    res.status(200).json({
      message: "Report cancelled successfully",
      report,
    });
  } catch (err) {
    console.error("Cancel report error:", err);

    res.status(500).json({
      message: "Failed to cancel report",
      error: err.message,
    });
  }
};

// ==========================================
// UPDATE REPORT STATUS
// ADMIN / STAFF
// ==========================================

exports.updateReportStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!ALL_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid report status",
      });
    }

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        message: "Report not found",
      });
    }

    const previous = report.status;
    report.status = status;

    if (status === "completed" && !report.resolvedAt) {
      report.resolvedAt = new Date();
    }

    await report.save();

    await afterStatusChange(report, previous);

    res.status(200).json({
      message: "Report status updated successfully",
      report,
    });
  } catch (err) {
    console.error(
      "Update report status error:",
      err
    );

    res.status(500).json({
      message: "Failed to update report status",
      error: err.message,
    });
  }
};

// ==========================================
// UPDATE REPORT PRIORITY
// ADMIN ONLY
// Send priorityLevel "auto" to hand control back to the engine
// ==========================================

exports.updateReportPriority = async (req, res) => {
  try {
    const {
      priorityScore,
      priorityLevel,
    } = req.body;

    const allowedLevels = [
      "Low",
      "Medium",
      "High",
    ];

    if (
      priorityLevel &&
      priorityLevel !== "auto" &&
      !allowedLevels.includes(priorityLevel)
    ) {
      return res.status(400).json({
        message: "Invalid priority level",
      });
    }

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        message: "Report not found",
      });
    }

    if (priorityLevel === "auto") {
      report.priorityOverridden = false;
      await report.save();
      await refreshOpenReports([report]);
      return res.status(200).json({
        message: "Priority is automatic again",
        report,
      });
    }

    if (priorityScore !== undefined) {
      const score = Number(priorityScore);

      if (
        Number.isNaN(score) ||
        score < 0 ||
        score > 100
      ) {
        return res.status(400).json({
          message:
            "Priority score must be between 0 and 100",
        });
      }

      report.priorityScore = score;
      report.priorityOverridden = true;
    }

    if (priorityLevel) {
      report.priorityLevel = priorityLevel;
      report.priorityOverridden = true;
    }

    await report.save();

    res.status(200).json({
      message: "Report priority updated successfully",
      report,
    });
  } catch (err) {
    console.error(
      "Update report priority error:",
      err
    );

    res.status(500).json({
      message: "Failed to update report priority",
      error: err.message,
    });
  }
};