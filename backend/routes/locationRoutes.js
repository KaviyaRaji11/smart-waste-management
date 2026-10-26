const express = require("express");

const router = express.Router();

const { reverseGeocode, searchPlaces } = require("../controllers/locationController");

const { protect } = require("../middleware/auth");

router.get("/reverse", protect, reverseGeocode);
router.get("/search", protect, searchPlaces);

module.exports = router;
