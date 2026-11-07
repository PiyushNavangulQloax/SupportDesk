import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma, disconnectDatabase } from "../src/config/database.js";
import { ticketsService } from "../src/services/tickets.service.js";
import { envSchema } from "../src/config/env.js";

describe("SupportDesk Day 9 — API Skeleton & MVC Architecture Tests", () => {
  let sampleTicketId: string;
  let sampleUserId: string;
  let createdTestTicketId: string | null = null;

  before(async () => {
    // Find an existing user and ticket to use as test baselines without mutating seed records
    const existingTicket = await prisma.ticket.findFirst({
      select: { id: true, createdById: true },
    });
    if (existingTicket) {
      sampleTicketId = existingTicket.id;
      sampleUserId = existingTicket.createdById;
    }
  });

  after(async () => {
    // Clean up created test ticket if still present to preserve 50 seed tickets
    if (createdTestTicketId) {
      await prisma.ticket.deleteMany({
        where: { id: createdTestTicketId },
      });
    }
    // Safely disconnect database using encapsulated helper
    await disconnectDatabase();
  });

  describe("1. GET /health", () => {
    it("returns 200 with status ok and standard response envelope", async () => {
      const res = await request(app).get("/health");

      assert.equal(res.status, 200);
      assert.equal(res.body.error, null);
      assert.ok(res.body.meta);
      assert.equal(typeof res.body.meta, "object");
      assert.equal(res.body.data.status, "ok");
      assert.ok(typeof res.body.data.uptime === "number");
      assert.ok(res.body.data.timestamp);
      // Ensure no secrets or DATABASE_URL are leaked
      assert.equal(JSON.stringify(res.body).includes("postgresql://"), false);
      assert.equal(JSON.stringify(res.body).includes("password"), false);
    });
  });

  describe("2. GET /api/v1/tickets (List & Filtering)", () => {
    it("returns 200 with paginated ticket list and meta", async () => {
      const res = await request(app).get("/api/v1/tickets?page=1&limit=5");

      assert.equal(res.status, 200);
      assert.equal(res.body.error, null);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 5);
      assert.ok(res.body.meta.pagination);
      assert.equal(res.body.meta.pagination.page, 1);
      assert.equal(res.body.meta.pagination.limit, 5);
      assert.ok(res.body.meta.pagination.total >= 50);
    });

    it("filters tickets by status", async () => {
      const res = await request(app).get("/api/v1/tickets?status=OPEN&limit=10");

      assert.equal(res.status, 200);
      assert.equal(res.body.error, null);
      assert.ok(Array.isArray(res.body.data));
      for (const t of res.body.data) {
        assert.equal(t.status, "OPEN");
      }
    });

    it("filters tickets by priority", async () => {
      const res = await request(app).get("/api/v1/tickets?priority=P1&limit=10");

      assert.equal(res.status, 200);
      assert.equal(res.body.error, null);
      assert.ok(Array.isArray(res.body.data));
      for (const t of res.body.data) {
        assert.equal(t.priority, "P1");
      }
    });
  });

  describe("3. Pagination Parameter Validation", () => {
    it("rejects negative page parameter with 400 VALIDATION_ERROR", async () => {
      const res = await request(app).get("/api/v1/tickets?page=-1");

      assert.equal(res.status, 400);
      assert.equal(res.body.data, null);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
      assert.ok(Array.isArray(res.body.error.details));
      assert.equal(res.body.error.details[0].path, "page");
    });

    it("rejects non-numeric page parameter with 400 VALIDATION_ERROR", async () => {
      const res = await request(app).get("/api/v1/tickets?page=abc");

      assert.equal(res.status, 400);
      assert.equal(res.body.data, null);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
      assert.equal(res.body.error.details[0].path, "page");
    });

    it("rejects limit exceeding maximum 100 with 400 VALIDATION_ERROR", async () => {
      const res = await request(app).get("/api/v1/tickets?limit=500");

      assert.equal(res.status, 400);
      assert.equal(res.body.data, null);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
      assert.equal(res.body.error.details[0].path, "limit");
    });
  });

  describe("4. Query Enum Filter Validation", () => {
    it("rejects invalid status filter with 400 VALIDATION_ERROR", async () => {
      const res = await request(app).get("/api/v1/tickets?status=INVALID_STATUS");

      assert.equal(res.status, 400);
      assert.equal(res.body.data, null);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
      assert.equal(res.body.error.details[0].path, "status");
    });

    it("rejects invalid priority filter with 400 VALIDATION_ERROR", async () => {
      const res = await request(app).get("/api/v1/tickets?priority=P9");

      assert.equal(res.status, 400);
      assert.equal(res.body.data, null);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
      assert.equal(res.body.error.details[0].path, "priority");
    });
  });

  describe("5. GET /api/v1/tickets/:id (Fetch existing ticket)", () => {
    it("returns 200 with ticket detail and relations", async () => {
      const res = await request(app).get(`/api/v1/tickets/${sampleTicketId}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.error, null);
      assert.equal(res.body.data.id, sampleTicketId);
      assert.ok(res.body.data.title);
      assert.ok(res.body.data.description);
      assert.ok(res.body.data.status);
      assert.ok(res.body.data.priority);
      assert.ok(res.body.data.createdBy);
    });
  });

  describe("6. GET /api/v1/tickets/:id (Fetch nonexistent ticket)", () => {
    it("returns 404 with NOT_FOUND error code", async () => {
      const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
      const res = await request(app).get(`/api/v1/tickets/${nonExistentUuid}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.data, null);
      assert.ok(res.body.error);
      assert.equal(res.body.error.code, "NOT_FOUND");
      assert.equal(res.body.error.message, "Ticket not found");
    });
  });

  describe("7. GET /api/v1/tickets/:id (Invalid UUID format)", () => {
    it("returns 400 with VALIDATION_ERROR", async () => {
      const res = await request(app).get("/api/v1/tickets/not-a-valid-uuid");

      assert.equal(res.status, 400);
      assert.equal(res.body.data, null);
      assert.ok(res.body.error);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
      assert.equal(res.body.error.message, "Invalid request data");
      assert.ok(Array.isArray(res.body.error.details));
      assert.equal(res.body.error.details[0].path, "id");
    });
  });

  describe("8. POST /api/v1/tickets (Create valid ticket)", () => {
    it("returns 201 with newly created ticket", async () => {
      const newTicketPayload = {
        title: "Test Support Ticket For Day 9",
        description: "This is a detailed test description for Day 9 verification",
        priority: "P2",
        category: "API Test",
        createdById: sampleUserId,
      };

      const res = await request(app)
        .post("/api/v1/tickets")
        .send(newTicketPayload);

      assert.equal(res.status, 201);
      assert.equal(res.body.error, null);
      assert.ok(res.body.data.id);
      assert.equal(res.body.data.title, newTicketPayload.title);
      assert.equal(res.body.data.priority, "P2");
      assert.equal(res.body.data.category, "API Test");

      createdTestTicketId = res.body.data.id;
    });
  });

  describe("9. POST /api/v1/tickets (Create invalid ticket)", () => {
    it("returns 400 when fields fail validation constraints", async () => {
      const invalidPayload = {
        title: "ab", // Too short (min 3)
        description: "123", // Too short (min 5)
        priority: "INVALID_PRIORITY",
      };

      const res = await request(app)
        .post("/api/v1/tickets")
        .send(invalidPayload);

      assert.equal(res.status, 400);
      assert.equal(res.body.data, null);
      assert.ok(res.body.error);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
      assert.ok(Array.isArray(res.body.error.details));
    });
  });

  describe("10. PATCH /api/v1/tickets/:id (Update existing ticket)", () => {
    it("returns 200 with updated fields", async () => {
      assert.ok(createdTestTicketId, "Test ticket must exist to update");

      const updatePayload = {
        title: "Updated Ticket Title for Day 9",
        status: "IN_PROGRESS",
      };

      const res = await request(app)
        .patch(`/api/v1/tickets/${createdTestTicketId}`)
        .send(updatePayload);

      assert.equal(res.status, 200);
      assert.equal(res.body.error, null);
      assert.equal(res.body.data.id, createdTestTicketId);
      assert.equal(res.body.data.title, updatePayload.title);
      assert.equal(res.body.data.status, "IN_PROGRESS");
    });
  });

  describe("11. PATCH /api/v1/tickets/:id (Update nonexistent ticket)", () => {
    it("returns 404 when updating non-existent UUID", async () => {
      const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .patch(`/api/v1/tickets/${nonExistentUuid}`)
        .send({ title: "Cannot update" });

      assert.equal(res.status, 404);
      assert.equal(res.body.data, null);
      assert.equal(res.body.error.code, "NOT_FOUND");
    });
  });

  describe("12. Standard Response Envelope Contract", () => {
    it("enforces { data, error, meta } on success", async () => {
      const res = await request(app).get("/health");
      assert.ok("data" in res.body);
      assert.ok("error" in res.body);
      assert.ok("meta" in res.body);
      assert.equal(res.body.error, null);
    });

    it("enforces { data: null, error: { code, message }, meta } on 404 error", async () => {
      const res = await request(app).get("/api/v1/tickets/00000000-0000-0000-0000-000000000000");
      assert.ok("data" in res.body);
      assert.ok("error" in res.body);
      assert.ok("meta" in res.body);
      assert.equal(res.body.data, null);
      assert.ok(res.body.error.code);
      assert.ok(res.body.error.message);
    });
  });

  describe("13. Safe Error Handling", () => {
    it("returns 400 for malformed JSON request body", async () => {
      const res = await request(app)
        .post("/api/v1/tickets")
        .set("Content-Type", "application/json")
        .send('{"invalid_json:');

      assert.equal(res.status, 400);
      assert.equal(res.body.data, null);
      assert.equal(res.body.error.code, "BAD_REQUEST");
    });

    it("returns 404 with standard envelope for unmapped endpoint", async () => {
      const res = await request(app).get("/unmapped-endpoint-path");

      assert.equal(res.status, 404);
      assert.equal(res.body.data, null);
      assert.equal(res.body.error.code, "NOT_FOUND");
      assert.ok(res.body.error.message.includes("Endpoint not found"));
    });

    it("safely handles unexpected 500 error without exposing stack or raw details", async () => {
      // Controlled stubbing of service method to simulate unhandled exception
      const originalListTickets = ticketsService.listTickets;
      try {
        ticketsService.listTickets = async () => {
          throw new Error("Simulated internal database crash or unhandled runtime failure");
        };

        const res = await request(app).get("/api/v1/tickets");

        assert.equal(res.status, 500);
        assert.equal(res.body.data, null);
        assert.ok(res.body.error);
        assert.equal(res.body.error.code, "INTERNAL_SERVER_ERROR");
        assert.equal(res.body.error.message, "Internal server error");
        assert.ok(res.body.meta);
        // Ensure sensitive internal message and stack trace are NEVER exposed to client
        const serialized = JSON.stringify(res.body);
        assert.equal(serialized.includes("Simulated"), false);
        assert.equal(serialized.includes("crash"), false);
        assert.equal(serialized.includes("stack"), false);
      } finally {
        ticketsService.listTickets = originalListTickets;
      }
    });
  });

  describe("14. Environment Configuration Validation (Unit)", () => {
    it("rejects configuration when DATABASE_URL is missing", () => {
      const result = envSchema.safeParse({
        NODE_ENV: "development",
        PORT: 5000,
      });

      assert.equal(result.success, false);
      if (!result.success) {
        const issues = (result.error as any).issues || (result.error as any).errors || [];
        assert.ok(issues.some((i: any) => i.path.includes("DATABASE_URL")));
      }
    });

    it("rejects configuration when PORT is negative", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        PORT: -1,
      });

      assert.equal(result.success, false);
      if (!result.success) {
        const issues = (result.error as any).issues || (result.error as any).errors || [];
        assert.ok(issues.some((i: any) => i.path.includes("PORT")));
      }
    });

    it("rejects configuration when PORT is non-numeric", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        PORT: "invalid-port",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        const issues = (result.error as any).issues || (result.error as any).errors || [];
        assert.ok(issues.some((i: any) => i.path.includes("PORT")));
      }
    });

    it("successfully parses valid configuration and coerces string port to number", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        PORT: "3000",
        NODE_ENV: "test",
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.PORT, 3000);
        assert.equal(result.data.NODE_ENV, "test");
        assert.equal(result.data.DATABASE_URL, "postgresql://user:pass@localhost:5432/db");
      }
    });
  });
});
