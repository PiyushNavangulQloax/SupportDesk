// In-memory data repository for SupportDesk tickets
const getInitialTickets = () => [
  { id: 1, title: 'Login issue', description: 'Cannot sign in', status: 'open', priority: 'high', owner: 'Asha', createdAt: new Date().toISOString() },
  { id: 2, title: 'Email update', description: 'Need to update email', status: 'open', priority: 'low', owner: 'Ravi', createdAt: new Date().toISOString() },
  { id: 3, title: 'Payment failed', description: 'Payment did not complete', status: 'closed', priority: 'high', owner: 'Mina', createdAt: new Date().toISOString() }
];

class TicketRepository {
  constructor() {
    this.reset();
  }

  reset() {
    this.tickets = getInitialTickets();
    this.nextId = 4;
  }

  findAll(filterFn) {
    if (typeof filterFn === 'function') {
      return this.tickets.filter(filterFn);
    }
    return [...this.tickets];
  }

  findById(id) {
    const numericId = Number(id);
    return this.tickets.find((ticket) => ticket.id === numericId) || null;
  }

  findByTitleAndStatus(title, status) {
    if (!title || !status) return null;
    return this.tickets.find(
      (ticket) => ticket.title.toLowerCase() === title.toLowerCase() && ticket.status === status
    ) || null;
  }

  count() {
    return this.tickets.length;
  }

  create(ticketData) {
    const created = {
      id: this.nextId++,
      ...ticketData
    };
    this.tickets.push(created);
    return created;
  }

  update(id, updates) {
    const numericId = Number(id);
    const index = this.tickets.findIndex((ticket) => ticket.id === numericId);
    if (index === -1) return null;

    this.tickets[index] = {
      ...this.tickets[index],
      ...updates
    };
    return this.tickets[index];
  }

  delete(id) {
    const numericId = Number(id);
    const index = this.tickets.findIndex((ticket) => ticket.id === numericId);
    if (index === -1) return null;

    const removed = this.tickets.splice(index, 1);
    return removed[0];
  }

  getStats() {
    const total = this.tickets.length;
    const open = this.tickets.filter((x) => x.status === 'open').length;
    const closed = this.tickets.filter((x) => x.status === 'closed').length;
    const high = this.tickets.filter((x) => x.priority === 'high').length;
    const low = this.tickets.filter((x) => x.priority === 'low').length;
    const medium = this.tickets.filter((x) => x.priority === 'medium').length;
    return { total, open, closed, high, medium, low };
  }
}

module.exports = new TicketRepository();
