import { Router } from "express";
import { aiController } from "../controllers/ai.controller.js";
import { authorize, UserRole } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { ticketIdParamSchema } from "../schemas/ticket.schema.js";
import { suggestReplyBodySchema } from "../ai/schemas/ai.schema.js";
import { aiRateLimiter } from "../ai/guardrails/rateLimiter.js";

/**
 * AI Routes mounted under `/api/v1/tickets/:id/ai`
 * Protected exclusively for AGENT and ADMIN roles.
 * Protected by per-user rate limiting (10 requests/minute).
 */
export const aiRouter = Router({ mergeParams: true });

// Enforce role-based access: staff only (customers rejected with 403 Forbidden)
aiRouter.use(authorize(UserRole.AGENT, UserRole.ADMIN));

// Enforce per-user rate limiting on AI endpoints
aiRouter.use(aiRateLimiter);

/**
 * Feature A: Suggest Reply Stream (SSE)
 * POST /api/v1/tickets/:id/ai/suggest-reply
 */
aiRouter.post(
  "/suggest-reply",
  validateRequest({
    params: ticketIdParamSchema,
    body: suggestReplyBodySchema,
  }),
  aiController.suggestReply
);

/**
 * Feature B: Auto-categorise + Priority (Structured JSON)
 * POST /api/v1/tickets/:id/ai/categorize
 */
aiRouter.post(
  "/categorize",
  validateRequest({
    params: ticketIdParamSchema,
  }),
  aiController.categorizeTicket
);
