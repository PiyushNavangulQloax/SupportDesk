import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { envSchema } from "../src/config/env.js";
import { UnauthorizedError, ForbiddenError, AppError } from "../src/errors/appError.js";
import { errorHandler } from "../src/middleware/errorHandler.js";

describe("Day 10 — Environment Configuration & Authentication Errors", () => {
  const validDbUrl = "postgresql://user:pass@localhost:5432/db";
  const validJwtSecret = "this_is_a_very_secure_jwt_secret_with_32_chars!";

  describe("Part 1: Environment Configuration (envSchema)", () => {
    it("rejects configuration when JWT_SECRET is missing", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: validDbUrl,
        PORT: 5000,
      });

      assert.equal(result.success, false);
      if (!result.success) {
        const issues = (result.error as any).issues || [];
        assert.ok(issues.some((i: any) => i.path.includes("JWT_SECRET")));
      }
    });

    it("rejects configuration when JWT_SECRET is shorter than 32 characters", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: validDbUrl,
        PORT: 5000,
        JWT_SECRET: "short_secret_under_32_chars",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        const issues = (result.error as any).issues || [];
        const secretIssue = issues.find((i: any) => i.path.includes("JWT_SECRET"));
        assert.ok(secretIssue);
        assert.ok(secretIssue.message.includes("32 characters"));
      }
    });

    it("accepts configuration when JWT_SECRET has 32 or more characters", () => {
      const exact32Secret = "12345678901234567890123456789012";
      const result = envSchema.safeParse({
        DATABASE_URL: validDbUrl,
        PORT: 5000,
        JWT_SECRET: exact32Secret,
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.JWT_SECRET, exact32Secret);
      }
    });

    it("defaults JWT_EXPIRES_IN to '1d' when not provided", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: validDbUrl,
        PORT: 5000,
        JWT_SECRET: validJwtSecret,
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.JWT_EXPIRES_IN, "1d");
      }
    });

    it("accepts custom JWT_EXPIRES_IN value", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: validDbUrl,
        PORT: 5000,
        JWT_SECRET: validJwtSecret,
        JWT_EXPIRES_IN: "7d",
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.JWT_EXPIRES_IN, "7d");
      }
    });

    it("defaults CORS_ORIGIN to approved origin ('http://localhost:5173')", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: validDbUrl,
        PORT: 5000,
        JWT_SECRET: validJwtSecret,
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.CORS_ORIGIN, "http://localhost:5173");
      }
    });

    it("rejects wildcard CORS_ORIGIN ('*') when NODE_ENV is production", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: validDbUrl,
        PORT: 5000,
        NODE_ENV: "production",
        JWT_SECRET: validJwtSecret,
        CORS_ORIGIN: "*",
      });

      assert.equal(result.success, false);
      if (!result.success) {
        const issues = (result.error as any).issues || [];
        const corsIssue = issues.find((i: any) => i.path.includes("CORS_ORIGIN"));
        assert.ok(corsIssue);
        assert.ok(corsIssue.message.includes("Wildcard"));
      }
    });

    it("accepts specific approved CORS_ORIGIN in production mode", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: validDbUrl,
        PORT: 5000,
        NODE_ENV: "production",
        JWT_SECRET: validJwtSecret,
        CORS_ORIGIN: "https://supportdesk.example.com",
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.CORS_ORIGIN, "https://supportdesk.example.com");
      }
    });

    it("preserves existing NODE_ENV, PORT, and DATABASE_URL validation", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: validDbUrl,
        PORT: "4000",
        NODE_ENV: "development",
        JWT_SECRET: validJwtSecret,
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.PORT, 4000);
        assert.equal(result.data.NODE_ENV, "development");
        assert.equal(result.data.DATABASE_URL, validDbUrl);
      }
    });
  });

  describe("Part 2: Authentication Errors (appError.ts)", () => {
    it("UnauthorizedError sets statusCode 401 and code UNAUTHORIZED", () => {
      const err = new UnauthorizedError("Authentication token is missing or invalid");

      assert.equal(err instanceof AppError, true);
      assert.equal(err instanceof UnauthorizedError, true);
      assert.equal(err.statusCode, 401);
      assert.equal(err.code, "UNAUTHORIZED");
      assert.equal(err.message, "Authentication token is missing or invalid");
    });

    it("UnauthorizedError supports optional details payload", () => {
      const err = new UnauthorizedError("Invalid token", { reason: "expired" });

      assert.equal(err.statusCode, 401);
      assert.equal(err.code, "UNAUTHORIZED");
      assert.deepEqual(err.details, { reason: "expired" });
    });

    it("ForbiddenError sets statusCode 403 and code FORBIDDEN", () => {
      const err = new ForbiddenError("Insufficient permissions to access this ticket");

      assert.equal(err instanceof AppError, true);
      assert.equal(err instanceof ForbiddenError, true);
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, "FORBIDDEN");
      assert.equal(err.message, "Insufficient permissions to access this ticket");
    });

    it("ForbiddenError supports optional details payload", () => {
      const err = new ForbiddenError("Role forbidden", { requiredRole: "AGENT" });

      assert.equal(err.statusCode, 403);
      assert.equal(err.code, "FORBIDDEN");
      assert.deepEqual(err.details, { requiredRole: "AGENT" });
    });

    it("central errorHandler formats UnauthorizedError into standard { data: null, error, meta } envelope", () => {
      let capturedStatus: number | null = null;
      let capturedPayload: any = null;

      const mockRes: any = {
        status(code: number) {
          capturedStatus = code;
          return this;
        },
        json(body: any) {
          capturedPayload = body;
          return this;
        },
      };

      const error = new UnauthorizedError("Token has expired", { expiredAt: "2026-11-09T00:00:00Z" });
      errorHandler(error, {} as any, mockRes, (() => {}) as any);

      assert.equal(capturedStatus, 401);
      assert.equal(capturedPayload.data, null);
      assert.ok(capturedPayload.error);
      assert.equal(capturedPayload.error.code, "UNAUTHORIZED");
      assert.equal(capturedPayload.error.message, "Token has expired");
      assert.deepEqual(capturedPayload.error.details, { expiredAt: "2026-11-09T00:00:00Z" });
      assert.ok(capturedPayload.meta);
    });

    it("central errorHandler formats ForbiddenError into standard { data: null, error, meta } envelope", () => {
      let capturedStatus: number | null = null;
      let capturedPayload: any = null;

      const mockRes: any = {
        status(code: number) {
          capturedStatus = code;
          return this;
        },
        json(body: any) {
          capturedPayload = body;
          return this;
        },
      };

      const error = new ForbiddenError("Customer cannot modify ticket assignment");
      errorHandler(error, {} as any, mockRes, (() => {}) as any);

      assert.equal(capturedStatus, 403);
      assert.equal(capturedPayload.data, null);
      assert.ok(capturedPayload.error);
      assert.equal(capturedPayload.error.code, "FORBIDDEN");
      assert.equal(capturedPayload.error.message, "Customer cannot modify ticket assignment");
      assert.ok(capturedPayload.meta);
    });
  });
});

