import type { CorsOptions } from "cors";
import { env } from "./env.js";

/**
 * Parses and returns the allowlist of origins configured in the environment.
 * Multiple origins may be specified as a comma-separated list.
 */
export function getAllowedOrigins(corsOrigin: string = env.CORS_ORIGIN): string[] {
  return corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Constructs strict CORS options based on validated environment configuration.
 * - Restricts requests to explicitly configured frontend origins.
 * - Handles preflight OPTIONS requests for all supported HTTP methods.
 * - Disallows wildcard '*' in production mode.
 * - Does not enable credentials unless browser cookies or sessions are required.
 */
export function createCorsOptions(
  corsOrigin: string = env.CORS_ORIGIN,
  nodeEnv: string = env.NODE_ENV
): CorsOptions {
  const allowedOrigins = getAllowedOrigins(corsOrigin);
  const isProduction = nodeEnv === "production";
  const allowWildcard = !isProduction && allowedOrigins.includes("*");

  return {
    origin: (requestOrigin, callback) => {
      // Allow requests with no Origin header (e.g., curl, mobile apps, server-to-server)
      if (!requestOrigin) {
        return callback(null, true);
      }

      // In non-production environments, allow wildcard if explicitly configured
      if (allowWildcard) {
        return callback(null, true);
      }

      // Check against explicit allowlist
      if (allowedOrigins.includes(requestOrigin)) {
        return callback(null, true);
      }

      // Disallow unapproved origins
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    optionsSuccessStatus: 204,
  };
}

export const corsOptions = createCorsOptions();

