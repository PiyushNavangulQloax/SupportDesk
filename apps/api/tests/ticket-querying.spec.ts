import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { listTicketsQuerySchema } from "../src/schemas/ticket.schema.js";
import { TicketsService } from "../src/services/tickets.service.js";
import { TicketsRepository, type TicketRecord } from "../src/repositories/tickets.repository.js";
import { UserRole, TicketStatus, TicketPriority } from "../src/generated/prisma/enums.js";
import type { AuthenticatedUser } from "../src/types/express.js";

describe("Stage 2 — Ticket Querying Unit Tests (Jest)", () => {
  // =========================================================================
  // FUNCTION A: Ticket Query Parameter Validation (listTicketsQuerySchema)
  // =========================================================================
  describe("Function A: Ticket Query Parameter Validation (listTicketsQuerySchema)", () => {
    describe("Pagination Validation", () => {
      it("applies default pagination values (page=1, limit=20, sortBy=createdAt, sortOrder=desc)", () => {
        const result = listTicketsQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(1);
          expect(result.data.limit).toBe(20);
          expect(result.data.sortBy).toBe("createdAt");
          expect(result.data.sortOrder).toBe("desc");
        }
      });

      it("coerces and accepts valid custom page and limit", () => {
        const result = listTicketsQuerySchema.safeParse({
          page: "3",
          limit: "50",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(3);
          expect(result.data.limit).toBe(50);
        }
      });

      it("rejects non-positive page parameter (page <= 0)", () => {
        const zeroPage = listTicketsQuerySchema.safeParse({ page: "0" });
        expect(zeroPage.success).toBe(false);

        const negativePage = listTicketsQuerySchema.safeParse({ page: "-5" });
        expect(negativePage.success).toBe(false);
      });

      it("rejects non-numeric page parameter", () => {
        const nonNumeric = listTicketsQuerySchema.safeParse({ page: "abc" });
        expect(nonNumeric.success).toBe(false);
      });

      it("rejects non-positive limit parameter (limit <= 0)", () => {
        const zeroLimit = listTicketsQuerySchema.safeParse({ limit: "0" });
        expect(zeroLimit.success).toBe(false);

        const negativeLimit = listTicketsQuerySchema.safeParse({ limit: "-10" });
        expect(negativeLimit.success).toBe(false);
      });

      it("rejects limit exceeding maximum 100", () => {
        const exceededLimit = listTicketsQuerySchema.safeParse({ limit: "101" });
        expect(exceededLimit.success).toBe(false);

        const hugeLimit = listTicketsQuerySchema.safeParse({ limit: "1000" });
        expect(hugeLimit.success).toBe(false);
      });

      it("accepts maximum permitted limit of exactly 100", () => {
        const maxLimit = listTicketsQuerySchema.safeParse({ limit: "100" });
        expect(maxLimit.success).toBe(true);
        if (maxLimit.success) {
          expect(maxLimit.data.limit).toBe(100);
        }
      });
    });

    describe("Filter Validation", () => {
      it("accepts valid TicketStatus enum filters", () => {
        const statuses = ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"];
        for (const status of statuses) {
          const result = listTicketsQuerySchema.safeParse({ status });
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.status).toBe(status);
          }
        }
      });

      it("rejects invalid TicketStatus values", () => {
        const result = listTicketsQuerySchema.safeParse({ status: "UNKNOWN_STATUS" });
        expect(result.success).toBe(false);
      });

      it("accepts valid TicketPriority enum filters", () => {
        const priorities = ["P1", "P2", "P3", "P4"];
        for (const priority of priorities) {
          const result = listTicketsQuerySchema.safeParse({ priority });
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.priority).toBe(priority);
          }
        }
      });

      it("rejects invalid TicketPriority values", () => {
        const result = listTicketsQuerySchema.safeParse({ priority: "CRITICAL" });
        expect(result.success).toBe(false);
      });

      it("accepts a valid UUID for assigneeId filter", () => {
        const validUuid = "11111111-1111-1111-1111-111111111111";
        const result = listTicketsQuerySchema.safeParse({ assigneeId: validUuid });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.assigneeId).toBe(validUuid);
        }
      });

      it("rejects non-UUID values for assigneeId filter", () => {
        const invalidUuid = "not-a-valid-uuid";
        const result = listTicketsQuerySchema.safeParse({ assigneeId: invalidUuid });
        expect(result.success).toBe(false);
      });

      it("validates combined filters simultaneously", () => {
        const combined = {
          page: "2",
          limit: "15",
          status: "OPEN",
          priority: "P1",
          assigneeId: "22222222-2222-2222-2222-222222222222",
          category: "Billing",
        };
        const result = listTicketsQuerySchema.safeParse(combined);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(2);
          expect(result.data.limit).toBe(15);
          expect(result.data.status).toBe("OPEN");
          expect(result.data.priority).toBe("P1");
          expect(result.data.assigneeId).toBe("22222222-2222-2222-2222-222222222222");
          expect(result.data.category).toBe("Billing");
        }
      });
    });

    describe("Search Parameter Validation", () => {
      it("accepts and trims valid search query strings", () => {
        const result = listTicketsQuerySchema.safeParse({ search: "  login issue  " });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.search).toBe("login issue");
        }
      });

      it("handles empty search string gracefully", () => {
        const result = listTicketsQuerySchema.safeParse({ search: "" });
        expect(result.success).toBe(true);
      });
    });

    describe("Sorting Allowlist Validation", () => {
      it("accepts permitted sort fields from allowlist", () => {
        const allowedSortFields = ["createdAt", "updatedAt", "priority", "status", "title"];
        for (const sortBy of allowedSortFields) {
          const result = listTicketsQuerySchema.safeParse({ sortBy });
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.sortBy).toBe(sortBy);
          }
        }
      });

      it("rejects arbitrary unapproved sort fields to prevent SQL injection and data leakage", () => {
        const unapprovedFields = ["passwordHash", "secret", "user.email", "nonExistentField", "id"];
        for (const sortBy of unapprovedFields) {
          const result = listTicketsQuerySchema.safeParse({ sortBy });
          expect(result.success).toBe(false);
        }
      });

      it("accepts valid sortOrder directions ('asc' and 'desc')", () => {
        const ascResult = listTicketsQuerySchema.safeParse({ sortOrder: "asc" });
        expect(ascResult.success).toBe(true);
        if (ascResult.success) {
          expect(ascResult.data.sortOrder).toBe("asc");
        }

        const descResult = listTicketsQuerySchema.safeParse({ sortOrder: "desc" });
        expect(descResult.success).toBe(true);
        if (descResult.success) {
          expect(descResult.data.sortOrder).toBe("desc");
        }
      });

      it("rejects invalid sortOrder values", () => {
        const invalidOrder = listTicketsQuerySchema.safeParse({ sortOrder: "ascending" });
        expect(invalidOrder.success).toBe(false);
      });
    });
  });

  // =========================================================================
  // FUNCTION B: Ticket Listing Service with RBAC & Filtering (TicketsService.listTickets)
  // =========================================================================
  describe("Function B: Ticket Listing Service with Role-Based Visibility", () => {
    let mockRepo: jest.Mocked<TicketsRepository>;
    let service: TicketsService;

    const mockCustomer: AuthenticatedUser = {
      id: "cust-0001-0000-0000-000000000001",
      email: "customer@example.com",
      role: UserRole.CUSTOMER,
    };

    const mockAgent: AuthenticatedUser = {
      id: "agent-0001-0000-0000-000000000001",
      email: "agent@supportdesk.internal",
      role: UserRole.AGENT,
    };

    const mockAdmin: AuthenticatedUser = {
      id: "admin-0001-0000-0000-000000000001",
      email: "admin@supportdesk.internal",
      role: UserRole.ADMIN,
    };

    const sampleTicket: TicketRecord = {
      id: "ticket-0001-0000-0000-000000000001",
      title: "Sample Network Error",
      description: "Unable to connect to VPN",
      status: TicketStatus.OPEN,
      priority: TicketPriority.P1,
      category: "Network",
      createdById: mockCustomer.id,
      assigneeId: mockAgent.id,
      slaDueAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockRepo = {
        findMany: (jest.fn() as any).mockResolvedValue([[sampleTicket], 1]),
        findById: jest.fn<any>(),
        create: jest.fn<any>(),
        update: jest.fn<any>(),
        delete: jest.fn<any>(),
        countRelations: jest.fn<any>(),
      } as unknown as jest.Mocked<TicketsRepository>;

      service = new TicketsService(mockRepo);
    });

    describe("Customer Ownership Restrictions (Security)", () => {
      it("restricts CUSTOMER query to only their own createdById at repository layer", async () => {
        await service.listTickets({} as any, mockCustomer);

        expect(mockRepo.findMany).toHaveBeenCalledTimes(1);
        const filterArg = mockRepo.findMany.mock.calls[0]![0]!;
        expect(filterArg.createdById).toBe(mockCustomer.id);
      });

      it("ensures CUSTOMER cannot bypass ownership by supplying an assignee filter or foreign createdById", async () => {
        await service.listTickets(
          {
            assigneeId: mockAgent.id,
          } as any,
          mockCustomer
        );

        const filterArg = mockRepo.findMany.mock.calls[0]![0]!;
        expect(filterArg.createdById).toBe(mockCustomer.id);
      });
    });

    describe("Agent and Admin Visibility Rules", () => {
      it("allows AGENT to view all tickets without createdById restriction", async () => {
        await service.listTickets({} as any, mockAgent);

        const filterArg = mockRepo.findMany.mock.calls[0]![0]!;
        expect(filterArg.createdById).toBeUndefined();
      });

      it("allows ADMIN to view all tickets without createdById restriction", async () => {
        await service.listTickets({} as any, mockAdmin);

        const filterArg = mockRepo.findMany.mock.calls[0]![0]!;
        expect(filterArg.createdById).toBeUndefined();
      });

      it("allows AGENT to filter tickets by assigneeId", async () => {
        const targetAssignee = "agent-9999-0000-0000-000000000001";
        await service.listTickets({ assigneeId: targetAssignee } as any, mockAgent);

        const filterArg = mockRepo.findMany.mock.calls[0]![0]!;
        expect(filterArg.assigneeId).toBe(targetAssignee);
      });
    });

    describe("Search Parameter Forwarding", () => {
      it("forwards search query string to repository findMany", async () => {
        await service.listTickets({ search: "VPN connection" } as any, mockAgent);

        const filterArg = mockRepo.findMany.mock.calls[0]![0]!;
        expect(filterArg.search).toBe("VPN connection");
      });
    });

    describe("Sorting Parameter Forwarding", () => {
      it("forwards sortBy and sortOrder parameters to repository findMany", async () => {
        await service.listTickets(
          {
            sortBy: "priority",
            sortOrder: "asc",
          } as any,
          mockAgent
        );

        const filterArg = mockRepo.findMany.mock.calls[0]![0]!;
        expect(filterArg.sortBy).toBe("priority");
        expect(filterArg.sortOrder).toBe("asc");
      });
    });

    describe("Pagination Calculations & Metadata", () => {
      it("correctly calculates totalPages and pagination metadata", async () => {
        mockRepo.findMany.mockResolvedValueOnce([[sampleTicket], 45]);

        const result = await service.listTickets({ page: 2, limit: 10 } as any, mockAgent);

        expect(result.pagination).toEqual({
          page: 2,
          limit: 10,
          total: 45,
          totalPages: 5,
        });
        expect(mockRepo.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 10,
            take: 10,
          })
        );
      });

      it("returns totalPages=1 and empty array when 0 tickets match", async () => {
        mockRepo.findMany.mockResolvedValueOnce([[], 0]);

        const result = await service.listTickets({ page: 1, limit: 20 } as any, mockAgent);

        expect(result.tickets).toEqual([]);
        expect(result.pagination.total).toBe(0);
        expect(result.pagination.totalPages).toBe(1);
      });
    });
  });
});

