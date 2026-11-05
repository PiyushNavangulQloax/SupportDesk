const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const ticketRepository = require('../src/repositories/ticketRepository');

describe('SupportDesk MVC Regression & Contract Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      // Listen on ephemeral port (0) to prevent port collisions
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    // Reset in-memory repository to clean state before every test
    ticketRepository.reset();
  });

  describe('GET /health', () => {
    it('returns 200 and health status', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.deepEqual(body, {
        success: true,
        service: 'supportdesk-demo'
      });
    });
  });

  describe('GET /tickets', () => {
    it('returns all 3 initial seed tickets with count', async () => {
      const res = await fetch(`${baseUrl}/tickets`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.count, 3);
      assert.equal(body.data.length, 3);
      assert.equal(body.data[0].title, 'Login issue');
    });

    it('filters tickets by status', async () => {
      const res = await fetch(`${baseUrl}/tickets?status=open`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.count, 2);
      assert.ok(body.data.every((t) => t.status === 'open'));
    });

    it('filters tickets by priority', async () => {
      const res = await fetch(`${baseUrl}/tickets?priority=high`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.count, 2);
      assert.ok(body.data.every((t) => t.priority === 'high'));
    });

    it('filters tickets by owner (case-insensitive substring match)', async () => {
      const res = await fetch(`${baseUrl}/tickets?owner=asha`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.count, 1);
      assert.equal(body.data[0].owner, 'Asha');
    });

    it('filters tickets by multiple criteria', async () => {
      const res = await fetch(`${baseUrl}/tickets?status=open&priority=high`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.count, 1);
      assert.equal(body.data[0].id, 1);
    });

    it('returns count 0 and empty array when no tickets match query', async () => {
      const res = await fetch(`${baseUrl}/tickets?status=archived`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.deepEqual(body, {
        success: true,
        count: 0,
        data: []
      });
    });
  });

  describe('GET /tickets/stats/summary', () => {
    it('returns 200 and accurate initial statistics', async () => {
      const res = await fetch(`${baseUrl}/tickets/stats/summary`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.deepEqual(body, {
        success: true,
        data: {
          total: 3,
          open: 2,
          closed: 1,
          high: 2,
          medium: 0,
          low: 1
        }
      });
    });
  });

  describe('GET /tickets/:id', () => {
    it('returns 200 and ticket details with whitelist projection', async () => {
      const res = await fetch(`${baseUrl}/tickets/1`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, 1);
      assert.equal(body.data.title, 'Login issue');
      assert.equal(body.data.description, 'Cannot sign in');
      assert.equal(body.data.status, 'open');
      assert.equal(body.data.priority, 'high');
      assert.equal(body.data.owner, 'Asha');
      assert.ok(body.data.createdAt);
      // Whitelist contract: ensure closedAt/closedBy are not exposed
      assert.equal(body.data.closedAt, undefined);
      assert.equal(body.data.closedBy, undefined);
    });

    it('returns 404 when ticket numeric ID does not exist', async () => {
      const res = await fetch(`${baseUrl}/tickets/999`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.deepEqual(body, {
        success: false,
        message: 'Ticket not found'
      });
    });

    it('returns 404 when ticket ID is non-numeric', async () => {
      const res = await fetch(`${baseUrl}/tickets/non-numeric-id`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.deepEqual(body, {
        success: false,
        message: 'Ticket not found'
      });
    });
  });

  describe('POST /tickets', () => {
    it('creates a new ticket with valid payload and returns 201', async () => {
      const payload = {
        title: 'New bug reported',
        description: 'App crashes on checkout',
        priority: 'high',
        owner: 'Developer'
      };
      const res = await fetch(`${baseUrl}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, 'Ticket created');
      assert.equal(body.data.id, 4);
      assert.equal(body.data.title, 'New bug reported');
      assert.equal(body.data.description, 'App crashes on checkout');
      assert.equal(body.data.status, 'open');
      assert.equal(body.data.priority, 'high');
      assert.equal(body.data.owner, 'Developer');
      assert.ok(body.data.createdAt);
    });

    it('creates ticket with default priority (medium) and owner (Unassigned)', async () => {
      const payload = {
        title: 'Default values ticket',
        description: 'Checking default values assignment'
      };
      const res = await fetch(`${baseUrl}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.data.priority, 'medium');
      assert.equal(body.data.owner, 'Unassigned');
    });

    it('returns 400 when title is missing or less than 3 characters', async () => {
      const res = await fetch(`${baseUrl}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '  ab  ', description: 'Valid description' })
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.deepEqual(body, {
        success: false,
        message: 'Title must be at least 3 characters'
      });
    });

    it('returns 400 when description is missing or less than 5 characters', async () => {
      const res = await fetch(`${baseUrl}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Valid title', description: '1234' })
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.deepEqual(body, {
        success: false,
        message: 'Description must be at least 5 characters'
      });
    });

    it('returns 400 when priority is invalid', async () => {
      const res = await fetch(`${baseUrl}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Valid title',
          description: 'Valid description',
          priority: 'urgent'
        })
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.deepEqual(body, {
        success: false,
        message: 'Invalid priority'
      });
    });

    it('returns 409 when an open ticket with the same title already exists', async () => {
      const res = await fetch(`${baseUrl}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'login issue', // case-insensitive duplicate of open ticket 1
          description: 'Cannot sign in again'
        })
      });
      assert.equal(res.status, 409);
      const body = await res.json();
      assert.deepEqual(body, {
        success: false,
        message: 'An open ticket with this title already exists'
      });
    });

    it('allows duplicate title if existing ticket is closed', async () => {
      const res = await fetch(`${baseUrl}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Payment failed', // Ticket 3 has this title but is closed
          description: 'Another payment failed issue'
        })
      });
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.title, 'Payment failed');
    });

    it('returns 400 when ticket limit exceeds 1000', async () => {
      // Mock repository count to exceed 1000
      const originalCount = ticketRepository.count;
      ticketRepository.count = () => 1001;

      try {
        const res = await fetch(`${baseUrl}/tickets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Overflow ticket',
            description: 'Trying to exceed max capacity'
          })
        });
        assert.equal(res.status, 400);
        const body = await res.json();
        assert.deepEqual(body, {
          success: false,
          message: 'Ticket limit reached'
        });
      } finally {
        ticketRepository.count = originalCount;
      }
    });
  });

  describe('POST /tickets/:id/close', () => {
    it('returns 404 when ticket to close is not found', async () => {
      const res = await fetch(`${baseUrl}/tickets/999/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.deepEqual(body, {
        success: false,
        message: 'Ticket not found'
      });
    });

    it('returns 400 when ticket is already closed', async () => {
      const res = await fetch(`${baseUrl}/tickets/3/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.deepEqual(body, {
        success: false,
        message: 'Ticket is already closed'
      });
    });

    it('returns 400 when closing high-priority ticket without confirm: true', async () => {
      const res = await fetch(`${baseUrl}/tickets/1/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: false })
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.deepEqual(body, {
        success: false,
        message: 'High priority ticket requires confirmation'
      });
    });

    it('successfully closes high-priority ticket when confirm: true', async () => {
      const res = await fetch(`${baseUrl}/tickets/1/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, closedBy: 'Alice' })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, 'Ticket closed');
      assert.equal(body.data.id, 1);
      assert.equal(body.data.status, 'closed');
      assert.equal(body.data.closedBy, 'Alice');
      assert.ok(body.data.closedAt);
    });

    it('successfully closes low-priority ticket without confirmation, defaulting closedBy to system', async () => {
      const res = await fetch(`${baseUrl}/tickets/2/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, 2);
      assert.equal(body.data.status, 'closed');
      assert.equal(body.data.closedBy, 'system');
    });
  });

  describe('DELETE /tickets/:id', () => {
    it('returns 404 when ticket to delete is not found', async () => {
      const res = await fetch(`${baseUrl}/tickets/999`, {
        method: 'DELETE'
      });
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.deepEqual(body, {
        success: false,
        message: 'Ticket not found'
      });
    });

    it('returns 400 when attempting to delete an open ticket', async () => {
      const res = await fetch(`${baseUrl}/tickets/1`, {
        method: 'DELETE'
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.deepEqual(body, {
        success: false,
        message: 'Only closed tickets can be deleted'
      });
    });

    it('deletes closed ticket and removes it from repository', async () => {
      const res = await fetch(`${baseUrl}/tickets/3`, {
        method: 'DELETE'
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, 'Ticket deleted');
      assert.equal(body.data.id, 3);

      // Verify it is gone
      const verifyRes = await fetch(`${baseUrl}/tickets/3`);
      assert.equal(verifyRes.status, 404);
    });
  });

  describe('Fallback 404 Route', () => {
    it('returns 404 with Endpoint not found for unmapped routes', async () => {
      const res = await fetch(`${baseUrl}/non-existent-route`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.deepEqual(body, {
        success: false,
        message: 'Endpoint not found'
      });
    });
  });
});
