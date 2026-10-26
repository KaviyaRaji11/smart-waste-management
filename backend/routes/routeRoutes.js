const express = require("express");
const router = express.Router();
const { optimizeRoute, assignRoute } = require("../controllers/routeController");
const { protect, authorize } = require("../middleware/auth");

router.post("/optimize", protect, authorize("admin"), optimizeRoute);

router.post("/assign", protect, authorize("admin"), assignRoute);

module.exports = router;
