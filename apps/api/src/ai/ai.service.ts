import { geminiClient, GeminiClient } from "./gemini.client.js";
import {
  ticketsRepository,
  TicketsRepository,
} from "../repositories/tickets.repository.js";
import {
  commentsRepository,
  CommentsRepository,
} from "../repositories/comments.repository.js";
import {
  NotFoundError,
  AppError,
  AiServiceUnavailableError,
} from "../errors/appError.js";
import type { AuthenticatedUser } from "../types/express.js";
import {
  buildSuggestReplyPrompt,
  SUGGEST_REPLY_SYSTEM_INSTRUCTION,
  SUGGEST_REPLY_PROMPT_VERSION,
} from "./prompts/suggestReply.prompt.js";
import {
  buildCategorizePrompt,
  CATEGORIZE_SYSTEM_INSTRUCTION,
  CATEGORIZE_RESPONSE_SCHEMA,
  CATEGORIZE_PROMPT_VERSION,
} from "./prompts/categorize.prompt.js";
import {
  aiCategorizeResponseSchema,
  logAiUsage,
  type AiCategorizeResponse,
} from "./schemas/ai.schema.js";
import { calculateEstimatedCostUsd } from "./pricing.js";
import { moderateContent } from "./guardrails/contentModeration.js";

export const AI_REQUEST_TIMEOUT_MS = 10000;
export const AI_SAFE_FALLBACK_MESSAGE = "AI unavailable — reply manually.";

export interface StreamCompletionResult {
  promptTokens?: number;
  candidatesTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  durationMs: number;
}

export interface SuggestReplyStreamHandle {
  stream: AsyncIterable<{ text?: string; usageMetadata?: any }>;
  model: string;
  promptVersion: string;
  ticketId: string;
  onComplete: (usageMetadata?: any, success?: boolean) => StreamCompletionResult;
}

export interface CategorizeTicketResult {
  data: AiCategorizeResponse;
  meta: {
    model: string;
    promptVersion: string;
    usage: {
      promptTokens?: number;
      candidatesTokens?: number;
      totalTokens?: number;
      estimatedCostUsd?: number;
    };
    durationMs: number;
  };
}

