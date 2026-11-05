const ticketRepository = require('../repositories/ticketRepository');
const { AppError } = require('../middleware/errorHandler');

class TicketService {
  listTickets(query = {}) {
    let result = ticketRepository.findAll();

    if (query.status) {
      result = result.filter((x) => x.status === query.status);
    }
    if (query.priority) {
      result = result.filter((x) => x.priority === query.priority);
    }
    if (query.owner) {
      result = result.filter((x) => x.owner.toLowerCase().includes(query.owner.toLowerCase()));
    }

    return { count: result.length, data: result };
  }

  getTicketById(id) {
    const numericId = Number(id);
    const item = ticketRepository.findById(numericId);

    if (!item) {
      throw new AppError(404, 'Ticket not found');
    }

    // Exact whitelist projection matching original implementation
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      status: item.status,
      priority: item.priority,
      owner: item.owner,
      createdAt: item.createdAt
    };
  }

  createTicket({ title, description, priority, owner } = {}) {
    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    const trimmedDescription = typeof description === 'string' ? description.trim() : '';
    const assignedPriority = priority || 'medium';
    const assignedOwner = owner || 'Unassigned';

    if (!title || trimmedTitle.length < 3) {
      throw new AppError(400, 'Title must be at least 3 characters');
    }
    if (!description || trimmedDescription.length < 5) {
      throw new AppError(400, 'Description must be at least 5 characters');
    }
    if (!['low', 'medium', 'high'].includes(assignedPriority)) {
      throw new AppError(400, 'Invalid priority');
    }
    if (ticketRepository.count() > 1000) {
      throw new AppError(400, 'Ticket limit reached');
    }

    const duplicate = ticketRepository.findByTitleAndStatus(title, 'open');
    if (duplicate) {
      throw new AppError(409, 'An open ticket with this title already exists');
    }

    const created = ticketRepository.create({
      title: trimmedTitle,
      description: trimmedDescription,
      status: 'open',
      priority: assignedPriority,
      owner: assignedOwner,
      createdAt: new Date().toISOString()
    });

    console.log('ticket created', created.id);
    return created;
  }

  closeTicket(id, { confirm, closedBy } = {}) {
    const numericId = Number(id);
    const ticket = ticketRepository.findById(numericId);

    if (!ticket) {
      throw new AppError(404, 'Ticket not found');
    }
    if (ticket.status === 'closed') {
      throw new AppError(400, 'Ticket is already closed');
    }
    if (ticket.priority === 'high' && confirm !== true) {
      throw new AppError(400, 'High priority ticket requires confirmation');
    }

    const updated = ticketRepository.update(numericId, {
      status: 'closed',
      closedAt: new Date().toISOString(),
      closedBy: closedBy || 'system'
    });

    return updated;
  }

  deleteTicket(id) {
    const numericId = Number(id);
    const ticket = ticketRepository.findById(numericId);

    if (!ticket) {
      throw new AppError(404, 'Ticket not found');
    }
    if (ticket.status !== 'closed') {
      throw new AppError(400, 'Only closed tickets can be deleted');
    }

    return ticketRepository.delete(numericId);
  }

  getStatsSummary() {
    return ticketRepository.getStats();
  }
}

module.exports = new TicketService();
