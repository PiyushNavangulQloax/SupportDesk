import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { createCommentBodySchema, ticketIdParamSchema } from "../src/schemas/comment.schema.js";
import { CommentsService } from "../src/services/comments.service.js";
import { CommentsRepository, type CommentRecord } from "../src/repositories/comments.repository.js";
import { TicketsRepository, type TicketRecord } from "../src/repositories/tickets.repository.js";
import { UserRole, TicketStatus, TicketPriority } from "../src/generated/prisma/enums.js";
import { NotFoundError, ForbiddenError } from "../src/errors/appError.js";
import type { AuthenticatedUser } from "../src/types/express.js";

describe("Stage 3 — Comments API Unit Tests (Jest)", () => {
  // =========================================================================
  // PART 1: Comment Input Validation Schemas
  // =========================================================================
  describe("Comment Input Validation Schemas", () => {
    describe("ticketIdParamSchema", () => {
      it("accepts a valid UUID ticketId", () => {
        const result = ticketIdParamSchema.safeParse({
          ticketId: "11111111-1111-1111-1111-111111111111",
        });
        expect(result.success).toBe(true);
      });

      it("rejects an invalid UUID ticketId", () => {
        const result = ticketIdParamSchema.safeParse({
          ticketId: "invalid-uuid-format",
        });
        expect(result.success).toBe(false);
      });
    });

    describe("createCommentBodySchema", () => {
      it("validates a standard public comment body and defaults isInternal to false", () => {
        const result = createCommentBodySchema.safeParse({
          body: "This is a helpful customer update.",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.body).toBe("This is a helpful customer update.");
          expect(result.data.isInternal).toBe(false);
        }
      });

      it("accepts an internal comment flag when provided", () => {
        const result = createCommentBodySchema.safeParse({
          body: "Internal staff note: verified billing invoice with finance team.",
          isInternal: true,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isInternal).toBe(true);
        }
      });

      it("trims whitespace from comment body", () => {
        const result = createCommentBodySchema.safeParse({
          body: "   Trimmed comment message   ",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.body).toBe("Trimmed comment message");
        }
      });

      it("rejects empty comment body", () => {
        const emptyResult = createCommentBodySchema.safeParse({ body: "" });
        expect(emptyResult.success).toBe(false);

        const whitespaceResult = createCommentBodySchema.safeParse({ body: "    " });
        expect(whitespaceResult.success).toBe(false);
      });

      it("rejects comments exceeding maximum length (5000 characters)", () => {
        const longBody = "a".repeat(5001);
        const result = createCommentBodySchema.safeParse({ body: longBody });
        expect(result.success).toBe(false);
      });

      it("ignores and strips client-supplied authorId to prevent identity spoofing", () => {
        const result = createCommentBodySchema.safeParse({
          body: "Attempting to spoof authorId",
          authorId: "attacker-user-id",
        } as any);
        expect(result.success).toBe(true);
        if (result.success) {
          expect((result.data as any).authorId).toBeUndefined();
        }
      });
    });
  });

  // =========================================================================
  // PART 2: CommentsService Unit Tests (Mocked Repositories)
  // =========================================================================
  describe("CommentsService Unit Tests", () => {
    let mockCommentsRepo: jest.Mocked<CommentsRepository>;
    let mockTicketsRepo: jest.Mocked<TicketsRepository>;
    let service: CommentsService;

    const customerUser: AuthenticatedUser = {
      id: "cust-0001-0000-0000-000000000001",
      email: "alice@example.com",
      role: UserRole.CUSTOMER,
    };

    const foreignCustomerUser: AuthenticatedUser = {
      id: "cust-0002-0000-0000-000000000002",
      email: "bob@example.com",
      role: UserRole.CUSTOMER,
    };

    const agentUser: AuthenticatedUser = {
      id: "agent-0001-0000-0000-000000000001",
      email: "agent@supportdesk.internal",
      role: UserRole.AGENT,
    };

    const adminUser: AuthenticatedUser = {
      id: "admin-0001-0000-0000-000000000001",
      email: "admin@supportdesk.internal",
      role: UserRole.ADMIN,
    };

    const sampleTicket: TicketRecord = {
      id: "ticket-0001-0000-0000-000000000001",
      title: "Cannot access billing portal",
      description: "Getting a 403 error on the invoices page",
      status: TicketStatus.OPEN,
      priority: TicketPriority.P2,
      category: "Billing",
      createdById: customerUser.id,
      assigneeId: agentUser.id,
      slaDueAt: null,
      createdAt: new Date("2026-11-01T10:00:00Z"),
      updatedAt: new Date("2026-11-01T10:00:00Z"),
    };

    const publicComment: CommentRecord = {
      id: "comment-0001-0000-0000-000000000001",
      ticketId: sampleTicket.id,
      authorId: customerUser.id,
      body: "Here is a screenshot of the issue.",
      isInternal: false,
      createdAt: new Date("2026-11-01T11:00:00Z"),
      author: {
        id: customerUser.id,
        name: "Alice Customer",
        email: customerUser.email,
        role: UserRole.CUSTOMER,
      },
    };

    const internalComment: CommentRecord = {
      id: "comment-0002-0000-0000-000000000002",
      ticketId: sampleTicket.id,
      authorId: agentUser.id,
      body: "Internal staff note: Customer account has unpaid balance.",
      isInternal: true,
      createdAt: new Date("2026-11-01T11:30:00Z"),
      author: {
        id: agentUser.id,
        name: "Support Agent",
        email: agentUser.email,
        role: UserRole.AGENT,
      },
    };

    beforeEach(() => {
      mockCommentsRepo = {
        create: jest.fn<any>(),
        findByTicketId: jest.fn<any>(),
      } as unknown as jest.Mocked<CommentsRepository>;

      mockTicketsRepo = {
        findMany: jest.fn<any>(),
        findById: (jest.fn() as any).mockResolvedValue(sampleTicket),
        create: jest.fn<any>(),
        update: jest.fn<any>(),
        delete: jest.fn<any>(),
        countRelations: jest.fn<any>(),
      } as unknown as jest.Mocked<TicketsRepository>;

      service = new CommentsService(mockCommentsRepo, mockTicketsRepo);
    });

    // -----------------------------------------------------------------------
    // Comment Creation
    // -----------------------------------------------------------------------
    describe("createComment", () => {
      it("allows a CUSTOMER to create a public comment on their own ticket", async () => {
        mockCommentsRepo.create.mockResolvedValueOnce(publicComment);

        const result = await service.createComment(
          sampleTicket.id,
          { body: "Here is a screenshot of the issue.", isInternal: false },
          customerUser
        );

        expect(result).toEqual(publicComment);
        expect(mockCommentsRepo.create).toHaveBeenCalledWith({
          ticketId: sampleTicket.id,
          authorId: customerUser.id, // Strictly derived from req.user
          body: "Here is a screenshot of the issue.",
          isInternal: false,
        });
      });

      it("rejects CUSTOMER attempt to create an internal comment with 403 Forbidden", async () => {
        await expect(
          service.createComment(
            sampleTicket.id,
            { body: "Malicious customer trying to create internal note", isInternal: true },
            customerUser
          )
        ).rejects.toThrow(ForbiddenError);

        expect(mockCommentsRepo.create).not.toHaveBeenCalled();
      });

      it("allows an AGENT to create a public comment", async () => {
        mockCommentsRepo.create.mockResolvedValueOnce({
          ...publicComment,
          authorId: agentUser.id,
        });

        await service.createComment(
          sampleTicket.id,
          { body: "We are investigating the billing issue.", isInternal: false },
          agentUser
        );

        expect(mockCommentsRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            authorId: agentUser.id,
            isInternal: false,
          })
        );
      });

      it("allows an AGENT to create an internal comment", async () => {
        mockCommentsRepo.create.mockResolvedValueOnce(internalComment);

        await service.createComment(
          sampleTicket.id,
          { body: "Internal staff note: Customer account has unpaid balance.", isInternal: true },
          agentUser
        );

        expect(mockCommentsRepo.create).toHaveBeenCalledWith({
          ticketId: sampleTicket.id,
          authorId: agentUser.id,
          body: "Internal staff note: Customer account has unpaid balance.",
          isInternal: true,
        });
      });

      it("allows an ADMIN to create an internal comment", async () => {
        mockCommentsRepo.create.mockResolvedValueOnce({
          ...internalComment,
          authorId: adminUser.id,
        });

        await service.createComment(
          sampleTicket.id,
          { body: "Admin note: Escalated to engineering lead.", isInternal: true },
          adminUser
        );

        expect(mockCommentsRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            authorId: adminUser.id,
            isInternal: true,
          })
        );
      });

      it("throws NotFoundError (404) if the ticket does not exist", async () => {
        mockTicketsRepo.findById.mockResolvedValueOnce(null);

        await expect(
          service.createComment(
            "00000000-0000-0000-0000-000000000000",
            { body: "Comment on missing ticket", isInternal: false },
            agentUser
          )
        ).rejects.toThrow(NotFoundError);

        expect(mockCommentsRepo.create).not.toHaveBeenCalled();
      });

      it("throws NotFoundError (404) if a CUSTOMER tries to comment on another customer's ticket", async () => {
        await expect(
          service.createComment(
            sampleTicket.id,
            { body: "Attempt to comment on another customer's ticket", isInternal: false },
            foreignCustomerUser
          )
        ).rejects.toThrow(NotFoundError);

        expect(mockCommentsRepo.create).not.toHaveBeenCalled();
      });

      it("strictly binds authorId to authenticated user context even if client supplies foreign authorId", async () => {
        mockCommentsRepo.create.mockResolvedValueOnce(publicComment);

        await service.createComment(
          sampleTicket.id,
          {
            body: "Testing authorId tampering",
            authorId: "spoofed-user-id",
          } as any,
          customerUser
        );

        expect(mockCommentsRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            authorId: customerUser.id, // Strictly authentic identity
          })
        );
      });
    });

    // -----------------------------------------------------------------------
    // Comment Listing & Visibility
    // -----------------------------------------------------------------------
    describe("listComments", () => {
      it("returns only public comments for CUSTOMER role (includeInternal=false)", async () => {
        mockCommentsRepo.findByTicketId.mockResolvedValueOnce([publicComment]);

        const result = await service.listComments(sampleTicket.id, customerUser);

        expect(result).toEqual([publicComment]);
        expect(mockCommentsRepo.findByTicketId).toHaveBeenCalledWith(sampleTicket.id, false);
      });

      it("ensures CUSTOMER never receives internal comments in responses", async () => {
        mockCommentsRepo.findByTicketId.mockResolvedValueOnce([publicComment]);

        const result = await service.listComments(sampleTicket.id, customerUser);

        for (const comment of result) {
          expect(comment.isInternal).toBe(false);
        }
      });

      it("throws NotFoundError (404) if CUSTOMER tries to list comments on another customer's ticket", async () => {
        await expect(
          service.listComments(sampleTicket.id, foreignCustomerUser)
        ).rejects.toThrow(NotFoundError);

        expect(mockCommentsRepo.findByTicketId).not.toHaveBeenCalled();
      });

      it("returns both public and internal comments for AGENT role (includeInternal=true)", async () => {
        mockCommentsRepo.findByTicketId.mockResolvedValueOnce([publicComment, internalComment]);

        const result = await service.listComments(sampleTicket.id, agentUser);

        expect(result).toHaveLength(2);
        expect(mockCommentsRepo.findByTicketId).toHaveBeenCalledWith(sampleTicket.id, true);
      });

      it("returns both public and internal comments for ADMIN role (includeInternal=true)", async () => {
        mockCommentsRepo.findByTicketId.mockResolvedValueOnce([publicComment, internalComment]);

        const result = await service.listComments(sampleTicket.id, adminUser);

        expect(result).toHaveLength(2);
        expect(mockCommentsRepo.findByTicketId).toHaveBeenCalledWith(sampleTicket.id, true);
      });

      it("throws NotFoundError (404) if ticket does not exist when listing comments", async () => {
        mockTicketsRepo.findById.mockResolvedValueOnce(null);

        await expect(
          service.listComments("00000000-0000-0000-0000-000000000000", agentUser)
        ).rejects.toThrow(NotFoundError);

        expect(mockCommentsRepo.findByTicketId).not.toHaveBeenCalled();
      });

      it("returns comments in chronological order", async () => {
        const earlierComment: CommentRecord = {
          ...publicComment,
          id: "comment-earlier",
          createdAt: new Date("2026-11-01T09:00:00Z"),
        };
        const laterComment: CommentRecord = {
          ...publicComment,
          id: "comment-later",
          createdAt: new Date("2026-11-01T10:00:00Z"),
        };

        mockCommentsRepo.findByTicketId.mockResolvedValueOnce([earlierComment, laterComment]);

        const result = await service.listComments(sampleTicket.id, agentUser);

        expect(result[0].createdAt.getTime()).toBeLessThan(result[1].createdAt.getTime());
      });
    });
  });
});

