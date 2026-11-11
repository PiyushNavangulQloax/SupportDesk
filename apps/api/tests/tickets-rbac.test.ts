import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { TicketsService } from "../src/services/tickets.service.js";
import {
  TicketsRepository,
  type TicketRecord,
  type ListTicketsFilters,
  type CreateTicketData,
  type UpdateTicketData,
  TicketStatus,
  TicketPriority,
} from "../src/repositories/tickets.repository.js";
import { UserRole } from "../src/generated/prisma/enums.js";
import { NotFoundError, ForbiddenError, UnauthorizedError } from "../src/errors/appError.js";
import { authenticate } from "../src/middleware/auth.middleware.js";
import type { AuthenticatedUser } from "../src/types/express.js";

/**
 * In-memory test double for TicketsRepository to test all authorization,
 * isolation, and RBAC rules independently of a live database.
 */
class InMemoryTicketsRepository extends TicketsRepository {
  public tickets: Map<string, TicketRecord> = new Map();

  async findMany(filters: ListTicketsFilters = {}): Promise<[TicketRecord[], number]> {
    let result = Array.from(this.tickets.values());
    if (filters.status) result = result.filter((t) => t.status === filters.status);
    if (filters.priority) result = result.filter((t) => t.priority === filters.priority);
    if (filters.category) result = result.filter((t) => t.category?.includes(filters.category!));
    if (filters.createdById) result = result.filter((t) => t.createdById === filters.createdById);
    return [result, result.length];
  }

  async findById(id: string): Promise<TicketRecord | null> {
    const record = this.tickets.get(id);
    return record ? { ...record } : null;
  }

