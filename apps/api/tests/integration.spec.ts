import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma, disconnectDatabase } from "../src/config/database.js";
import { UserRole, TicketStatus, TicketPriority } from "../src/generated/prisma/enums.js";
import {
  assertTestDatabase,
  cleanTestDatabase,
  createTestUser,
  createTestTicket,
  createTestComment,
  createAuthHeaders,
} from "./helpers/testDb.js";

describe("SupportDesk Day 11 — Supertest HTTP Integration Tests (Real PostgreSQL)", () => {
  // Test users
  let customerA: { id: string; email: string; role: UserRole };
  let customerB: { id: string; email: string; role: UserRole };
  let agentUser: { id: string; email: string; role: UserRole };
  let adminUser: { id: string; email: string; role: UserRole };

  // Test tickets
  let ticketCustomerA: { id: string };
  let ticketCustomerB: { id: string };

  beforeAll(async () => {
    assertTestDatabase();
    await cleanTestDatabase();

    // Create test users
    customerA = await createTestUser({
      name: "Customer Alpha",
      email: "alpha@example.com",
      role: UserRole.CUSTOMER,
    });

    customerB = await createTestUser({
      name: "Customer Beta",
      email: "beta@example.com",
      role: UserRole.CUSTOMER,
    });

    agentUser = await createTestUser({
      name: "Support Agent",
      email: "agent@supportdesk.internal",
      role: UserRole.AGENT,
    });

    adminUser = await createTestUser({
      name: "Desk Admin",
      email: "admin@supportdesk.internal",
      role: UserRole.ADMIN,
    });

    // Create seed tickets for querying and customer isolation
    ticketCustomerA = await createTestTicket({
      title: "Printer connectivity issue in Office 101",
      description: "Network printer HP-4000 refuses to print documents due to spooler crash",
      status: TicketStatus.OPEN,
      priority: TicketPriority.P1,
      category: "Hardware",
      createdById: customerA.id,
      assigneeId: agentUser.id,
    });

    ticketCustomerB = await createTestTicket({
      title: "VPN connection timeout during remote work",
      description: "Cannot connect to company VPN gateway from home network",
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.P2,
      category: "Network",
      createdById: customerB.id,
      assigneeId: agentUser.id,
    });

    // Create additional tickets for customerA to verify pagination & sorting
    await createTestTicket({
      title: "Monitor flickering on display port",
      description: "Dell 27 inch monitor flickers randomly throughout the workday",
      status: TicketStatus.CLOSED,
      priority: TicketPriority.P3,
      category: "Hardware",
      createdById: customerA.id,
    });

    await createTestTicket({
      title: "Email buffer overflow error in client",
      description: "Mail client freezes when downloading attachments larger than 20MB",
      status: TicketStatus.RESOLVED,
      priority: TicketPriority.P4,
      category: "Software",
      createdById: customerA.id,
    });
  });

  afterAll(async () => {
    try {
      await cleanTestDatabase();
      await disconnectDatabase();
    } catch {
      // Disconnected
    }
  });

  // ==========================================================================
  // 1. Authentication & Security Integration
  // ==========================================================================
  describe("1. Authentication & Security Middleware Integration", () => {
    it("rejects unauthenticated requests to protected ticket routes with 401 UNAUTHORIZED", async () => {
      const res = await request(app).get("/api/v1/tickets");
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(res.body.data).toBeNull();
    });

    it("rejects malformed or invalid Bearer tokens with 401 UNAUTHORIZED", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("Authorization", "Bearer invalid.jwt.token.here");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("accepts valid CUSTOMER Bearer token and authenticates request", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set(createAuthHeaders(customerA));
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.error).toBeNull();
    });

    it("accepts valid AGENT Bearer token and authenticates request", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set(createAuthHeaders(agentUser));
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it("accepts valid ADMIN Bearer token and authenticates request", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set(createAuthHeaders(adminUser));
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  // ==========================================================================
  // 2. Ticket Querying Integration (Real Database)
  // ==========================================================================
  describe("2. Ticket Querying Integration (Pagination, Filtering, Search, Sorting)", () => {
    it("returns paginated results with proper metadata structure", async () => {
      const res = await request(app)
        .get("/api/v1/tickets?page=1&limit=2")
        .set(createAuthHeaders(adminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 4,
        totalPages: 2,
      });
    });

    it("filters tickets by status accurately", async () => {
      const res = await request(app)
        .get("/api/v1/tickets?status=OPEN")
        .set(createAuthHeaders(adminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe("OPEN");
      expect(res.body.data[0].title).toContain("Printer connectivity issue");
    });

    it("filters tickets by priority accurately", async () => {
      const res = await request(app)
        .get("/api/v1/tickets?priority=P1")
        .set(createAuthHeaders(adminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].priority).toBe("P1");
    });

    it("filters tickets by assigneeId accurately", async () => {
      const res = await request(app)
        .get(`/api/v1/tickets?assigneeId=${agentUser.id}`)
        .set(createAuthHeaders(adminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      res.body.data.forEach((ticket: { assigneeId: string }) => {
        expect(ticket.assigneeId).toBe(agentUser.id);
      });
    });

    it("searches across ticket title (case-insensitive substring)", async () => {
      const res = await request(app)
        .get("/api/v1/tickets?search=printer")
        .set(createAuthHeaders(adminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toContain("Printer connectivity issue");
    });

    it("searches across ticket description (case-insensitive substring)", async () => {
      const res = await request(app)
        .get("/api/v1/tickets?search=overflow")
        .set(createAuthHeaders(adminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe("Email buffer overflow error in client");
    });

    it("sorts tickets by allowlisted fields in ascending and descending order", async () => {
      const descRes = await request(app)
        .get("/api/v1/tickets?sortBy=createdAt&sortOrder=desc")
        .set(createAuthHeaders(adminUser));
      expect(descRes.status).toBe(200);

      const ascRes = await request(app)
        .get("/api/v1/tickets?sortBy=createdAt&sortOrder=asc")
        .set(createAuthHeaders(adminUser));
      expect(ascRes.status).toBe(200);

      const firstDescId = descRes.body.data[0].id;
      const lastAscId = ascRes.body.data[ascRes.body.data.length - 1].id;
      expect(firstDescId).toBe(lastAscId);
    });

    it("rejects invalid query parameters with 400 VALIDATION_ERROR", async () => {
      const invalidPage = await request(app)
        .get("/api/v1/tickets?page=-1")
        .set(createAuthHeaders(adminUser));
      expect(invalidPage.status).toBe(400);
      expect(invalidPage.body.error.code).toBe("VALIDATION_ERROR");

      const invalidLimit = await request(app)
        .get("/api/v1/tickets?limit=500")
        .set(createAuthHeaders(adminUser));
      expect(invalidLimit.status).toBe(400);
      expect(invalidLimit.body.error.code).toBe("VALIDATION_ERROR");

      const invalidSort = await request(app)
        .get("/api/v1/tickets?sortBy=passwordHash")
        .set(createAuthHeaders(adminUser));
      expect(invalidSort.status).toBe(400);
      expect(invalidSort.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ==========================================================================
  // 3. Customer Isolation & RBAC Integration
  // ==========================================================================
  describe("3. Customer Isolation & RBAC Integration", () => {
    it("restricts CUSTOMER to listing only their own tickets", async () => {
      const resA = await request(app)
        .get("/api/v1/tickets")
        .set(createAuthHeaders(customerA));

      expect(resA.status).toBe(200);
      expect(resA.body.data.length).toBe(3); // Customer A owns 3 tickets
      resA.body.data.forEach((ticket: { createdById: string }) => {
        expect(ticket.createdById).toBe(customerA.id);
      });

      const resB = await request(app)
        .get("/api/v1/tickets")
        .set(createAuthHeaders(customerB));

      expect(resB.status).toBe(200);
      expect(resB.body.data.length).toBe(1); // Customer B owns 1 ticket
      expect(resB.body.data[0].createdById).toBe(customerB.id);
    });

    it("returns 404 NOT_FOUND when CUSTOMER tries to fetch another customer's ticket by ID", async () => {
      // Customer A tries to access Customer B's ticket
      const res = await request(app)
        .get(`/api/v1/tickets/${ticketCustomerB.id}`)
        .set(createAuthHeaders(customerA));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("prevents CUSTOMER from leaking another customer's tickets via search filters", async () => {
      // Customer A searches for "VPN", which is in Customer B's ticket description
      const res = await request(app)
        .get("/api/v1/tickets?search=VPN")
        .set(createAuthHeaders(customerA));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
      expect(res.body.meta.pagination.total).toBe(0);
    });

    it("ensures AGENT and ADMIN can view all tickets across customers", async () => {
      const agentRes = await request(app)
        .get("/api/v1/tickets")
        .set(createAuthHeaders(agentUser));

      expect(agentRes.status).toBe(200);
      expect(agentRes.body.data.length).toBe(4); // All tickets visible

      const adminRes = await request(app)
        .get("/api/v1/tickets")
        .set(createAuthHeaders(adminUser));

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.length).toBe(4);
    });
  });

  // ==========================================================================
  // 4. Comments API Integration
  // ==========================================================================
  describe("4. Comments API Integration (Create, List, Permissions & Visibility)", () => {
    let publicCommentAId: string;
    let internalCommentAgentId: string;

    it("allows CUSTOMER to create a public comment on their own ticket (201 Created)", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${ticketCustomerA.id}/comments`)
        .set(createAuthHeaders(customerA))
        .send({
          body: "Please help, we need to print invoices urgently!",
          isInternal: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.body).toBe("Please help, we need to print invoices urgently!");
      expect(res.body.data.isInternal).toBe(false);
      expect(res.body.data.authorId).toBe(customerA.id);
      expect(res.body.data.ticketId).toBe(ticketCustomerA.id);
      publicCommentAId = res.body.data.id;
    });

    it("rejects CUSTOMER attempt to create an internal comment with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${ticketCustomerA.id}/comments`)
        .set(createAuthHeaders(customerA))
        .send({
          body: "Attempting to create an internal comment as customer",
          isInternal: true,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
      expect(res.body.error.message).toContain("Customers are not permitted to create internal comments");
    });

    it("rejects CUSTOMER attempt to comment on another customer's ticket with 404 NOT_FOUND", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${ticketCustomerB.id}/comments`)
        .set(createAuthHeaders(customerA))
        .send({
          body: "Unauthorized comment on someone else's ticket",
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("allows AGENT to create an internal comment (201 Created)", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${ticketCustomerA.id}/comments`)
        .set(createAuthHeaders(agentUser))
        .send({
          body: "Internal Note: Investigating printer driver spooler logs on server DC01",
          isInternal: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isInternal).toBe(true);
      expect(res.body.data.authorId).toBe(agentUser.id);
      internalCommentAgentId = res.body.data.id;
    });

    it("ensures CUSTOMER lists only public comments and NEVER sees internal comments", async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${ticketCustomerA.id}/comments`)
        .set(createAuthHeaders(customerA));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(publicCommentAId);
      expect(res.body.data[0].isInternal).toBe(false);

      // Verify internal comment is completely absent
      const hasInternal = res.body.data.some(
        (c: { id: string; isInternal: boolean }) => c.id === internalCommentAgentId || c.isInternal === true
      );
      expect(hasInternal).toBe(false);
    });

    it("allows AGENT to view BOTH public and internal comments", async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${ticketCustomerA.id}/comments`)
        .set(createAuthHeaders(agentUser));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);

      const internalFound = res.body.data.find(
        (c: { id: string }) => c.id === internalCommentAgentId
      );
      expect(internalFound).toBeDefined();
      expect(internalFound.isInternal).toBe(true);
    });

    it("allows ADMIN to view BOTH public and internal comments", async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${ticketCustomerA.id}/comments`)
        .set(createAuthHeaders(adminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it("rejects CUSTOMER listing comments on another customer's ticket with 404 NOT_FOUND", async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${ticketCustomerB.id}/comments`)
        .set(createAuthHeaders(customerA));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("rejects empty comment body with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${ticketCustomerA.id}/comments`)
        .set(createAuthHeaders(customerA))
        .send({
          body: "   ",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects comments for non-existent ticket with 404 NOT_FOUND", async () => {
      const res = await request(app)
        .get("/api/v1/tickets/00000000-0000-0000-0000-000000000000/comments")
        .set(createAuthHeaders(adminUser));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  // ==========================================================================
  // 5. Documentation Endpoints Integration
  // ==========================================================================
  describe("5. OpenAPI & Swagger Documentation Endpoints", () => {
    it("serves Swagger UI at /docs", async () => {
      const res = await request(app).get("/docs/");
      expect([200, 301]).toContain(res.status);
    });

    it("serves valid OpenAPI 3.0.3 specification JSON at /docs/openapi.json", async () => {
      const res = await request(app).get("/docs/openapi.json");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(res.body.openapi).toBe("3.0.3");
      expect(res.body.info.title).toBe("SupportDesk API");
      expect(res.body.paths["/api/v1/tickets"]).toBeDefined();
      expect(res.body.paths["/api/v1/tickets/{ticketId}/comments"]).toBeDefined();
    });
  });
});
