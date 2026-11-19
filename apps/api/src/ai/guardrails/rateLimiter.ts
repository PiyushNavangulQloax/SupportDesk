import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

/**
 * SupportDesk AI Guardrails - Per-User Rate Limiter
 *
 * Restricts AI endpoint calls to prevent model abuse, runaway loops, and denial of wallet.
 * Default: 10 requests per minute per authenticated user.
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // Max 10 requests per window
  standardHeaders: true, // Draft-6 RateLimit headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
  legacyHeaders: false, // Disable X-RateLimit-* headers
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: Request): string => {
    // Rate limit per authenticated user; fallback to IP if not logged in
    return req.user?.id || req.ip || "unknown-user";
  },
  handler: (req: Request, res: Response, _next: NextFunction, options) => {
    const retryAfter = Math.ceil(options.windowMs / 1000);
    res.status(429).json({
      data: null,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "AI rate limit exceeded. Please wait a moment before trying again.",
        details: {
          retryAfterSeconds: retryAfter,
          limit: options.max,
          windowMs: options.windowMs,
        },
      },
      meta: null,
    });
  },
});
