const express = require("express");
const router = express.Router();
const { getStaffTasks } = require("../controllers/assignmentController");
const { getMyRoute } = require("../controllers/routeController");
const { protect, authorize } = require("../middleware/auth");

// GET /api/staff/tasks
router.get("/tasks", protect, authorize("staff"), getStaffTasks);

// GET /api/staff/route  (Nearest Neighbor route over my open tasks)
router.get("/route", protect, authorize("staff"), getMyRoute);

module.exports = router;
