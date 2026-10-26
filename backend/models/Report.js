const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      address: {
        type: String,
        trim: true,
        default: "",
      },

      area: {
        type: String,
        trim: true,
        default: "",
      },

      city: {
        type: String,
        trim: true,
        default: "",
      },

      landmark: {
        type: String,
        trim: true,
        default: "",
      },

      lat: {
        type: Number,
      },

      lng: {
        type: Number,
      },
    },

    severity: {
      type: Number,
      enum: [1, 2, 3],
      default: 2,
    },

    // How full the bin is, 0–100 %. Older reports only have severity.
    fillLevel: {
      type: Number,
      min: 0,
      max: 100,
    },

    // The physical bin this report belongs to (used for duplicate detection)
    bin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bin",
    },

    // Other open reports for the same bin
    duplicateCount: {
      type: Number,
      default: 0,
    },

    imageUrl: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "verified",
        "assigned",
        "in-progress",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },

    priorityScore: {
      type: Number,
      default: 0,
    },

    priorityLevel: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    // Points contributed by each factor of the priority score
    priorityBreakdown: {
      fill: { type: Number, default: 0 },
      age: { type: Number, default: 0 },
      duplicates: { type: Number, default: 0 },
      area: { type: Number, default: 0 },
    },

    // True when an admin has set the priority by hand (the engine then leaves it alone)
    priorityOverridden: {
      type: Boolean,
      default: false,
    },

    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Report", reportSchema);