  async create(data: CreateTicketData): Promise<TicketRecord> {
    const id = `00000002-0000-0000-0000-${String(this.tickets.size + 1).padStart(12, "0")}`;
    const record: TicketRecord = {
      id,
      title: data.title,
      description: data.description,
      status: TicketStatus.OPEN,
      priority: data.priority ?? TicketPriority.P3,
      category: data.category ?? null,
      createdById: data.createdById,
      assigneeId: data.assigneeId ?? null,
      slaDueAt: data.slaDueAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tickets.set(id, record);
    return { ...record };
  }

  async update(id: string, data: UpdateTicketData): Promise<TicketRecord> {
    const existing = this.tickets.get(id);
    if (!existing) throw new Error("Ticket not found");
    const updated: TicketRecord = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.tickets.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<TicketRecord> {
    const existing = this.tickets.get(id);
    if (!existing) throw new Error("Ticket not found");
    this.tickets.delete(id);
    return { ...existing };
  }

  async countRelations(_id: string): Promise<{ commentsCount: number; attachmentsCount: number }> {
    return { commentsCount: 0, attachmentsCount: 0 };
  }
}

describe("Day 10 — Step 7B: Ticket Authorization and RBAC Tests", () => {
  let mockRepo: InMemoryTicketsRepository;
  let service: TicketsService;

  const customer1: AuthenticatedUser = {
    id: "00000001-0000-0000-0000-000000000001",
    email: "alice@example.com",
    role: UserRole.CUSTOMER,
  };

  const customer2: AuthenticatedUser = {
    id: "00000001-0000-0000-0000-000000000002",
    email: "bob@example.com",
    role: UserRole.CUSTOMER,
  };

  const agent: AuthenticatedUser = {
    id: "00000001-0000-0000-0000-000000000003",
    email: "priya@supportdesk.internal",
    role: UserRole.AGENT,
  };

  const admin: AuthenticatedUser = {
    id: "00000001-0000-0000-0000-000000000004",
    email: "admin@supportdesk.internal",
    role: UserRole.ADMIN,
  };

  let ticketAlice: TicketRecord;
  let ticketBob: TicketRecord;

  beforeEach(async () => {
    mockRepo = new InMemoryTicketsRepository();
    service = new TicketsService(mockRepo);

    // Seed one ticket for Customer 1 and one ticket for Customer 2
    ticketAlice = await service.createTicket(
      {
        title: "Alice's Issue",
        description: "Billing question",
      },
      customer1
    );

    ticketBob = await service.createTicket(
      {
        title: "Bob's Issue",
        description: "Technical issue",
      },
      customer2
    );
  });

  describe("1. Route Protection & Anonymous Access", () => {
    it("Anonymous requests return 401 Unauthorized via authenticate middleware", () => {
      const req: any = { headers: {} };
      let capturedError: any = null;

      authenticate(req, {} as any, (err?: any) => {
        capturedError = err;
      });

      assert.ok(capturedError instanceof UnauthorizedError);
      assert.equal(capturedError.statusCode, 401);
      assert.equal(capturedError.code, "UNAUTHORIZED");
      assert.ok(capturedError.message.includes("missing"));
    });
  });

  describe("2. Ticket Listing Isolation", () => {
    it("CUSTOMER sees only their own tickets", async () => {
      const result = await service.listTickets({}, customer1);

      assert.equal(result.tickets.length, 1);
      assert.equal(result.tickets[0].id, ticketAlice.id);
      assert.equal(result.tickets[0].createdById, customer1.id);
    });

    it("AGENT sees all tickets across all customers", async () => {
      const result = await service.listTickets({}, agent);

      assert.equal(result.tickets.length, 2);
      const ticketIds = result.tickets.map((t) => t.id);
      assert.ok(ticketIds.includes(ticketAlice.id));
      assert.ok(ticketIds.includes(ticketBob.id));
    });

    it("ADMIN sees all tickets across all customers", async () => {
      const result = await service.listTickets({}, admin);

      assert.equal(result.tickets.length, 2);
    });
  });

  describe("3. Ticket Fetching & IDOR Protection", () => {
    it("CUSTOMER can view their own ticket", async () => {
      const ticket = await service.getTicketById(ticketAlice.id, customer1);

      assert.equal(ticket.id, ticketAlice.id);
      assert.equal(ticket.createdById, customer1.id);
    });

    it("CUSTOMER cannot view another customer's ticket (returns 404 anti-enumeration)", async () => {
      await assert.rejects(
        async () => {
          await service.getTicketById(ticketBob.id, customer1);
        },
        (err: unknown) => {
          assert.equal(err instanceof NotFoundError, true);
          assert.equal((err as NotFoundError).statusCode, 404);
          assert.equal((err as NotFoundError).code, "NOT_FOUND");
          return true;
        }
      );
    });

    it("AGENT and ADMIN can view any customer's ticket", async () => {
      const ticketForAgent = await service.getTicketById(ticketAlice.id, agent);
      assert.equal(ticketForAgent.id, ticketAlice.id);

      const ticketForAdmin = await service.getTicketById(ticketBob.id, admin);
      assert.equal(ticketForAdmin.id, ticketBob.id);
    });
  });

  describe("4. Ticket Creation & Ownership Derivation", () => {
    it("Ticket creation automatically sets createdById to authenticated user ID", async () => {
      const newTicket = await service.createTicket(
        {
          title: "Another Issue by Alice",
          description: "Feature request",
        },
        customer1
      );

      assert.equal(newTicket.createdById, customer1.id);
    });

    it("Customer cannot assign a ticket to an agent during creation (403)", async () => {
      await assert.rejects(
        async () => {
          await service.createTicket(
            {
              title: "Alice trying to assign",
              description: "Attempting to assign agent",
              assigneeId: agent.id,
            },
            customer1
          );
        },
        (err: unknown) => {
          assert.equal(err instanceof ForbiddenError, true);
          assert.equal((err as ForbiddenError).statusCode, 403);
          assert.equal((err as ForbiddenError).code, "FORBIDDEN");
          assert.ok((err as ForbiddenError).message.includes("Customers are not permitted to assign"));
          return true;
        }
      );
    });

    it("AGENT can create ticket and assign assigneeId", async () => {
      const agentTicket = await service.createTicket(
        {
          title: "Created by Agent",
          description: "Internal ticket",
          assigneeId: agent.id,
        },
        agent
      );

      assert.equal(agentTicket.createdById, agent.id);
      assert.equal(agentTicket.assigneeId, agent.id);
    });
  });

  describe("5. Ticket Updates & Modification Rights", () => {
    it("CUSTOMER can update permitted fields on their own ticket (title, description)", async () => {
      const updated = await service.updateTicket(
        ticketAlice.id,
        {
          title: "Alice's Updated Title",
          description: "Updated description details",
        },
        customer1
      );

      assert.equal(updated.id, ticketAlice.id);
      assert.equal(updated.title, "Alice's Updated Title");
    });

    it("CUSTOMER cannot update another customer's ticket (returns 404 anti-enumeration)", async () => {
      await assert.rejects(
        async () => {
          await service.updateTicket(
            ticketBob.id,
            { title: "Alice trying to modify Bob's ticket" },
            customer1
          );
        },
        (err: unknown) => {
          assert.equal(err instanceof NotFoundError, true);
          assert.equal((err as NotFoundError).statusCode, 404);
          return true;
        }
      );
    });

    it("CUSTOMER cannot change ticket status (403)", async () => {
      await assert.rejects(
        async () => {
          await service.updateTicket(
            ticketAlice.id,
            { status: "RESOLVED" as any },
            customer1
          );
        },
        (err: unknown) => {
          assert.equal(err instanceof ForbiddenError, true);
          assert.equal((err as ForbiddenError).statusCode, 403);
          assert.equal((err as ForbiddenError).code, "FORBIDDEN");
          assert.ok((err as ForbiddenError).message.includes("status"));
          return true;
        }
      );
    });

    it("CUSTOMER cannot assign tickets (403)", async () => {
      await assert.rejects(
        async () => {
          await service.updateTicket(
            ticketAlice.id,
            { assigneeId: agent.id },
            customer1
          );
        },
        (err: unknown) => {
          assert.equal(err instanceof ForbiddenError, true);
          assert.equal((err as ForbiddenError).statusCode, 403);
          assert.equal((err as ForbiddenError).code, "FORBIDDEN");
          return true;
        }
      );
    });

    it("AGENT can update status and assign tickets", async () => {
      const updated = await service.updateTicket(
        ticketAlice.id,
        {
          status: "IN_PROGRESS" as any,
          assigneeId: agent.id,
        },
        agent
      );

      assert.equal(updated.status, TicketStatus.IN_PROGRESS);
      assert.equal(updated.assigneeId, agent.id);
    });
  });

  describe("6. Ticket Deletion Permissions", () => {
    it("CUSTOMER cannot delete tickets (403)", async () => {
      await assert.rejects(
        async () => {
          await service.deleteTicket(ticketAlice.id, customer1);
        },
        (err: unknown) => {
          assert.equal(err instanceof ForbiddenError, true);
          assert.equal((err as ForbiddenError).statusCode, 403);
          assert.equal((err as ForbiddenError).code, "FORBIDDEN");
          return true;
        }
      );
    });

    it("AGENT cannot delete tickets (403)", async () => {
      await assert.rejects(
        async () => {
          await service.deleteTicket(ticketAlice.id, agent);
        },
        (err: unknown) => {
          assert.equal(err instanceof ForbiddenError, true);
          assert.equal((err as ForbiddenError).statusCode, 403);
          assert.equal((err as ForbiddenError).code, "FORBIDDEN");
          return true;
        }
      );
    });

    it("ADMIN can delete tickets", async () => {
      const result = await service.deleteTicket(ticketAlice.id, admin);

      assert.equal(result.id, ticketAlice.id);
      assert.equal(result.deleted, true);
      assert.equal(mockRepo.tickets.has(ticketAlice.id), false);
    });
  });
});

