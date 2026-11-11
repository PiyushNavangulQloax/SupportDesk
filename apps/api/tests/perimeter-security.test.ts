import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import helmet from "helmet";
import cors from "cors";
import { env } from "../src/config/env.js";
import { createCorsOptions, getAllowedOrigins } from "../src/config/cors.js";
import { createLoginRateLimiter } from "../src/middleware/rateLimiter.js";
import { verifyToken, generateToken } from "../src/utils/jwt.js";
import { UnauthorizedError } from "../src/errors/appError.js";
import { UserRole } from "../src/generated/prisma/enums.js";
import { AuthService } from "../src/services/auth.service.js";
import { hashPassword } from "../src/utils/password.js";
import type { UsersRepository, UserWithPassword } from "../src/repositories/users.repository.js";

/**
 * In-memory UsersRepository test double
 */
class InMemoryUsersRepository implements UsersRepository {
  private users: UserWithPassword[] = [];

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async findById(id: string): Promise<UserWithPassword | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  async create(data: { email: string; passwordHash: string; role: UserRole; name?: string | null }) {
    const user: UserWithPassword = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      email: data.email,
      name: data.name ?? null,
      role: data.role,
      passwordHash: data.passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(user);
    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
  }
}

describe("Day 10 — Step 8B: Perimeter Security Hardening Tests", () => {
  // =========================================================================
  // 1. Helmet Security Headers
  // =========================================================================
  describe("1. Helmet Security Headers", () => {
    it("sets standard security headers on HTTP responses", async () => {
      const helmetMiddleware = helmet();
      const headers: Record<string, string | string[]> = {};
      const req = { method: "GET", headers: {} } as any;
      const res = {
        setHeader(name: string, value: string | string[]) {
          headers[name.toLowerCase()] = value;
        },
        removeHeader(name: string) {
          delete headers[name.toLowerCase()];
        },
      } as any;

      let nextCalled = false;
      await new Promise<void>((resolve) => {
        helmetMiddleware(req, res, () => {
          nextCalled = true;
          resolve();
        });
      });

      assert.equal(nextCalled, true, "Helmet should call next()");
      assert.equal(headers["x-content-type-options"], "nosniff");
      assert.equal(headers["x-frame-options"], "SAMEORIGIN");
      assert.ok(headers["strict-transport-security"], "Should set Strict-Transport-Security");
      assert.ok(headers["content-security-policy"], "Should set Content-Security-Policy");
      assert.equal(headers["x-dns-prefetch-control"], "off");
      assert.equal(headers["x-download-options"], "noopen");
      assert.equal(headers["x-permitted-cross-domain-policies"], "none");
    });
  });

  // =========================================================================
  // 2. CORS Configuration & Origins
  // =========================================================================
  describe("2. CORS Configuration & Origins", () => {
    it("getAllowedOrigins parses single and multiple comma-separated origins with whitespace trimming", () => {
      const single = getAllowedOrigins("http://localhost:5173");
      assert.deepEqual(single, ["http://localhost:5173"]);

      const multiple = getAllowedOrigins(
        "http://localhost:5173, https://supportdesk.example.com ,  http://localhost:3000 "
      );
      assert.deepEqual(multiple, [
        "http://localhost:5173",
        "https://supportdesk.example.com",
        "http://localhost:3000",
      ]);
    });

    it("allows configured frontend origin and sets Access-Control-Allow-Origin", async () => {
      const corsMiddleware = cors(
        createCorsOptions("http://localhost:5173,https://supportdesk.example.com", "production")
      );
      const headers: Record<string, string> = {};
      const req = {
        method: "GET",
        headers: { origin: "http://localhost:5173" },
      } as any;
      const res = {
        setHeader(name: string, value: string) {
          headers[name.toLowerCase()] = value;
        },
        getHeader(name: string) {
          return headers[name.toLowerCase()];
        },
      } as any;

      await new Promise<void>((resolve) => {
        corsMiddleware(req, res, () => resolve());
      });

      assert.equal(headers["access-control-allow-origin"], "http://localhost:5173");
      assert.equal(headers["vary"], "Origin");
    });

    it("rejects unapproved origin and does not set Access-Control-Allow-Origin", async () => {
      const corsMiddleware = cors(
        createCorsOptions("http://localhost:5173,https://supportdesk.example.com", "production")
      );
      const headers: Record<string, string> = {};
      const req = {
        method: "GET",
        headers: { origin: "http://malicious-site.com" },
      } as any;
      const res = {
        setHeader(name: string, value: string) {
          headers[name.toLowerCase()] = value;
        },
        getHeader(name: string) {
          return headers[name.toLowerCase()];
        },
      } as any;

      await new Promise<void>((resolve) => {
        corsMiddleware(req, res, () => resolve());
      });

      assert.equal(
        headers["access-control-allow-origin"],
        undefined,
        "Disallowed origin must not receive Access-Control-Allow-Origin header"
      );
    });

    it("correctly handles preflight OPTIONS request for approved origin", async () => {
      const corsMiddleware = cors(
        createCorsOptions("http://localhost:5173", "development")
      );
      const headers: Record<string, string> = {};
      let ended = false;
      let statusCode = 200;

      const req = {
        method: "OPTIONS",
        headers: {
          origin: "http://localhost:5173",
          "access-control-request-method": "POST",
          "access-control-request-headers": "authorization,content-type",
        },
      } as any;
      const res = {
        headers,
        statusCode: 200,
        setHeader(name: string, value: string) {
          headers[name.toLowerCase()] = value;
        },
        getHeader(name: string) {
          return headers[name.toLowerCase()];
        },
        end() {
          ended = true;
          statusCode = this.statusCode;
        },
      } as any;

      await new Promise<void>((resolve) => {
        corsMiddleware(req, res, () => resolve());
        if (ended) resolve();
      });

      assert.equal(ended, true, "Preflight OPTIONS must terminate in CORS middleware");
      assert.equal(statusCode, 204, "Preflight OPTIONS response status must be 204 No Content");
      assert.equal(headers["access-control-allow-origin"], "http://localhost:5173");
      assert.ok(headers["access-control-allow-methods"].includes("POST"));
    });

    it("does not allow wildcard '*' in production mode", async () => {
      // Even if raw string contains '*', in production createCorsOptions must not grant wildcard
      const corsMiddleware = cors(createCorsOptions("*", "production"));
      const headers: Record<string, string> = {};
      const req = {
        method: "GET",
        headers: { origin: "http://attacker.com" },
      } as any;
      const res = {
        setHeader(name: string, value: string) {
          headers[name.toLowerCase()] = value;
        },
        getHeader(name: string) {
          return headers[name.toLowerCase()];
        },
      } as any;

      await new Promise<void>((resolve) => {
        corsMiddleware(req, res, () => resolve());
      });

      assert.equal(headers["access-control-allow-origin"], undefined);
    });

    it("does not enable credentialed CORS (credentials is false)", () => {
      const options = createCorsOptions("http://localhost:5173", "development");
      assert.equal(options.credentials, false, "CORS credentials must remain false");
    });
  });

  // =========================================================================
  // 3. Login Rate Limiting
  // =========================================================================
  describe("3. Login Rate Limiting", () => {
    it("allows up to 5 login attempts within the window and sets standard RateLimit headers", async () => {
      const limiter = createLoginRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 5,
      });

      const fakeApp = { get: () => false };
      const testIp = `192.168.1.${Math.floor(Math.random() * 200) + 10}`;

      for (let attempt = 1; attempt <= 5; attempt++) {
        const headers: Record<string, string> = {};
        let nextCalled = false;
        let blocked = false;

        const req = {
          ip: testIp,
          headers: {},
          app: fakeApp,
        } as any;
        const res = {
          statusCode: 200,
          setHeader(k: string, v: string) {
            headers[k.toLowerCase()] = String(v);
          },
          getHeader(k: string) {
            return headers[k.toLowerCase()];
          },
          status(code: number) {
            this.statusCode = code;
            return this;
          },
          json() {
            blocked = true;
            return this;
          },
        } as any;

        await new Promise<void>((resolve) => {
          limiter(req, res, () => {
            nextCalled = true;
            resolve();
          }).then(() => resolve());
        });

        assert.equal(nextCalled, true, `Attempt ${attempt} should be allowed`);
        assert.equal(blocked, false, `Attempt ${attempt} should not be blocked`);
        // Verify standard headers are present
        assert.equal(headers["ratelimit-limit"], "5");
        assert.equal(headers["ratelimit-remaining"], String(5 - attempt));
        assert.ok(headers["ratelimit-reset"] !== undefined);
        // Verify legacy headers are disabled
        assert.equal(headers["x-ratelimit-limit"], undefined);
        assert.equal(headers["x-ratelimit-remaining"], undefined);
      }
    });

    it("blocks the 6th login attempt with HTTP 429 and standard error envelope", async () => {
      const limiter = createLoginRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 5,
      });

      const fakeApp = { get: () => false };
      const testIp = `10.0.0.${Math.floor(Math.random() * 200) + 10}`;

      // Exhaust 5 attempts
      for (let attempt = 1; attempt <= 5; attempt++) {
        const req = { ip: testIp, headers: {}, app: fakeApp } as any;
        const res = {
          statusCode: 200,
          setHeader() {},
          getHeader() {},
          status() {
            return this;
          },
          json() {
            return this;
          },
        } as any;
        await new Promise<void>((resolve) => {
          limiter(req, res, () => resolve()).then(() => resolve());
        });
      }

      // 6th attempt must be rejected
      const headers: Record<string, string> = {};
      let nextCalled = false;
      let statusCode = 200;
      let responseBody: any = null;

      const req = { ip: testIp, headers: {}, app: fakeApp } as any;
      const res = {
        statusCode: 200,
        setHeader(k: string, v: string) {
          headers[k.toLowerCase()] = String(v);
        },
        getHeader(k: string) {
          return headers[k.toLowerCase()];
        },
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(body: any) {
          responseBody = body;
          return this;
        },
      } as any;

      await new Promise<void>((resolve) => {
        limiter(req, res, () => {
          nextCalled = true;
          resolve();
        }).then(() => resolve());
      });

      assert.equal(nextCalled, false, "6th attempt must not call next()");
      assert.equal(statusCode, 429, "Exceeded limit must return HTTP 429");
      assert.equal(responseBody.error.code, "TOO_MANY_REQUESTS");
      assert.ok(responseBody.error.message.includes("Too many login attempts"));
      assert.equal(headers["ratelimit-remaining"], "0");
    });
  });

  // =========================================================================
  // 4. Valid Login Behavior Unchanged
  // =========================================================================
  describe("4. Valid Login Behavior Unchanged", () => {
    it("successfully authenticates valid credentials within rate limit", async () => {
      const usersRepo = new InMemoryUsersRepository();
      const authService = new AuthService(usersRepo);

      const password = "ValidPassword123!";
      const passwordHash = await hashPassword(password);
      await usersRepo.create({
        email: "alice.security@example.com",
        passwordHash,
        role: UserRole.CUSTOMER,
        name: "Alice Security",
      });

      const result = await authService.login({
        email: "alice.security@example.com",
        password,
      });

      assert.ok(result.accessToken, "Should return an accessToken");
      assert.equal(result.user.email, "alice.security@example.com");
      assert.equal(result.user.role, UserRole.CUSTOMER);

      const decoded = verifyToken(result.accessToken);
      assert.equal(decoded.email, "alice.security@example.com");
      assert.equal(decoded.role, UserRole.CUSTOMER);
      assert.ok(Number.isFinite(decoded.iat));
      assert.ok(Number.isFinite(decoded.exp));
      assert.ok(decoded.exp > decoded.iat);
    });
  });

  // =========================================================================
  // 5. JWT Timestamp Claim Hardening
  // =========================================================================
  describe("5. JWT Timestamp Claim Hardening", () => {
    function craftToken(payloadObj: Record<string, unknown>): string {
      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
      const sig = crypto
        .createHmac("sha256", env.JWT_SECRET)
        .update(`${header}.${payload}`)
        .digest("base64url");
      return `${header}.${payload}.${sig}`;
    }

    it("rejects token when iat is not a finite number", () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      const token = craftToken({
        userId: "usr-123",
        email: "user@example.com",
        role: UserRole.CUSTOMER,
        iat: "invalid-string-iat",
        exp: future,
      });

      assert.throws(
        () => verifyToken(token),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.ok(err.message.includes("numeric finite iat and exp timestamps required"));
          return true;
        }
      );
    });

    it("rejects token when exp is not a finite number", () => {
      const now = Math.floor(Date.now() / 1000);
      const token = craftToken({
        userId: "usr-123",
        email: "user@example.com",
        role: UserRole.CUSTOMER,
        iat: now,
        exp: null,
      });

      assert.throws(
        () => verifyToken(token),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedError);
          return true;
        }
      );
    });

    it("rejects token when exp is not later than iat (exp <= iat)", () => {
      const future = Math.floor(Date.now() / 1000) + 5000;
      const token = craftToken({
        userId: "usr-123",
        email: "user@example.com",
        role: UserRole.CUSTOMER,
        iat: future,
        exp: future, // exp equal to iat
      });

      assert.throws(
        () => verifyToken(token),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.ok(err.message.includes("exp must be later than iat"));
          return true;
        }
      );
    });

    it("rejects token when exp is strictly before iat (exp < iat in future)", () => {
      const future = Math.floor(Date.now() / 1000) + 5000;
      const token = craftToken({
        userId: "usr-123",
        email: "user@example.com",
        role: UserRole.CUSTOMER,
        iat: future + 100,
        exp: future, // exp is before iat
      });

      assert.throws(
        () => verifyToken(token),
        (err: any) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.ok(err.message.includes("exp must be later than iat"));
          return true;
        }
      );
    });

    it("accepts valid token with finite timestamps where exp > iat", () => {
      const validToken = generateToken({
        userId: "usr-999",
        email: "tester@example.com",
        role: UserRole.CUSTOMER,
      });

      const decoded = verifyToken(validToken);
      assert.ok(Number.isFinite(decoded.iat));
      assert.ok(Number.isFinite(decoded.exp));
      assert.ok(decoded.exp > decoded.iat);
    });
  });
});
