import { describe, it, expect, beforeEach, afterAll, jest } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app.js";
import { logger } from "../src/config/logger.js";
import { disconnectDatabase } from "../src/config/database.js";
import {
  getRedisClient,
  disconnectRedis,
  checkRedisHealth,
  sanitizeRedisUrl,
  createDistributedRateLimitStore,
} from "../src/config/redis.js";

describe("Day 21 — Redis Integration, Health Checks & Structured Logging", () => {
  afterAll(async () => {
    await Promise.allSettled([
      disconnectDatabase(),
      disconnectRedis(),
    ]);
  });

  describe("1. Structured Logger Redaction & Features", () => {
    it("exports a configured Pino logger instance", () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
    });

    it("sanitizes Redis URLs containing passwords", () => {
      const sanitized = sanitizeRedisUrl("redis://:secret_password@redis.internal:6379/0");
      expect(sanitized).not.toContain("secret_password");
      expect(sanitized).toContain("[REDACTED]");
    });

    it("attaches X-Request-Id header to HTTP responses", async () => {
      const res = await request(app).get("/health/live");
      expect(res.status).toBe(200);
      expect(res.headers["x-request-id"]).toBeDefined();
      expect(typeof res.headers["x-request-id"]).toBe("string");
      expect(res.headers["x-request-id"].length).toBeGreaterThan(0);
    });

    it("preserves incoming client X-Request-Id header", async () => {
      const clientReqId = "client-trace-id-abc-123";
      const res = await request(app)
        .get("/health/live")
        .set("X-Request-Id", clientReqId);

      expect(res.status).toBe(200);
      expect(res.headers["x-request-id"]).toBe(clientReqId);
    });
  });

  describe("2. Health Check Probes (/health, /health/live, /health/ready)", () => {
    it("GET /health/live returns HTTP 200 with process uptime", async () => {
      const res = await request(app).get("/health/live");

      expect(res.status).toBe(200);
      expect(res.body.error).toBeNull();
      expect(res.body.data.status).toBe("ok");
      expect(typeof res.body.data.uptime).toBe("number");
      expect(res.body.data.timestamp).toBeDefined();
    });

    it("GET /health returns dependency health checks for database and redis", async () => {
      const res = await request(app).get("/health");

      // Even if one dependency is down in test runner, structure must match contract
      expect([200, 503]).toContain(res.status);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.checks).toBeDefined();
      expect(res.body.data.checks.database).toHaveProperty("status");
      expect(res.body.data.checks.redis).toHaveProperty("status");
      expect(res.body.data.checks.database).toHaveProperty("latencyMs");
      expect(res.body.data.checks.redis).toHaveProperty("latencyMs");

      // Verify no raw credentials leaked
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain("password");
      expect(serialized).not.toContain("DATABASE_URL");
      expect(serialized).not.toContain("REDIS_URL");
    });

    it("GET /health/ready returns status and dependency states", async () => {
      const res = await request(app).get("/health/ready");

      expect([200, 503]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.status).toBe("ready");
        expect(res.body.data.database).toBe("up");
        expect(res.body.data.redis).toBe("up");
      } else {
        expect(res.body.error.code).toBe("NOT_READY");
      }
    });
  });

  describe("3. Distributed Redis Rate-Limiter Store", () => {
    it("creates Redis rate limit store with expected prefix", () => {
      // In test mode, createDistributedRateLimitStore returns undefined unless forced
      const prevEnv = process.env.ENABLE_REDIS_RATE_LIMIT;
      process.env.ENABLE_REDIS_RATE_LIMIT = "true";

      try {
        const store = createDistributedRateLimitStore("rl:test:");
        expect(store).toBeDefined();
        expect((store as any).prefix).toBe("rl:test:");
      } finally {
        process.env.ENABLE_REDIS_RATE_LIMIT = prevEnv;
      }
    });

    it("can ping Redis directly using checkRedisHealth()", async () => {
      const health = await checkRedisHealth(2000);
      expect(["up", "down"]).toContain(health.status);
      expect(typeof health.latencyMs).toBe("number");
      if (health.status === "up") {
        expect(health.error).toBeUndefined();
      }
    });
  });
});
