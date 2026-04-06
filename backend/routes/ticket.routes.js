const express = require("express");
const router = express.Router();
const {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  getAnalytics,
} = require("../controllers/ticket.controller");

// GET /api/analytics  ← must be ABOVE /:id route, otherwise "analytics" gets treated as an id
router.get("/analytics", getAnalytics);

// Standard CRUD
router.post("/", createTicket);
router.get("/", getAllTickets);         // supports ?asset=&technician= query params
router.get("/:id", getTicketById);
router.put("/:id", updateTicket);
router.delete("/:id", deleteTicket);

module.exports = router;