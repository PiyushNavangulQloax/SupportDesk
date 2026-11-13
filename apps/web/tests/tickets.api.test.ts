import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTicketBodySchema, updateTicketBodySchema } from "@supportdesk/schemas/ticket.schema";
import {
  buildQueryString,
  listTickets,
  getTicketById,
  createTicket,
  updateTicket,
  listComments,
  createComment,
} from "../src/features/tickets/api/tickets.api";
import { ApiError } from "../src/lib/api-client";
import type { Ticket, Comment } from "../src/features/tickets/types";

describe("Shared Zod Schema Integration", () => {
  it("imports and executes createTicketBodySchema successfully", () => {
    const validData = {
      title: "Printer Not Working",
      description: "Cannot connect to the office printer via WiFi",
      priority: "P2" as const,
      category: "Hardware",
    };

    const result = createTicketBodySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Printer Not Working");
      expect(result.data.priority).toBe("P2");
    }
  });

  it("rejects ticket creation with title shorter than 3 characters", () => {
    const invalidData = {
      title: "Hi",
      description: "A valid long enough description",
      priority: "P3" as const,
    };

    const result = createTicketBodySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("title"));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain("Title must be at least 3 characters");
    }
  });

  it("rejects ticket creation with description shorter than 5 characters", () => {
    const invalidData = {
      title: "Valid Title Here",
      description: "Too",
      priority: "P3" as const,
    };

    const result = createTicketBodySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("description"));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain("Description must be at least 5 characters");
    }
  });

  it("imports and executes updateTicketBodySchema rejecting empty updates", () => {
    const emptyUpdate = {};
    const result = updateTicketBodySchema.safeParse(emptyUpdate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "At least one field must be provided to update"
      );
    }
  });
});

describe("Query Parameter Serialization", () => {
  it("returns empty string when query is undefined or empty", () => {
    expect(buildQueryString()).toBe("");
    expect(buildQueryString({})).toBe("");
  });

  it("serializes pagination parameters", () => {
    const qs = buildQueryString({ page: 2, limit: 10 });
    expect(qs).toBe("?page=2&limit=10");
  });

  it("serializes status, priority, and search filters", () => {
    const qs = buildQueryString({
      status: "OPEN",
      priority: "P1",
      search: "network crash",
    });
    expect(qs).toContain("status=OPEN");
    expect(qs).toContain("priority=P1");
    expect(qs).toContain("search=network+crash");
  });

  it("omits whitespace-only search and category", () => {
    const qs = buildQueryString({
      search: "   ",
      category: "",
      page: 1,
    });
    expect(qs).toBe("?page=1");
  });

  it("serializes sorting parameters", () => {
    const qs = buildQueryString({
      sortBy: "priority",
      sortOrder: "asc",
    });
    expect(qs).toBe("?sortBy=priority&sortOrder=asc");
  });
});

