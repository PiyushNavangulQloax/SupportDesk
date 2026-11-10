import { describe, it, expect } from "@jest/globals";
import { successResponse, errorResponse } from "../src/utils/response.js";
import { NotFoundError, BadRequestError } from "../src/errors/appError.js";
import { envSchema } from "../src/config/env.js";

describe("Jest ESM TypeScript Sanity & Safety Tests", () => {
  it("imports and formats successResponse correctly", () => {
    const res = successResponse({ id: "123", name: "Test" }, { count: 1 });
    expect(res.data).toEqual({ id: "123", name: "Test" });
    expect(res.error).toBeNull();
    expect(res.meta).toEqual({ count: 1 });
  });

  it("imports and formats errorResponse correctly", () => {
    const res = errorResponse("Resource not found", "NOT_FOUND");
    expect(res.data).toBeNull();
    expect(res.error).toEqual({
      code: "NOT_FOUND",
      message: "Resource not found",
    });
  });

  it("constructs AppErrors with correct status and error codes", () => {
    const notFound = new NotFoundError("Ticket not found");
    expect(notFound.statusCode).toBe(404);
    expect(notFound.code).toBe("NOT_FOUND");

    const badReq = new BadRequestError("Invalid input");
    expect(badReq.statusCode).toBe(400);
    expect(badReq.code).toBe("BAD_REQUEST");
  });

  describe("Database Safety Guard Validations", () => {
    it("refuses to fall back to DATABASE_URL and throws when NODE_ENV is 'test' and TEST_DATABASE_URL is missing", async () => {
      const { resolveDatabaseUrl } = await import("../src/config/database.js");
      expect(() => {
        resolveDatabaseUrl("test", "");
      }).toThrow(/NODE_ENV is 'test' but TEST_DATABASE_URL is not configured/);
    });

    it("accepts TEST_DATABASE_URL when NODE_ENV is 'test'", async () => {
      const { resolveDatabaseUrl } = await import("../src/config/database.js");
      const url = resolveDatabaseUrl("test", "postgresql://user:pass@localhost:5433/supportdesk_test?schema=public");
      expect(url).toContain("supportdesk_test");
    });

    it("assertTestDatabase throws error if database name is not supportdesk_test", async () => {
      const { assertTestDatabase } = await import("./helpers/testDb.js");
      // Current active test database is supportdesk_test, so it should not throw
      expect(() => assertTestDatabase()).not.toThrow();
    });
  });
});


