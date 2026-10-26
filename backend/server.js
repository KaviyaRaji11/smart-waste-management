require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const reportRoutes = require("./routes/reportRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const staffRoutes = require("./routes/staffRoutes");
const taskRoutes = require("./routes/taskRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const routeRoutes = require("./routes/routeRoutes");
const locationRoutes = require("./routes/locationRoutes");
const binRoutes = require("./routes/binRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
  })
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Static folder for uploaded photos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Smart Waste Management API",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/bins", binRoutes);
app.use("/api/notifications", notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(err.status || 500).json({
    message: err.message || "Server error",
  });
});

const PORT = process.env.PORT || 5001;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);

      // Check the Cloudinary keys now, so a wrong key shows up at startup
      // instead of when a citizen submits a report with a photo.
      const cloudinary = require("cloudinary").v2;
      cloudinary.config({
        cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || "").trim(),
        api_key: (process.env.CLOUDINARY_API_KEY || "").trim(),
        api_secret: (process.env.CLOUDINARY_API_SECRET || "").trim(),
      });
      cloudinary.api
        .ping()
        .then(() => console.log("Cloudinary connected: photo uploads are ready"))
        .catch((err) =>
          console.error(
            "Cloudinary check FAILED - photo uploads will not work:",
            err.error?.message || err.message,
            "\n  Fix CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in backend/.env, then restart."
          )
        );
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });