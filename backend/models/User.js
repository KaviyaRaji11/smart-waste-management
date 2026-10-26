const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // stored as bcrypt hash, never plain text
    role: {
      type: String,
      enum: ["citizen", "admin", "staff"],
      default: "citizen",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
