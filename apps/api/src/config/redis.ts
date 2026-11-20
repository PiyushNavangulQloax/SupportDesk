import { Redis } from "ioredis";
import { RedisStore } from "rate-limit-redis";
import type { Store } from "express-rate-limit";
import { env } from "./env.js";
import { logger } from "./logger.js";

let redisClient: Redis | null = null;

/**
 * Sanitizes a Redis connection string by replacing passwords with [REDACTED].
 */
export function sanitizeRedisUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = "REDACTED";
    }
    return parsed.toString().replace("REDACTED", "[REDACTED]");
  } catch {
    return "redis://[REDACTED]";
  }
}

/**
 * Returns the singleton Redis client instance.
 * Initializes the client lazily if not already created.
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = env.REDIS_URL || "redis://localhost:6379";
    const isTest = env.NODE_ENV === "test";

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy(times) {
        if (isTest) {
          // Do not loop retries indefinitely in unit test environments
          return null;
        }
        return Math.min(times * 150, 2000);
      },
    });

    redisClient.on("connect", () => {
      if (isTest) {
        (redisClient as any)?.stream?.unref?.();
      }
      logger.info({ redisUrl: sanitizeRedisUrl(redisUrl) }, "[Redis] Connecting to instance...");
    });

    redisClient.on("ready", () => {
      if (isTest) {
        (redisClient as any)?.stream?.unref?.();
      }
      logger.info("[Redis] Client connected and ready for traffic.");
    });

    redisClient.on("error", (err) => {
      if (!isTest) {
        logger.error({ err }, "[Redis] Client connection error");
      }
    });

    redisClient.on("close", () => {
      if (!isTest) {
        logger.warn("[Redis] Connection closed.");
      }
    });
  }

  return redisClient;
}

/**
 * Disconnects the Redis client gracefully.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    const client = redisClient;
    redisClient = null;
    try {
      if (client.status === "ready" || client.status === "connect") {
        await client.quit();
      } else {
        client.disconnect();
      }
    } catch (err) {
      logger.error({ err }, "[Redis] Error during client disconnect; forcing disconnect");
      client.disconnect();
    }
  }
}

export interface RedisHealthResult {
  status: "up" | "down";
  latencyMs: number;
  error?: string;
}

/**
 * Performs an active Redis PING check with a timeout.
 * Returns up/down status and roundtrip latency without leaking credentials.
 */
export async function checkRedisHealth(timeoutMs = 2000): Promise<RedisHealthResult> {
  const start = Date.now();
  try {
    const client = getRedisClient();
    if (client.status === "wait") {
      await Promise.race([
        client.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), timeoutMs)),
      ]);
    }

    const pingPromise = client.ping();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Redis ping timeout")), timeoutMs)
    );

    const reply = await Promise.race([pingPromise, timeoutPromise]);
    if (reply !== "PONG") {
      throw new Error(`Unexpected Redis ping response: ${reply}`);
    }

    return {
      status: "up",
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err?.message || "Redis connectivity check failed",
    };
  }
}

/**
 * Factory to create a distributed rate-limiting store backed by Redis.
 *
 * Requirements:
 * - In production: strictly uses RedisStore. Throws if Redis is unavailable.
 * - In test mode: allows fallback to memory store if Redis is not running locally.
 */
export function createDistributedRateLimitStore(prefix: string): Store | undefined {
  if (env.NODE_ENV === "production" || process.env.ENABLE_REDIS_RATE_LIMIT === "true") {
    const client = getRedisClient();
    return new RedisStore({
      sendCommand: async (...args: string[]) => {
        if (client.status === "wait") {
          await client.connect();
        }
        return (client.call as any)(args[0], ...args.slice(1));
      },
      prefix,
    });
  }

  // Non-production (development / test without Redis):
  // If Redis client is already ready, use it; otherwise return undefined to let express-rate-limit use memory
  if (redisClient && redisClient.status === "ready") {
    return new RedisStore({
      sendCommand: async (...args: string[]) => {
        return (redisClient!.call as any)(args[0], ...args.slice(1));
      },
      prefix,
    });
  }

  return undefined;
}
