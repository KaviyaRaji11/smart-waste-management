const express = require("express");
const router = express.Router();
const { getNotifications, markRead, markAllRead } = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/", getNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);

module.exports = router;
