const express = require("express");
const router = express.Router();
const { createAssignment, getAssignments, listStaff } = require("../controllers/assignmentController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect, authorize("admin"));

router.post("/", createAssignment);
router.get("/", getAssignments);
router.get("/staff-list", listStaff);

module.exports = router;
