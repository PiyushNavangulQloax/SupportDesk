import { describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { authenticate, authorize } from "../src/middleware/auth.middleware.js";
import { generateToken, JWT_ALGORITHM } from "../src/utils/jwt.js";
import { UserRole } from "../src/generated/prisma/enums.js";
import { UnauthorizedError, ForbiddenError } from "../src/errors/appError.js";
import { env } from "../src/config/env.js";

describe("Day 10 — Step 6: Authentication & Authorization Middleware Tests", () => {
  describe("authenticate Middleware", () => {
    it("1. Rejects request with missing Authorization header (401)", () => {
      const req: any = { headers: {} };
      let capturedError: any = null;

      authenticate(req, {} as any, (err?: any) => {
        capturedError = err;
      });

      assert.ok(capturedError instanceof UnauthorizedError);
      assert.equal(capturedError.statusCode, 401);
      assert.equal(capturedError.code, "UNAUTHORIZED");
      assert.ok(capturedError.message.includes("missing"));
      assert.equal(req.user, undefined);
    });

    it("2. Rejects request with incorrect authorization scheme (401)", () => {
      const req: any = { headers: { authorization: "Basic dXNlcjpwYXNz" } };
      let capturedError: any = null;

      authenticate(req, {} as any, (err?: any) => {
        capturedError = err;
      });

      assert.ok(capturedError instanceof UnauthorizedError);
      assert.equal(capturedError.statusCode, 401);
      assert.equal(capturedError.code, "UNAUTHORIZED");
      assert.ok(capturedError.message.includes("Bearer"));
    });

    it("3. Rejects request with missing token after Bearer scheme (401)", () => {
      const req: any = { headers: { authorization: "Bearer " } };
      let capturedError: any = null;

      authenticate(req, {} as any, (err?: any) => {
        capturedError = err;
      });

      assert.ok(capturedError instanceof UnauthorizedError);
      assert.equal(capturedError.statusCode, 401);
      assert.equal(capturedError.code, "UNAUTHORIZED");
      assert.ok(capturedError.message.includes("missing"));
    });

    it("4. Rejects request with invalid JWT signature (401)", () => {
      const forgedToken = jwt.sign(
        { userId: "user-123", email: "user@example.com", role: UserRole.CUSTOMER },
        "wrong_signature_key_at_least_32_characters!",
        { algorithm: JWT_ALGORITHM, expiresIn: "1h" }
      );
      const req: any = { headers: { authorization: `Bearer ${forgedToken}` } };
      let capturedError: any = null;

      authenticate(req, {} as any, (err?: any) => {
        capturedError = err;
      });

      assert.ok(capturedError instanceof UnauthorizedError);
      assert.equal(capturedError.statusCode, 401);
      assert.equal(capturedError.code, "UNAUTHORIZED");
      assert.ok(capturedError.message.includes("Invalid"));
    });

    it("5. Rejects request with expired JWT (401)", () => {
      const expiredToken = jwt.sign(
        { userId: "user-123", email: "user@example.com", role: UserRole.CUSTOMER },
        env.JWT_SECRET,
        { algorithm: JWT_ALGORITHM, expiresIn: "-1s" }
      );
      const req: any = { headers: { authorization: `Bearer ${expiredToken}` } };
      let capturedError: any = null;

      authenticate(req, {} as any, (err?: any) => {
        capturedError = err;
      });

      assert.ok(capturedError instanceof UnauthorizedError);
      assert.equal(capturedError.statusCode, 401);
      assert.equal(capturedError.code, "UNAUTHORIZED");
      assert.ok(capturedError.message.includes("expired"));
    });

    it("6. Rejects request with malformed token string (401)", () => {
      const req: any = { headers: { authorization: "Bearer not.a.valid.jwt.string" } };
      let capturedError: any = null;

      authenticate(req, {} as any, (err?: any) => {
        capturedError = err;
      });

      assert.ok(capturedError instanceof UnauthorizedError);
      assert.equal(capturedError.statusCode, 401);
      assert.equal(capturedError.code, "UNAUTHORIZED");
    });

    it("7. Rejects token with invalid role claim not in Prisma UserRole enum (401)", () => {
      const tokenWithInvalidRole = jwt.sign(
        { userId: "user-123", email: "user@example.com", role: "SUPERUSER_INVALID" },
        env.JWT_SECRET,
        { algorithm: JWT_ALGORITHM, expiresIn: "1h" }
      );
      const req: any = { headers: { authorization: `Bearer ${tokenWithInvalidRole}` } };
      let capturedError: any = null;

      authenticate(req, {} as any, (err?: any) => {
        capturedError = err;
      });

      assert.ok(capturedError instanceof UnauthorizedError);
      assert.equal(capturedError.statusCode, 401);
      assert.equal(capturedError.code, "UNAUTHORIZED");
      assert.ok(capturedError.message.includes("role"));
    });

    it("8. Successfully authenticates valid CUSTOMER token and attaches req.user", () => {
      const token = generateToken({
        userId: "customer-uuid-1",
        role: UserRole.CUSTOMER,
        email: "alice@example.com",
      });
      const req: any = { headers: { authorization: `Bearer ${token}` } };
      let nextCalled = false;

      authenticate(req, {} as any, (err?: any) => {
        assert.equal(err, undefined);
        nextCalled = true;
      });

      assert.equal(nextCalled, true);
      assert.ok(req.user);
      assert.equal(req.user.id, "customer-uuid-1");
      assert.equal(req.user.email, "alice@example.com");
      assert.equal(req.user.role, UserRole.CUSTOMER);
    });

    it("9. Successfully authenticates valid AGENT token and attaches req.user", () => {
      const token = generateToken({
        userId: "agent-uuid-2",
        role: UserRole.AGENT,
        email: "priya.kapoor@supportdesk.internal",
      });
      const req: any = { headers: { authorization: `Bearer ${token}` } };
      let nextCalled = false;

      authenticate(req, {} as any, (err?: any) => {
        assert.equal(err, undefined);
        nextCalled = true;
      });

      assert.equal(nextCalled, true);
      assert.ok(req.user);
      assert.equal(req.user.id, "agent-uuid-2");
      assert.equal(req.user.role, UserRole.AGENT);
    });

    it("10. Successfully authenticates valid ADMIN token and attaches req.user", () => {
      const token = generateToken({
        userId: "admin-uuid-3",
        role: UserRole.ADMIN,
        email: "admin@supportdesk.internal",
      });
      const req: any = { headers: { authorization: `Bearer ${token}` } };
      let nextCalled = false;

      authenticate(req, {} as any, (err?: any) => {
        assert.equal(err, undefined);
        nextCalled = true;
      });

      assert.equal(nextCalled, true);
      assert.ok(req.user);
      assert.equal(req.user.id, "admin-uuid-3");
      assert.equal(req.user.role, UserRole.ADMIN);
    });
  });

  describe("authorize Middleware (RBAC)", () => {
    it("11. Role authorization succeeds when user role is in allowedRoles", () => {
      const req: any = {
        user: {
          id: "agent-uuid-1",
          email: "agent@supportdesk.internal",
          role: UserRole.AGENT,
        },
      };
      let nextCalled = false;

      const rbacMiddleware = authorize(UserRole.AGENT, UserRole.ADMIN);
      rbacMiddleware(req, {} as any, (err?: any) => {
        assert.equal(err, undefined);
        nextCalled = true;
      });

      assert.equal(nextCalled, true);
    });

    it("12. Role authorization fails with ForbiddenError (403) when user role is not permitted", () => {
      const req: any = {
        user: {
          id: "customer-uuid-1",
          email: "customer@example.com",
          role: UserRole.CUSTOMER,
        },
      };
      let capturedError: any = null;

      const rbacMiddleware = authorize(UserRole.AGENT, UserRole.ADMIN);
      rbacMiddleware(req, {} as any, (err?: any) => {
        capturedError = err;
      });

      assert.ok(capturedError instanceof ForbiddenError);
      assert.equal(capturedError.statusCode, 403);
      assert.equal(capturedError.code, "FORBIDDEN");
      assert.ok(capturedError.message.includes("CUSTOMER"));
      assert.ok(capturedError.details);
    });

    it("13. Rejects request with UnauthorizedError (401) when req.user is missing", () => {
      const req: any = { user: undefined };
      let capturedError: any = null;

      const rbacMiddleware = authorize(UserRole.CUSTOMER);
      rbacMiddleware(req, {} as any, (err?: any) => {
        capturedError = err;
      });

      assert.ok(capturedError instanceof UnauthorizedError);
      assert.equal(capturedError.statusCode, 401);
      assert.equal(capturedError.code, "UNAUTHORIZED");
      assert.ok(capturedError.message.includes("Authentication required"));
    });
  });
});

