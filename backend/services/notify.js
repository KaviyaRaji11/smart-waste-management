const Notification = require("../models/Notification");

// Creates an in-app notification. It never throws, so a notification problem
// can never break the request that triggered it.
async function notify(userId, { type = "report-status", title, message = "", report } = {}) {
  try {
    if (!userId || !title) return null;
    return await Notification.create({ user: userId, type, title, message, report });
  } catch (err) {
    console.error("Notification error:", err.message);
    return null;
  }
}

module.exports = { notify };
