import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/appError.js";
import { errorResponse } from "../utils/response.js";
import { logger } from "../config/logger.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const reqId = (req as any)?.id || req?.headers?.["x-request-id"];

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, reqId }, `[AppError ${err.code}]: ${err.message}`);
    } else {
      logger.warn({ code: err.code, message: err.message, reqId }, `[AppError ${err.code}]`);
    }
    res.status(err.statusCode).json(errorResponse(err.message, err.code, err.details));
    return;
  }

  // Handle unexpected syntax errors from express.json()
  if (err instanceof SyntaxError && "body" in err) {
    logger.warn({ reqId }, "Malformed JSON in request body");
    res.status(400).json(errorResponse("Malformed JSON in request body", "BAD_REQUEST"));
    return;
  }

  // Unexpected errors: never expose stack traces or raw database messages to clients
  logger.error({ err, reqId }, "[Unhandled Error]");
  res.status(500).json(errorResponse("Internal server error", "INTERNAL_SERVER_ERROR"));
}
