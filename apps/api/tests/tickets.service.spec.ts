import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { TicketsService } from "../src/services/tickets.service.js";
import { TicketsRepository } from "../src/repositories/tickets.repository.js";
import { UserRole, TicketStatus, TicketPriority } from "../src/generated/prisma/enums.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../src/errors/appError.js";
import type { AuthenticatedUser } from "../src/types/express.js";

describe("TicketsService CRUD & Authorization Unit Tests (Jest)", () => {
  let mockRepo: jest.Mocked<TicketsRepository>;
  let service: TicketsService;

  const customerUser: AuthenticatedUser = {
    id: "cust-1",
    email: "cust@example.com",
    role: UserRole.CUSTOMER,
  };

  const otherCustomerUser: AuthenticatedUser = {
    id: "cust-2",
    email: "other@example.com",
    role: UserRole.CUSTOMER,
  };

  const agentUser: AuthenticatedUser = {
    id: "agent-1",
    email: "agent@supportdesk.internal",
    role: UserRole.AGENT,
  };

  const adminUser: AuthenticatedUser = {
    id: "admin-1",
    email: "admin@supportdesk.internal",
    role: UserRole.ADMIN,
  };

  const sampleTicket = {
    id: "ticket-1",
    title: "Sample Issue",
    description: "Sample Description",
    status: TicketStatus.OPEN,
    priority: TicketPriority.P3,
    category: "General",
    createdById: "cust-1",
    assigneeId: null,
    slaDueAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepo = {
      findMany: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countRelations: jest.fn(),
    } as unknown as jest.Mocked<TicketsRepository>;

    service = new TicketsService(mockRepo);
  });

  describe("getTicketById", () => {
    it("throws NotFoundError if ticket does not exist", async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(service.getTicketById("missing-id", customerUser)).rejects.toThrow(
        NotFoundError
      );
    });

    it("throws NotFoundError if CUSTOMER attempts to view another customer's ticket", async () => {
      mockRepo.findById.mockResolvedValueOnce(sampleTicket as any);

      await expect(service.getTicketById("ticket-1", otherCustomerUser)).rejects.toThrow(
        NotFoundError
      );
    });

    it("returns ticket when CUSTOMER views their own ticket", async () => {
      mockRepo.findById.mockResolvedValueOnce(sampleTicket as any);

      const result = await service.getTicketById("ticket-1", customerUser);
      expect(result.id).toBe("ticket-1");
    });

    it("allows AGENT and ADMIN to view any customer's ticket", async () => {
      mockRepo.findById.mockResolvedValue(sampleTicket as any);

      const agentRes = await service.getTicketById("ticket-1", agentUser);
      expect(agentRes.id).toBe("ticket-1");

      const adminRes = await service.getTicketById("ticket-1", adminUser);
      expect(adminRes.id).toBe("ticket-1");
    });
  });

  describe("createTicket", () => {
    it("throws ForbiddenError if CUSTOMER attempts to specify an assigneeId", async () => {
      await expect(
        service.createTicket(
          {
            title: "Test",
            description: "Test Desc",
            priority: TicketPriority.P3,
            assigneeId: "00000000-0000-0000-0000-000000000001",
          },
          customerUser
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it("creates ticket with createdById derived from authenticated user", async () => {
      mockRepo.create.mockResolvedValueOnce(sampleTicket as any);

      const result = await service.createTicket(
        {
          title: "New Ticket",
          description: "New Desc",
          priority: TicketPriority.P2,
          category: "Hardware",
          slaDueAt: "2026-12-01T00:00:00.000Z",
        },
        customerUser
      );

      expect(mockRepo.create).toHaveBeenCalledWith({
        title: "New Ticket",
        description: "New Desc",
        priority: TicketPriority.P2,
        category: "Hardware",
        createdById: customerUser.id,
        assigneeId: undefined,
        slaDueAt: expect.any(Date),
      });
      expect(result.id).toBe("ticket-1");
    });

    it("allows AGENT to set assigneeId upon ticket creation", async () => {
      mockRepo.create.mockResolvedValueOnce(sampleTicket as any);

      await service.createTicket(
        {
          title: "Agent Created",
          description: "Agent Desc",
          priority: TicketPriority.P3,
          assigneeId: agentUser.id,
        },
        agentUser
      );

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assigneeId: agentUser.id,
          createdById: agentUser.id,
        })
      );
    });
  });

  describe("updateTicket", () => {
    it("throws NotFoundError if ticket does not exist", async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(
        service.updateTicket("missing-id", { title: "Updated" }, customerUser)
      ).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError if CUSTOMER attempts to update another customer's ticket", async () => {
      mockRepo.findById.mockResolvedValueOnce(sampleTicket as any);

      await expect(
        service.updateTicket("ticket-1", { title: "Updated" }, otherCustomerUser)
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ForbiddenError if CUSTOMER attempts to update status or assignee", async () => {
      mockRepo.findById.mockResolvedValue(sampleTicket as any);

      await expect(
        service.updateTicket("ticket-1", { status: TicketStatus.RESOLVED }, customerUser)
      ).rejects.toThrow(ForbiddenError);

      await expect(
        service.updateTicket(
          "ticket-1",
          { assigneeId: "00000000-0000-0000-0000-000000000001" },
          customerUser
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it("allows CUSTOMER to update title and description of own ticket", async () => {
      mockRepo.findById.mockResolvedValueOnce(sampleTicket as any);
      mockRepo.update.mockResolvedValueOnce({
        ...sampleTicket,
        title: "Updated Title",
      } as any);

      const result = await service.updateTicket(
        "ticket-1",
        { title: "Updated Title" },
        customerUser
      );

      expect(mockRepo.update).toHaveBeenCalledWith("ticket-1", expect.objectContaining({
        title: "Updated Title",
      }));
      expect(result.title).toBe("Updated Title");
    });

    it("allows AGENT to update status, assignee, and slaDueAt", async () => {
      mockRepo.findById.mockResolvedValueOnce(sampleTicket as any);
      mockRepo.update.mockResolvedValueOnce(sampleTicket as any);

      await service.updateTicket(
        "ticket-1",
        {
          status: TicketStatus.RESOLVED,
          assigneeId: agentUser.id,
          slaDueAt: "2026-12-05T00:00:00.000Z",
        },
        agentUser
      );

      expect(mockRepo.update).toHaveBeenCalledWith("ticket-1", expect.objectContaining({
        status: TicketStatus.RESOLVED,
        assigneeId: agentUser.id,
        slaDueAt: expect.any(Date),
      }));
    });
  });

  describe("deleteTicket", () => {
    it("throws ForbiddenError if non-admin user attempts to delete a ticket", async () => {
      await expect(service.deleteTicket("ticket-1", customerUser)).rejects.toThrow(
        ForbiddenError
      );
      await expect(service.deleteTicket("ticket-1", agentUser)).rejects.toThrow(
        ForbiddenError
      );
    });

    it("throws NotFoundError if admin attempts to delete a non-existent ticket", async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(service.deleteTicket("missing-id", adminUser)).rejects.toThrow(
        NotFoundError
      );
    });

    it("throws BadRequestError if ticket has existing comments or attachments", async () => {
      mockRepo.findById.mockResolvedValueOnce(sampleTicket as any);
      mockRepo.countRelations.mockResolvedValueOnce({
        commentsCount: 2,
        attachmentsCount: 0,
      });

      await expect(service.deleteTicket("ticket-1", adminUser)).rejects.toThrow(
        BadRequestError
      );
    });

    it("deletes ticket when admin requests deletion of ticket with no relations", async () => {
      mockRepo.findById.mockResolvedValueOnce(sampleTicket as any);
      mockRepo.countRelations.mockResolvedValueOnce({
        commentsCount: 0,
        attachmentsCount: 0,
      });
      mockRepo.delete.mockResolvedValueOnce({ id: "ticket-1" } as any);

      const result = await service.deleteTicket("ticket-1", adminUser);
      expect(result).toEqual({ id: "ticket-1", deleted: true });
      expect(mockRepo.delete).toHaveBeenCalledWith("ticket-1");
    });
  });
});
