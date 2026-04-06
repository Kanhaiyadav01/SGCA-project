const mongoose = require("mongoose");

// ─────────────────────────────────────────────
//  TICKET MODEL
//  A Ticket represents one support request logged against an Asset.
//
//  KEY RELATION:
//    asset_id → references Asset._id  (ObjectId)
//
//  COMPUTED FIELDS (set by service layer, NOT by user):
//    service_fee  → 500 or 1000 depending on SLA
//    total_cost   → service_fee + parts_cost
//    is_critical  → true if category is "Server Down" or "Security"
//    is_locked    → true once status reaches "Billed"
// ─────────────────────────────────────────────

const ticketSchema = new mongoose.Schema(
  {
    // Manually entered unique ID like "TKT-001"
    // unique:true creates a DB index so duplicates are rejected at DB level too
    ticket_id: {
      type: String,
      required: [true, "Ticket ID is required"],
      unique: true,
      trim: true,
      uppercase: true, // store as TKT-001 not tkt-001
    },

    // ── RELATION ──────────────────────────────
    // This ObjectId links every ticket to one Asset document
    // When you query tickets and want asset details → use .populate("asset_id")
    asset_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset", // tells mongoose which collection to populate from
      required: [true, "Asset is required"],
    },

    // Stored separately for fast display (so you don't always need to populate)
    // Kept in sync with Asset.asset_name at creation time
    asset_name: {
      type: String,
      required: [true, "Asset name is required"],
      trim: true,
    },

    issue_category: {
      type: String,
      required: [true, "Issue category is required"],
      enum: {
        values: [
          "Server Down",
          "Security",
          "Hardware",
          "Software",
          "Network",
          "Other",
        ],
        message:
          "Category must be: Server Down, Security, Hardware, Software, Network, or Other",
      },
    },

    assigned_technician: {
      type: String,
      required: [true, "Technician name is required"],
      trim: true,
    },

    // User enters this — must be >= 0
    // Cannot mark ticket as Billed if this is 0 (enforced in service layer)
    parts_cost: {
      type: Number,
      required: [true, "Parts cost is required"],
      min: [0, "Parts cost cannot be negative"],
      default: 0,
    },

    // ── COMPUTED BY SERVICE LAYER ──────────────
    // DO NOT let the frontend send these — service.js calculates them

    service_fee: {
      type: Number,
      default: 500, // overridden to 1000 if is_critical
    },

    total_cost: {
      type: Number,
      default: 500, // service_fee + parts_cost
    },

    // ── STATUS LIFECYCLE ──────────────────────
    // Valid flow: Pending → In-Repair → Resolved → Billed
    // Once Billed → is_locked = true → no more edits allowed
    status: {
      type: String,
      enum: {
        values: ["Pending", "In-Repair", "Resolved", "Billed"],
        message: "Status must be: Pending, In-Repair, Resolved, or Billed",
      },
      default: "Pending",
    },

    // ── SLA FLAG ──────────────────────────────
    // Automatically set to true if category = "Server Down" or "Security"
    // Used for: red row highlight, "Critical SLA" badge, doubled fee
    is_critical: {
      type: Boolean,
      default: false,
    },

    // ── LIFECYCLE LOCK ────────────────────────
    // Set to true when status becomes "Billed"
    // Service layer checks this before any update or delete
    is_locked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt added automatically
  }
);

module.exports = mongoose.model("Ticket", ticketSchema);