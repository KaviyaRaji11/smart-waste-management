const express = require("express");
const router = express.Router();
const { updateTaskStatus } = require("../controllers/assignmentController");
const { protect, authorize } = require("../middleware/auth");

// PATCH /api/tasks/:id/status  (matches the suggested API structure in the requirement doc)
router.patch("/:id/status", protect, authorize("staff"), updateTaskStatus);

module.exports = router;
