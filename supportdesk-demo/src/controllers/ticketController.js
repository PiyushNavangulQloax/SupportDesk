const ticketService = require('../services/ticketService');

class TicketController {
  getHealth(req, res) {
    return res.status(200).json({
      success: true,
      service: 'supportdesk-demo'
    });
  }

  listTickets(req, res, next) {
    try {
      const result = ticketService.listTickets(req.query);
      return res.status(200).json({
        success: true,
        count: result.count,
        data: result.data
      });
    } catch (err) {
      next(err);
    }
  }

  getTicketById(req, res, next) {
    try {
      const ticket = ticketService.getTicketById(req.params.id);
      return res.status(200).json({
        success: true,
        data: ticket
      });
    } catch (err) {
      next(err);
    }
  }

  createTicket(req, res, next) {
    try {
      const created = ticketService.createTicket(req.body);
      return res.status(201).json({
        success: true,
        message: 'Ticket created',
        data: created
      });
    } catch (err) {
      next(err);
    }
  }

  closeTicket(req, res, next) {
    try {
      const closed = ticketService.closeTicket(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Ticket closed',
        data: closed
      });
    } catch (err) {
      next(err);
    }
  }

  deleteTicket(req, res, next) {
    try {
      const deleted = ticketService.deleteTicket(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Ticket deleted',
        data: deleted
      });
    } catch (err) {
      next(err);
    }
  }

  getStatsSummary(req, res, next) {
    try {
      const summary = ticketService.getStatsSummary();
      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TicketController();
