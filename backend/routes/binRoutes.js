const express = require("express");
const router = express.Router();
const { getMapBins } = require("../controllers/binController");
const { protect, authorize } = require("../middleware/auth");

// GET /api/bins/map
router.get("/map", protect, authorize("admin", "staff"), getMapBins);

module.exports = router;
