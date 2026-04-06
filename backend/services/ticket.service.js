const Ticket = require("../models/Ticket.model");
const Asset = require("../models/Asset.model");
const assetService = require("./asset.service");

// ─────────────────────────────────────────────────────────────────────────────
//  TICKET SERVICE — ALL BUSINESS LOGIC LIVES HERE
//
//  This is the most important file in the project.
//  Controller only does: receive request → call service → send response
//  Service does: validation, calculations, DB operations, business rules
// ─────────────────────────────────────────────────────────────────────────────


// ── HELPER: SLA + COST CALCULATOR ────────────────────────────────────────────
// This is the core business logic function.
// Called during CREATE and when parts_cost is updated.
//
// Rules:
//   1. If category = "Server Down" or "Security" → is_critical = true
//   2. is_critical → service_fee = 1000, else service_fee = 500
//   3. total_cost = service_fee + parts_cost

const calculateCostAndSLA = (issue_category, parts_cost) => {
  const criticalCategories = ["Server Down", "Security"];

  const is_critical = criticalCategories.includes(issue_category);
  const service_fee = is_critical ? 1000 : 500;
  const total_cost = service_fee + Number(parts_cost);

  return { is_critical, service_fee, total_cost };
};


// ── HELPER: STATUS FLOW VALIDATOR ─────────────────────────────────────────────
// Defines which status can move to which next status.
// Only ONE valid next step is allowed — no skipping, no going backwards.
//
// Flow: Pending → In-Repair → Resolved → Billed
// Billed → null means it's a terminal state (can't go anywhere)

const STATUS_FLOW = {
  Pending: "In-Repair",
  "In-Repair": "Resolved",
  Resolved: "Billed",
  Billed: null, // terminal — no next state
};

const validateStatusTransition = (currentStatus, newStatus) => {
  // If status is not changing, that's fine
  if (currentStatus === newStatus) return;

  const allowedNext = STATUS_FLOW[currentStatus];

  // Billed is a dead-end state
  if (currentStatus === "Billed") {
    throw new Error("This ticket is Billed and locked. No status changes allowed.");
  }

  // Only allow the immediate next step, no skipping
  if (newStatus !== allowedNext) {
    throw new Error(
      `Invalid status transition: Cannot move from "${currentStatus}" to "${newStatus}". Next allowed status is "${allowedNext}".`
    );
  }
};


// ── CREATE TICKET ─────────────────────────────────────────────────────────────
// Steps:
//   1. Check duplicate ticket_id
//   2. Verify asset exists
//   3. Calculate SLA + cost
//   4. Save ticket
//   5. Increment asset ticket count (which may set warning_flag)

const createTicket = async (ticketData) => {
  const {
    ticket_id,
    asset_id,
    issue_category,
    assigned_technician,
    parts_cost = 0,
  } = ticketData;

  // EDGE CASE: Check for duplicate ticket_id before trying to save
  // (Mongoose unique index also catches this, but this gives a cleaner error message)
  const duplicate = await Ticket.findOne({
    ticket_id: ticket_id.toUpperCase(),
  });
  if (duplicate) {
    throw new Error(`Ticket ID "${ticket_id}" already exists. Use a unique ID.`);
  }

  // EDGE CASE: parts_cost must not be negative
  if (Number(parts_cost) < 0) {
    throw new Error("Parts cost cannot be negative.");
  }

  // Verify the Asset exists and get its name
  const asset = await Asset.findById(asset_id);
  if (!asset) {
    throw new Error("Asset not found. Please select a valid asset.");
  }

  // Run SLA + Cost Calculation
  const { is_critical, service_fee, total_cost } = calculateCostAndSLA(
    issue_category,
    parts_cost
  );

  // Create the ticket document
  const ticket = await Ticket.create({
    ticket_id,
    asset_id,
    asset_name: asset.asset_name, // denormalized copy for fast display
    issue_category,
    assigned_technician,
    parts_cost: Number(parts_cost),
    service_fee,
    total_cost,
    is_critical,
    status: "Pending", // always starts at Pending
    is_locked: false,
  });

  // After creating the ticket, update the asset's ticket count
  // This may also flip warning_flag on the asset if count > 3
  await assetService.incrementTicketCount(asset_id);

  // Return the saved ticket with asset details populated
  return await Ticket.findById(ticket._id).populate("asset_id", "asset_name asset_type warning_flag");
};


// ── GET ALL TICKETS ───────────────────────────────────────────────────────────
// Supports search filters: ?asset=&technician=
// Returns newest tickets first

const getAllTickets = async (filters = {}) => {
  const query = {};

  // Search filter: asset name (case-insensitive partial match)
  if (filters.asset) {
    query.asset_name = { $regex: filters.asset, $options: "i" };
  }

  // Search filter: technician name (case-insensitive partial match)
  if (filters.technician) {
    query.assigned_technician = { $regex: filters.technician, $options: "i" };
  }

  const tickets = await Ticket.find(query)
    .populate("asset_id", "asset_name asset_type warning_flag total_ticket_count")
    .sort({ createdAt: -1 });

  return tickets;
};


