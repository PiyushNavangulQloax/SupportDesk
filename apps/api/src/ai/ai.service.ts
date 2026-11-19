import { geminiClient, GeminiClient } from "./gemini.client.js";
import {
  ticketsRepository,
  TicketsRepository,
} from "../repositories/tickets.repository.js";
import {
  commentsRepository,
  CommentsRepository,
} from "../repositories/comments.repository.js";
import { NotFoundError, AppError } from "../errors/appError.js";
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

export class AiService {
  constructor(
    private readonly client: GeminiClient = geminiClient,
    private readonly ticketsRepo: TicketsRepository = ticketsRepository,
    private readonly commentsRepo: CommentsRepository = commentsRepository
  ) {}

  /**
   * Feature A: Suggest Reply Stream.
   * Retrieves ticket details + latest 5 PUBLIC comments (excluding internal notes),
   * builds versioned prompt, and returns an async stream handle.
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

    const stream = await this.client.generateContentStream({
      contents: prompt,
      config: {
        systemInstruction: SUGGEST_REPLY_SYSTEM_INSTRUCTION,
      },
    });

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
      stream,
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

    const prompt = buildCategorizePrompt({ ticket });
    const startTime = Date.now();

    let response: any;
    try {
      response = await this.client.generateContent({
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: CATEGORIZE_RESPONSE_SCHEMA,
          systemInstruction: CATEGORIZE_SYSTEM_INSTRUCTION,
        },
      });
    } catch (err) {
      logAiUsage({
        type: "AI_USAGE_METRIC",
        feature: "AUTO_CATEGORIZE",
        ticketId,
        model: this.client.model,
        durationMs: Date.now() - startTime,
        success: false,
        timestamp: new Date().toISOString(),
      });
      throw err;
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
        "AI provider returned malformed or non-JSON output",
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
        "AI categorization failed schema validation",
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
