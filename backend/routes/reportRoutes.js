const express = require("express");

const router = express.Router();

const {
  createReport,
  getReports,
  getReportById,
  updateReportStatus,
  updateReportPriority,
  cancelReport,
} = require("../controllers/reportController");

const { protect, authorize } = require("../middleware/auth");

const upload = require("../middleware/upload");

router.use(protect);

// Create report
router.post(
  "/",
  authorize("citizen"),
  upload.single("photo"),
  createReport
);

// Get reports
router.get("/", getReports);

// Cancel report
router.patch(
  "/:id/cancel",
  authorize("citizen"),
  cancelReport
);

// Get single report
router.get("/:id", getReportById);

// Update status
router.patch(
  "/:id/status",
  authorize("admin", "staff"),
  updateReportStatus
);

// Update priority
router.patch(
  "/:id/priority",
  authorize("admin"),
  updateReportPriority
);

module.exports = router;