/**
 * Executes a promise with an enforced timeout.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = AI_REQUEST_TIMEOUT_MS,
  timeoutErrorMessage = "AI request timed out"
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new AppError(timeoutErrorMessage, 504, "AI_TIMEOUT"));
    }, timeoutMs);
    timer.unref?.();
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export class AiService {
  constructor(
    private readonly client: GeminiClient = geminiClient,
    private readonly ticketsRepo: TicketsRepository = ticketsRepository,
    private readonly commentsRepo: CommentsRepository = commentsRepository
  ) {}

  /**
   * Feature A: Suggest Reply Stream.
   * Retrieves ticket details + latest 5 PUBLIC comments (excluding internal notes),
   * applies moderation, PII masking, untrusted context delimitation,
   * and returns an async stream handle with 10s timeout protection.
   * Does NOT auto-send or persist the response.
   */
  async suggestReplyStream(
    ticketId: string,
    _user: AuthenticatedUser,
    instructions?: string
  ): Promise<SuggestReplyStreamHandle> {
    const ticket = await this.ticketsRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    // Guardrail: Content moderation check on input
    const textToModerate = `${ticket.title} ${ticket.description} ${instructions || ""}`;
    const moderation = moderateContent(textToModerate);
    if (!moderation.isSafe) {
      logAiUsage({
        type: "AI_USAGE_METRIC",
        feature: "SUGGEST_REPLY",
        ticketId,
        model: this.client.model,
        durationMs: 0,
        success: false,
        timestamp: new Date().toISOString(),
      });
      throw new AppError(
        AI_SAFE_FALLBACK_MESSAGE,
        400,
        "AI_CONTENT_MODERATION_BLOCKED",
        { reason: moderation.reason, flagged: moderation.flaggedCategories }
      );
    }

    // Retrieve latest public comments only (includeInternal = false)
    const allPublicComments = await this.commentsRepo.findByTicketId(
      ticketId,
      false
    );
    const latestFivePublicComments = allPublicComments.slice(-5);

    const prompt = buildSuggestReplyPrompt({
      ticket,
      publicComments: latestFivePublicComments,
      agentInstructions: instructions,
    });

    const startTime = Date.now();

    let rawStream: AsyncIterable<{ text?: string; usageMetadata?: any }>;
    try {
      rawStream = await withTimeout(
        this.client.generateContentStream({
          contents: prompt,
          config: {
            systemInstruction: SUGGEST_REPLY_SYSTEM_INSTRUCTION,
          },
        }),
        AI_REQUEST_TIMEOUT_MS,
        "AI reply suggestion timed out"
      );
    } catch (err: unknown) {
      logAiUsage({
        type: "AI_USAGE_METRIC",
        feature: "SUGGEST_REPLY",
        ticketId,
        model: this.client.model,
        durationMs: Date.now() - startTime,
        success: false,
        timestamp: new Date().toISOString(),
      });

      if (err instanceof AiServiceUnavailableError) {
        throw err;
      }
      const causeMsg = (err as Error)?.message || String(err);
      throw new AiServiceUnavailableError(
        `${AI_SAFE_FALLBACK_MESSAGE} (${causeMsg})`,
        { cause: causeMsg }
      );
    }

    // Wrap stream with timeout and fallback protection per chunk
    const protectedStream = (async function* () {
      try {
        for await (const chunk of rawStream) {
          yield chunk;
        }
      } catch (streamIterErr) {
        // Safe fallback chunk if interrupted mid-stream
        yield { text: `\n\n[${AI_SAFE_FALLBACK_MESSAGE}]` };
        throw streamIterErr;
      }
    })();

    const onComplete = (
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      },
      success = true
    ): StreamCompletionResult => {
      const durationMs = Date.now() - startTime;
      const promptTokens = usageMetadata?.promptTokenCount;
      const candidatesTokens = usageMetadata?.candidatesTokenCount;
      const totalTokens = usageMetadata?.totalTokenCount;
      const estimatedCostUsd = calculateEstimatedCostUsd(
        this.client.model,
        promptTokens,
        candidatesTokens
      );

      logAiUsage({
        type: "AI_USAGE_METRIC",
        feature: "SUGGEST_REPLY",
        ticketId,
        model: this.client.model,
        promptTokens,
        candidatesTokens,
        totalTokens,
        estimatedCostUsd,
        durationMs,
        success,
        timestamp: new Date().toISOString(),
      });

      return {
        promptTokens,
        candidatesTokens,
        totalTokens,
        estimatedCostUsd,
        durationMs,
      };
    };

    return {
      stream: protectedStream,
      model: this.client.model,
      promptVersion: SUGGEST_REPLY_PROMPT_VERSION,
      ticketId,
      onComplete,
    };
  }

  /**
   * Feature B: Auto-categorise and Priority.
   * Generates structured classification, validates with Zod, and returns proposal for human review.
   * Does NOT mutate the ticket in the database.
   */
  async categorizeTicket(
    ticketId: string,
    _user: AuthenticatedUser
  ): Promise<CategorizeTicketResult> {
    const ticket = await this.ticketsRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    // Guardrail: Content moderation check on input
    const textToModerate = `${ticket.title} ${ticket.description}`;
    const moderation = moderateContent(textToModerate);
    if (!moderation.isSafe) {
      logAiUsage({
        type: "AI_USAGE_METRIC",
        feature: "AUTO_CATEGORIZE",
        ticketId,
        model: this.client.model,
        durationMs: 0,
        success: false,
        timestamp: new Date().toISOString(),
      });
      throw new AppError(
        AI_SAFE_FALLBACK_MESSAGE,
        400,
        "AI_CONTENT_MODERATION_BLOCKED",
        { reason: moderation.reason, flagged: moderation.flaggedCategories }
      );
    }

    const prompt = buildCategorizePrompt({ ticket });
    const startTime = Date.now();

    let response: any;
    try {
      response = await withTimeout(
        this.client.generateContent({
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: CATEGORIZE_RESPONSE_SCHEMA,
            systemInstruction: CATEGORIZE_SYSTEM_INSTRUCTION,
          },
        }),
        AI_REQUEST_TIMEOUT_MS,
        "AI categorization request timed out"
      );
    } catch (err: unknown) {
      logAiUsage({
        type: "AI_USAGE_METRIC",
        feature: "AUTO_CATEGORIZE",
        ticketId,
        model: this.client.model,
        durationMs: Date.now() - startTime,
        success: false,
        timestamp: new Date().toISOString(),
      });

      if (err instanceof AiServiceUnavailableError) {
        throw err;
      }
      const causeMsg = (err as Error)?.message || String(err);
      throw new AiServiceUnavailableError(
        `${AI_SAFE_FALLBACK_MESSAGE} (${causeMsg})`,
        { cause: causeMsg }
      );
    }

    const rawText = response?.text || "";
    let parsedJson: unknown;
    try {
      if (!rawText.trim()) {
        throw new Error("Empty response text from AI provider");
      }
      parsedJson = JSON.parse(rawText);
    } catch (parseErr) {
      logAiUsage({
        type: "AI_USAGE_METRIC",
        feature: "AUTO_CATEGORIZE",
        ticketId,
        model: this.client.model,
        durationMs: Date.now() - startTime,
        success: false,
        timestamp: new Date().toISOString(),
      });
      throw new AppError(
        `${AI_SAFE_FALLBACK_MESSAGE}: Malformed or non-JSON output from AI provider`,
        502,
        "AI_INVALID_OUTPUT",
        { parseError: (parseErr as Error).message }
      );
    }

    const validated = aiCategorizeResponseSchema.safeParse(parsedJson);
    if (!validated.success) {
      logAiUsage({
        type: "AI_USAGE_METRIC",
        feature: "AUTO_CATEGORIZE",
        ticketId,
        model: this.client.model,
        durationMs: Date.now() - startTime,
        success: false,
        timestamp: new Date().toISOString(),
      });
      throw new AppError(
        `${AI_SAFE_FALLBACK_MESSAGE}: Categorization failed schema validation`,
        502,
        "AI_SCHEMA_VALIDATION_ERROR",
        validated.error.issues
      );
    }

    const durationMs = Date.now() - startTime;
    const usage = response.usageMetadata;
    const promptTokens = usage?.promptTokenCount;
    const candidatesTokens = usage?.candidatesTokenCount;
    const totalTokens = usage?.totalTokenCount;
    const estimatedCostUsd = calculateEstimatedCostUsd(
      this.client.model,
      promptTokens,
      candidatesTokens
    );

    logAiUsage({
      type: "AI_USAGE_METRIC",
      feature: "AUTO_CATEGORIZE",
      ticketId,
      model: this.client.model,
      promptTokens,
      candidatesTokens,
      totalTokens,
      estimatedCostUsd,
      durationMs,
      success: true,
      timestamp: new Date().toISOString(),
    });

    return {
      data: validated.data,
      meta: {
        model: this.client.model,
        promptVersion: CATEGORIZE_PROMPT_VERSION,
        usage: {
          promptTokens,
          candidatesTokens,
          totalTokens,
          estimatedCostUsd,
        },
        durationMs,
      },
    };
  }
}

export const aiService = new AiService();
