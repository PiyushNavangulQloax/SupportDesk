const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

// Health endpoint
router.get('/health', (req, res) => ticketController.getHealth(req, res));

// Ticket routes
router.get('/tickets', (req, res, next) => ticketController.listTickets(req, res, next));
router.post('/tickets', (req, res, next) => ticketController.createTicket(req, res, next));

// Stats summary route registered before parameterized /tickets/:id
router.get('/tickets/stats/summary', (req, res, next) => ticketController.getStatsSummary(req, res, next));

// Single ticket routes
router.get('/tickets/:id', (req, res, next) => ticketController.getTicketById(req, res, next));
router.post('/tickets/:id/close', (req, res, next) => ticketController.closeTicket(req, res, next));
router.delete('/tickets/:id', (req, res, next) => ticketController.deleteTicket(req, res, next));

module.exports = router;