// ── GET SINGLE TICKET ─────────────────────────────────────────────────────────
const getTicketById = async (id) => {
  const ticket = await Ticket.findById(id).populate(
    "asset_id",
    "asset_name asset_type warning_flag total_ticket_count"
  );

  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  return ticket;
};


// ── UPDATE TICKET ─────────────────────────────────────────────────────────────
// This handles two kinds of updates:
//   A. Field updates (parts_cost, assigned_technician, etc.)
//   B. Status transitions (must follow the valid flow)
//
// LOCKS: Once status = "Billed" → NO updates allowed at all

const updateTicket = async (id, updateData) => {
  const ticket = await Ticket.findById(id);

  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  // LIFECYCLE LOCK: Billed tickets cannot be edited at all
  if (ticket.is_locked) {
    throw new Error("This ticket is Billed and locked. No edits allowed.");
  }

  // ── Handle status change ──────────────────────────────────────
  if (updateData.status && updateData.status !== ticket.status) {
    // Validate the transition is legal
    validateStatusTransition(ticket.status, updateData.status);

    // EDGE CASE: Cannot mark as Billed if parts_cost is 0
    // Check both existing parts_cost and any new parts_cost being submitted
    const effectiveParts = updateData.parts_cost !== undefined
      ? Number(updateData.parts_cost)
      : ticket.parts_cost;

    if (updateData.status === "Billed" && effectiveParts === 0) {
      throw new Error(
        "Cannot mark ticket as Billed when Parts Cost is ₹0. Please add parts cost first."
      );
    }

    // When status moves to Billed → lock the ticket permanently
    if (updateData.status === "Billed") {
      updateData.is_locked = true;
    }
  }

  // ── Handle parts_cost update → recalculate total ──────────────
  if (updateData.parts_cost !== undefined) {
    // EDGE CASE: Prevent negative cost
    if (Number(updateData.parts_cost) < 0) {
      throw new Error("Parts cost cannot be negative.");
    }

    // Recalculate cost using current (or updated) category
    const category = updateData.issue_category || ticket.issue_category;
    const { is_critical, service_fee, total_cost } = calculateCostAndSLA(
      category,
      updateData.parts_cost
    );

    updateData.is_critical = is_critical;
    updateData.service_fee = service_fee;
    updateData.total_cost = total_cost;
  }

  // Apply all updates and save
  const updated = await Ticket.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true } // new:true returns updated doc, runValidators re-runs schema validation
  ).populate("asset_id", "asset_name asset_type warning_flag");

  return updated;
};


// ── DELETE TICKET ─────────────────────────────────────────────────────────────
// LOCK CHECK: Billed tickets cannot be deleted either
// After delete: decrement the asset's ticket count

const deleteTicket = async (id) => {
  const ticket = await Ticket.findById(id);

  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  // LIFECYCLE LOCK: Billed tickets cannot be deleted
  if (ticket.is_locked) {
    throw new Error("This ticket is Billed and locked. Cannot delete a billed ticket.");
  }

  await Ticket.findByIdAndDelete(id);

  // After deleting, decrement the asset's ticket count
  // This may also remove the warning_flag if count drops to 3 or below
  await assetService.decrementTicketCount(ticket.asset_id);

  return { message: `Ticket "${ticket.ticket_id}" deleted successfully.` };
};


// ── ANALYTICS ─────────────────────────────────────────────────────────────────
// Returns all 4 dashboard stats in a single DB call using aggregation.
//
// Stats:
//   1. Total Open Tickets (not Billed)
//   2. Total Revenue (sum of total_cost for Billed tickets)
//   3. Most Serviced Asset (asset with most tickets)
//   4. Critical Issues Count (is_critical = true)

const getAnalytics = async () => {
  // Run all 4 queries in parallel using Promise.all for efficiency
  const [
    openTicketsCount,
    revenueResult,
    mostServicedResult,
    criticalCount,
  ] = await Promise.all([

    // 1. Count non-Billed tickets
    Ticket.countDocuments({ status: { $ne: "Billed" } }),

    // 2. Sum total_cost of all Billed tickets
    Ticket.aggregate([
      { $match: { status: "Billed" } },
      { $group: { _id: null, total: { $sum: "$total_cost" } } },
    ]),

    // 3. Group by asset_name, sort by count descending, take top 1
    Ticket.aggregate([
      { $group: { _id: "$asset_name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),

    // 4. Count all critical tickets
    Ticket.countDocuments({ is_critical: true }),
  ]);

  return {
    open_tickets: openTicketsCount,
    total_revenue: revenueResult[0]?.total || 0,
    most_serviced_asset: mostServicedResult[0]?._id || "None",
    most_serviced_count: mostServicedResult[0]?.count || 0,
    critical_issues: criticalCount,
  };
};


module.exports = {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  getAnalytics,
};