describe("Ticket API Functions", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem("supportdesk_access_token", "mock-valid-token");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("listTickets calls GET /api/v1/tickets and unboxes data and pagination", async () => {
    const mockTickets: Ticket[] = [
      {
        id: "00000002-0000-0000-0000-000000000002",
        title: "Test Ticket 1",
        description: "Test Description 1",
        status: "OPEN",
        priority: "P3",
        category: "Billing",
        createdById: "user-1",
        assigneeId: null,
        slaDueAt: null,
        createdAt: "2026-11-12T00:00:00.000Z",
        updatedAt: "2026-11-12T00:00:00.000Z",
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        data: mockTickets,
        error: null,
        meta: {
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        },
      }),
    } as unknown as Response);

    const result = await listTickets({ status: "OPEN" });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/tickets?status=OPEN"),
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
    expect(result.tickets).toHaveLength(1);
    expect(result.tickets[0].title).toBe("Test Ticket 1");
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.page).toBe(1);
  });

  it("getTicketById calls GET /api/v1/tickets/:id with Bearer token", async () => {
    const mockTicket: Ticket = {
      id: "ticket-123",
      title: "Specific Ticket",
      description: "Detailed description",
      status: "IN_PROGRESS",
      priority: "P2",
      category: null,
      createdById: "user-1",
      assigneeId: "agent-1",
      slaDueAt: null,
      createdAt: "2026-11-12T00:00:00.000Z",
      updatedAt: "2026-11-12T00:00:00.000Z",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        data: mockTicket,
        error: null,
        meta: {},
      }),
    } as unknown as Response);

    const ticket = await getTicketById("ticket-123");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5001/api/v1/tickets/ticket-123",
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
    expect(ticket.id).toBe("ticket-123");
    expect(ticket.status).toBe("IN_PROGRESS");
  });

  it("createTicket calls POST /api/v1/tickets with payload", async () => {
    const mockInput = {
      title: "New Issue",
      description: "Cannot access VPN server",
      priority: "P1" as const,
    };

    const mockCreatedTicket: Ticket = {
      id: "new-ticket-uuid",
      ...mockInput,
      category: null,
      status: "OPEN",
      createdById: "user-1",
      assigneeId: null,
      slaDueAt: null,
      createdAt: "2026-11-12T00:00:00.000Z",
      updatedAt: "2026-11-12T00:00:00.000Z",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        data: mockCreatedTicket,
        error: null,
        meta: {},
      }),
    } as unknown as Response);

    const ticket = await createTicket(mockInput);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5001/api/v1/tickets",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(mockInput),
      })
    );
    expect(ticket.id).toBe("new-ticket-uuid");
    expect(ticket.priority).toBe("P1");
  });

  it("updateTicket calls PATCH /api/v1/tickets/:id with payload", async () => {
    const mockUpdate = {
      status: "RESOLVED" as const,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        data: { id: "ticket-123", status: "RESOLVED" },
        error: null,
        meta: {},
      }),
    } as unknown as Response);

    const updated = await updateTicket("ticket-123", mockUpdate);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5001/api/v1/tickets/ticket-123",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(mockUpdate),
      })
    );
    expect(updated.status).toBe("RESOLVED");
  });

  it("listComments calls GET /api/v1/tickets/:ticketId/comments", async () => {
    const mockComments: Comment[] = [
      {
        id: "comment-1",
        ticketId: "ticket-123",
        authorId: "user-1",
        body: "First comment",
        isInternal: false,
        createdAt: "2026-11-12T00:00:00.000Z",
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        data: mockComments,
        error: null,
        meta: {},
      }),
    } as unknown as Response);

    const comments = await listComments("ticket-123");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5001/api/v1/tickets/ticket-123/comments",
      expect.any(Object)
    );
    expect(comments).toHaveLength(1);
    expect(comments[0].body).toBe("First comment");
  });

  it("createComment calls POST /api/v1/tickets/:ticketId/comments", async () => {
    const mockInput = {
      body: "Resolving this ticket now.",
      isInternal: true,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        data: { id: "comment-2", ...mockInput, ticketId: "ticket-123", authorId: "agent-1", createdAt: "2026-11-12T00:00:00.000Z" },
        error: null,
        meta: {},
      }),
    } as unknown as Response);

    const created = await createComment("ticket-123", mockInput);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5001/api/v1/tickets/ticket-123/comments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(mockInput),
      })
    );
    expect(created.body).toBe("Resolving this ticket now.");
    expect(created.isInternal).toBe(true);
  });

  it("propagates backend errors as ApiError instances with code and status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "Ticket not found",
        },
        meta: {},
      }),
    } as unknown as Response);

    await expect(getTicketById("non-existent-uuid")).rejects.toThrow(ApiError);

    try {
      await getTicketById("non-existent-uuid");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.code).toBe("NOT_FOUND");
      expect(apiErr.message).toBe("Ticket not found");
    }
  });

  it("propagates 403 Forbidden when customer violates role permissions", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Customers cannot update ticket status or assignee",
        },
        meta: {},
      }),
    } as unknown as Response);

    try {
      await updateTicket("ticket-123", { status: "CLOSED" });
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(403);
      expect(apiErr.code).toBe("FORBIDDEN");
      expect(apiErr.message).toBe("Customers cannot update ticket status or assignee");
    }
  });
});
