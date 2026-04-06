const mongoose = require("mongoose");

// ─────────────────────────────────────────────
//  ASSET MODEL
//  An Asset is a physical resource: Laptop, Server, Desktop, Printer etc.
//  Every Ticket is LINKED to one Asset via asset_id (ObjectId ref)
//  This is the "relational thinking" the assignment wants to see
// ─────────────────────────────────────────────

const assetSchema = new mongoose.Schema(
  {
    asset_name: {
      type: String,
      required: [true, "Asset name is required"],
      trim: true,
      unique: true, // No two assets with same name (e.g., two "Mac Studio" not allowed)
    },

    asset_type: {
      type: String,
      required: [true, "Asset type is required"],
      enum: {
        values: ["Laptop", "Server", "Desktop", "Printer", "Mobile", "Other"],
        message: "Asset type must be: Laptop, Server, Desktop, Printer, Mobile, or Other",
      },
    },

    // This count goes UP every time a ticket is created for this asset
    // Goes DOWN every time a ticket for this asset is deleted
    // Business Rule: if count > 3 → warning_flag becomes true
    total_ticket_count: {
      type: Number,
      default: 0,
      min: [0, "Ticket count cannot be negative"],
    },

    // Auto-set to true when total_ticket_count > 3
    // Used to show "High Maintenance Resource" warning on frontend
    warning_flag: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

module.exports = mongoose.model("Asset", assetSchema);