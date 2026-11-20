import { rateLimit, type Options } from "express-rate-limit";
import { errorResponse } from "../utils/response.js";
import { createDistributedRateLimitStore } from "../config/redis.js";

/**
 * Factory for login rate limiter configuration.
 * Configured for maximum 5 login attempts per 15 minutes per IP address.
 * Backed by distributed Redis store when configured/in production.
 */
export function createLoginRateLimiter(overrides?: Partial<Options>) {
  const store = createDistributedRateLimitStore("rl:login:");
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts
    standardHeaders: true, // Return standard RateLimit-* headers (draft-6 / draft-7)
    legacyHeaders: false, // Disable X-RateLimit-* legacy headers
    statusCode: 429,
    store,
    validate: { default: false }, // Avoid false-positive warnings when running in test runners
    handler: (_req, res) => {
      res.status(429).json(
        errorResponse(
          "Too many login attempts from this IP, please try again after 15 minutes",
          "TOO_MANY_REQUESTS"
        )
      );
    },
    ...overrides,
  });
}

/**
 * Dedicated login rate limiter instance mounted on POST /api/v1/auth/login.
 */
export const loginRateLimiter = createLoginRateLimiter();
