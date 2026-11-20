import type { IncomingMessage, ServerResponse } from "http";
import pinoHttp from "pino-http";
import crypto from "node:crypto";
import { logger } from "../config/logger.js";

/**
 * SupportDesk Centralized HTTP Request Logger Middleware
 * Powered by pino-http.
 *
 * Capabilities:
 * - Generates or propagates standard correlation ID (X-Request-Id).
 * - Logs HTTP method, URL, status code, latency (ms).
 * - Levels: 5xx=error, 4xx=warn, health checks=debug, other=info.
 * - Redacts sensitive headers and request bodies via Pino configuration.
 */
export const requestLogger = (pinoHttp as any)({
  logger,
  genReqId: (req: IncomingMessage, res: ServerResponse) => {
    const existing = req.headers["x-request-id"];
    const id = (typeof existing === "string" && existing.trim()) || crypto.randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel: (req: IncomingMessage, res: ServerResponse, err?: Error) => {
    if ((res.statusCode && res.statusCode >= 500) || err) return "error";
    if (res.statusCode && res.statusCode >= 400) return "warn";
    if (req.url && (req.url === "/health" || req.url.startsWith("/health/"))) return "debug";
    return "info";
  },
  customSuccessMessage: (req: IncomingMessage, res: ServerResponse, responseTime: number) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${Math.round(responseTime)}ms`;
  },
  customErrorMessage: (req: IncomingMessage, res: ServerResponse, err: Error) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },
  serializers: {
    req(req: any) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
      };
    },
    res(res: any) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
