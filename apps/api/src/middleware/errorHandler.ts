import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/appError.js";
import { errorResponse } from "../utils/response.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.code, err.details));
    return;
  }

  // Handle unexpected syntax errors from express.json()
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json(errorResponse("Malformed JSON in request body", "BAD_REQUEST"));
    return;
  }

  // Unexpected errors: never expose stack traces or raw database messages to clients
  console.error("[Unhandled Error]:", err);
  res.status(500).json(errorResponse("Internal server error", "INTERNAL_SERVER_ERROR"));
}
