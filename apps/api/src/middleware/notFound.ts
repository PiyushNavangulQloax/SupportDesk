import type { Request, Response } from "express";
import { errorResponse } from "../utils/response.js";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(
    errorResponse(
      `Endpoint not found: ${req.method} ${req.originalUrl}`,
      "NOT_FOUND"
    )
  );
}
