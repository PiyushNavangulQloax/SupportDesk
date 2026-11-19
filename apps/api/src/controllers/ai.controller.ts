import type { Request, Response, NextFunction } from "express";
import { aiService, AiService } from "../ai/ai.service.js";
import { successResponse } from "../utils/response.js";
import { UnauthorizedError } from "../errors/appError.js";

export class AiController {
  constructor(private readonly service: AiService = aiService) {}

  /**
   * POST /api/v1/tickets/:id/ai/suggest-reply
   * Streams draft suggestion using Server-Sent Events (SSE).
   */
  suggestReply = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }
      const ticketId = req.params.id as string;
      const instructions = req.body?.instructions;

      const handle = await this.service.suggestReplyStream(
        ticketId,
        req.user,
        instructions
      );

      // Establish SSE streaming headers
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      let clientDisconnected = false;
      const onDisconnect = () => {
        // Only consider it a client abort if the response has not yet naturally completed
        if (!res.writableEnded) {
          clientDisconnected = true;
        }
      };
      res.on?.("close", onDisconnect);

      let lastUsageMetadata: any = undefined;

      try {
        for await (const chunk of handle.stream) {
          if (clientDisconnected) break;

          if (chunk.usageMetadata) {
            lastUsageMetadata = chunk.usageMetadata;
          }

          const text = chunk.text || "";
          if (text) {
            res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
          }
        }

        if (!clientDisconnected) {
          const metrics = handle.onComplete(lastUsageMetadata, true);
          res.write(
            `data: ${JSON.stringify({
              done: true,
              model: handle.model,
              promptVersion: handle.promptVersion,
              usage: metrics,
            })}\n\n`
          );
          res.write("data: [DONE]\n\n");
          res.end();
        } else {
          handle.onComplete(lastUsageMetadata, false);
        }
      } catch (streamErr) {
        handle.onComplete(undefined, false);
        if (!res.headersSent) {
          next(streamErr);
        } else {
          const message = "AI unavailable — reply manually.";
          res.write(
            `event: error\ndata: ${JSON.stringify({
              code: "AI_STREAM_ERROR",
              message,
            })}\n\n`
          );
          res.end();
        }
      } finally {
        res.removeListener?.("close", onDisconnect);
      }
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/tickets/:id/ai/categorize
   * Returns structured categorization proposal for human agent review.
   */
  categorizeTicket = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }
      const ticketId = req.params.id as string;
      const result = await this.service.categorizeTicket(ticketId, req.user);

      res.status(200).json(successResponse(result.data, result.meta));
    } catch (err) {
      next(err);
    }
  };
}

export const aiController = new AiController();
