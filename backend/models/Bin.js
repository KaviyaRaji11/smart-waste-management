const mongoose = require("mongoose");

// A physical bin location. Reports made within a few metres of each other
// point to the same Bin, which is how duplicate reports are detected.
const binSchema = new mongoose.Schema(
  {
    location: {
      address: { type: String, trim: true, default: "" },
      area: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      landmark: { type: String, trim: true, default: "" },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    reportCount: { type: Number, default: 0 },
    lastReportedAt: { type: Date },
    lastCollectedAt: { type: Date },
  },
  { timestamps: true }
);

binSchema.index({ "location.lat": 1, "location.lng": 1 });

module.exports = mongoose.model("Bin", binSchema);
