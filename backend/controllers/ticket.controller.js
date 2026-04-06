const ticketService = require("../services/ticket.service");


//  TICKET CONTROLLER
//
//  RULE: Controllers are THIN. They do only 3 things:
//    1. Extract data from req (body, params, query)
//    2. Call the service function
//    3. Send the response (success or error)
//
//  NO business logic here. All logic is in ticket.service.js
//


// POST /api/tickets
const createTicket = async (req, res) => {
  try {
    const ticket = await ticketService.createTicket(req.body);
    res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: ticket,
    });
  } catch (error) {
    // Mongoose duplicate key error code is 11000
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ticket ID already exists. Use a unique Ticket ID.",
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};


// GET /api/tickets  (supports ?asset=&technician= query params)
const getAllTickets = async (req, res) => {
  try {
    const filters = {
      asset: req.query.asset,
      technician: req.query.technician,
    };
    const tickets = await ticketService.getAllTickets(filters);
    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// GET /api/tickets/:id
const getTicketById = async (req, res) => {
  try {
    const ticket = await ticketService.getTicketById(req.params.id);
    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};


// PUT /api/tickets/:id
const updateTicket = async (req, res) => {
  try {
    const ticket = await ticketService.updateTicket(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Ticket updated successfully",
      data: ticket,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


// DELETE /api/tickets/:id
const deleteTicket = async (req, res) => {
  try {
    const result = await ticketService.deleteTicket(req.params.id);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


// GET /api/analytics
const getAnalytics = async (req, res) => {
  try {
    const analytics = await ticketService.getAnalytics();
    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  getAnalytics,
};