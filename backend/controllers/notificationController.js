const Notification = require("../models/Notification");

// GET /api/notifications  — latest 30 for the logged-in user + unread count
exports.getNotifications = async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notifications", error: err.message });
  }
};

// PATCH /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update notifications", error: err.message });
  }
};

// PATCH /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { read: true } },
      { new: true }
    );
    if (!n) return res.status(404).json({ message: "Notification not found" });
    res.json({ notification: n });
  } catch (err) {
    res.status(500).json({ message: "Failed to update notification", error: err.message });
  }
};
