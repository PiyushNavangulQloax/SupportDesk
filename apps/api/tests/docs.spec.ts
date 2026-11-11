import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app.js";
import { openapiSpecification } from "../src/docs/openapi.js";

describe("Stage 4 — OpenAPI & Swagger Documentation Tests (Jest)", () => {
  // =========================================================================
  // HTTP Endpoints Verification
  // =========================================================================
  describe("Documentation HTTP Endpoints", () => {
    it("GET /docs returns HTTP redirect (301) to /docs/ or 200 HTML", async () => {
      const res = await request(app).get("/docs");
      // swagger-ui-express issues a 301 redirect to /docs/ when accessing /docs without trailing slash
      expect([200, 301, 302]).toContain(res.status);
    });

    it("GET /docs/ returns 200 with HTML content", async () => {
      const res = await request(app).get("/docs/");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/html");
      expect(res.text).toContain("swagger-ui");
    });

    it("GET /docs/openapi.json returns HTTP 200 with valid JSON specification", async () => {
      const res = await request(app).get("/docs/openapi.json");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(res.body.openapi).toBe("3.0.3");
      expect(res.body.info.title).toBe("SupportDesk API");
    });

    it("ensures /docs does not require authentication", async () => {
      const res = await request(app).get("/docs/");
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  // =========================================================================
  // Specification Content & Schema Verification
  // =========================================================================
  describe("OpenAPI Specification Structure", () => {
    it("configures HTTP Bearer JWT authentication scheme", () => {
      const securitySchemes = openapiSpecification.components.securitySchemes;
      expect(securitySchemes).toHaveProperty("bearerAuth");
      expect(securitySchemes.bearerAuth).toEqual({
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: expect.stringContaining("Bearer"),
      });
    });

    it("contains all registered Ticket endpoints", () => {
      const paths = openapiSpecification.paths;

      // GET & POST /api/v1/tickets
      expect(paths).toHaveProperty("/api/v1/tickets");
      expect(paths["/api/v1/tickets"]).toHaveProperty("get");
      expect(paths["/api/v1/tickets"]).toHaveProperty("post");

      // GET, PATCH, DELETE /api/v1/tickets/{id}
      expect(paths).toHaveProperty("/api/v1/tickets/{id}");
      expect(paths["/api/v1/tickets/{id}"]).toHaveProperty("get");
      expect(paths["/api/v1/tickets/{id}"]).toHaveProperty("patch");
      expect(paths["/api/v1/tickets/{id}"]).toHaveProperty("delete");
    });

    it("contains all registered Comment endpoints", () => {
      const paths = openapiSpecification.paths;

      // GET & POST /api/v1/tickets/{ticketId}/comments
      expect(paths).toHaveProperty("/api/v1/tickets/{ticketId}/comments");
      expect(paths["/api/v1/tickets/{ticketId}/comments"]).toHaveProperty("get");
      expect(paths["/api/v1/tickets/{ticketId}/comments"]).toHaveProperty("post");
    });

    it("contains registered Auth and Health endpoints", () => {
      const paths = openapiSpecification.paths;
      expect(paths).toHaveProperty("/health");
      expect(paths).toHaveProperty("/api/v1/auth/register");
      expect(paths).toHaveProperty("/api/v1/auth/login");
    });

    it("accurately documents all ticket query parameters in GET /api/v1/tickets", () => {
      const getTickets = openapiSpecification.paths["/api/v1/tickets"].get;
      const paramNames = getTickets.parameters.map((p: any) => p.name);

      expect(paramNames).toContain("page");
      expect(paramNames).toContain("limit");
      expect(paramNames).toContain("status");
      expect(paramNames).toContain("priority");
      expect(paramNames).toContain("category");
      expect(paramNames).toContain("assigneeId");
      expect(paramNames).toContain("search");
      expect(paramNames).toContain("sortBy");
      expect(paramNames).toContain("sortOrder");
    });

    it("documents allowlisted sortBy enum matching Zod schema", () => {
      const getTickets = openapiSpecification.paths["/api/v1/tickets"].get;
      const sortByParam = getTickets.parameters.find((p: any) => p.name === "sortBy");
      expect(sortByParam).toBeDefined();
      expect(sortByParam?.schema?.enum).toEqual([
        "createdAt",
        "updatedAt",
        "priority",
        "status",
        "title",
      ]);
    });

    it("preserves uniform { data, error, meta } response envelope in schemas", () => {
      const schemas = openapiSpecification.components.schemas;

      const envelopeSchemas = [
        schemas.ErrorEnvelope,
        schemas.HealthResponse,
        schemas.AuthResponse,
        schemas.TicketSingleResponse,
        schemas.TicketListResponse,
        schemas.CommentSingleResponse,
        schemas.CommentListResponse,
      ];

      for (const schema of envelopeSchemas) {
        expect(schema.properties).toHaveProperty("data");
        expect(schema.properties).toHaveProperty("error");
        expect(schema.properties).toHaveProperty("meta");
        expect(schema.required).toEqual(
          expect.arrayContaining(["data", "error", "meta"])
        );
      }
    });
  });
});

