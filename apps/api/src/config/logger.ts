import { pino } from "pino";
import { env } from "./env.js";

const isDev = env.NODE_ENV === "development";
const isTest = env.NODE_ENV === "test";

/**
 * SupportDesk Centralized Structured Logger (Pino)
 *
 * Configured with:
 * - Deterministic JSON structure in production.
 * - Human-readable colorized output via pino-pretty in development.
 * - Automatic redaction of sensitive credentials, tokens, and authorization headers.
 * - Request correlation support via request IDs.
 */
export const logger = pino({
  level: isTest ? (process.env.LOG_LEVEL || "silent") : (env.LOG_LEVEL || "info"),
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.passwordHash",
      "req.body.token",
      "req.body.apiKey",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.authorization",
      "*.apiKey",
      "*.geminiApiKey",
      "*.GEMINI_API_KEY",
      "*.JWT_SECRET",
      "*.DATABASE_URL",
      "*.TEST_DATABASE_URL",
      "*.REDIS_URL",
    ],
    censor: "[REDACTED]",
  },
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

export type Logger = typeof logger;
