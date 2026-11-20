import { Router } from "express";
import { prisma } from "../config/database.js";
import { checkRedisHealth } from "../config/redis.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { logger } from "../config/logger.js";

export const healthRouter = Router();

/**
 * Checks PostgreSQL database connectivity with a strict timeout.
 */
export async function checkDatabaseHealth(timeoutMs = 2000): Promise<{
  status: "up" | "down";
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const queryPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database query timeout")), timeoutMs)
    );

    await Promise.race([queryPromise, timeoutPromise]);
    return {
      status: "up",
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: "PostgreSQL query failed",
    };
  }
}

/**
 * Primary Health Check Endpoint: GET /health
 *
 * Verifies process uptime and real-time connectivity to PostgreSQL and Redis.
 * - HTTP 200: All services and dependencies are healthy.
 * - HTTP 503: One or more critical dependencies are degraded or unreachable.
 */
healthRouter.get("/", async (_req, res) => {
  const [dbResult, redisResult] = await Promise.all([
    checkDatabaseHealth(2000),
    checkRedisHealth(2000),
  ]);

  const isHealthy = dbResult.status === "up" && redisResult.status === "up";
  const statusCode = isHealthy ? 200 : 503;

  const payload = {
    status: isHealthy ? "ok" : "degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      database: dbResult,
      redis: redisResult,
    },
  };

  if (!isHealthy) {
    logger.warn({ checks: payload.checks }, "[HealthCheck] Dependency health check degraded");
    res.status(503).json({
      data: payload,
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "One or more critical dependencies are unavailable",
      },
      meta: {},
    });
    return;
  }

  res.status(200).json(successResponse(payload));
});

/**
 * Liveness Probe: GET /health/live
 *
 * Verifies that the Express Node.js process is active, responsive, and not deadlocked.
 * Used by orchestrators (Kubernetes / Docker) to determine if process restart is required.
 */
healthRouter.get("/live", (_req, res) => {
  res.status(200).json(
    successResponse({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  );
});

/**
 * Readiness Probe: GET /health/ready
 *
 * Verifies that all required backing services (PostgreSQL & Redis) are ready to accept traffic.
 * Used by orchestrators and load balancers to route live traffic only to ready pods/containers.
 */
healthRouter.get("/ready", async (_req, res) => {
  const [dbResult, redisResult] = await Promise.all([
    checkDatabaseHealth(2000),
    checkRedisHealth(2000),
  ]);

  const isReady = dbResult.status === "up" && redisResult.status === "up";

  if (!isReady) {
    res.status(503).json(
      errorResponse("Service not ready: backing dependencies unavailable", "NOT_READY", {
        database: dbResult.status,
        redis: redisResult.status,
      })
    );
    return;
  }

  res.status(200).json(
    successResponse({
      status: "ready",
      database: dbResult.status,
      redis: redisResult.status,
      timestamp: new Date().toISOString(),
    })
  );
});
