import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";
import { AiServiceUnavailableError } from "../errors/appError.js";

export interface GeminiClientOptions {
  apiKey?: string;
  model?: string;
  maxOutputTokens?: number;
}

export interface GenerateContentParams {
  model?: string;
  contents: unknown;
  config?: Record<string, unknown>;
}

/**
 * GeminiClient encapsulates GoogleGenAI SDK usage.
 * Features:
 * - Lazy initialization to avoid console warnings or crashes when GEMINI_API_KEY is omitted.
 * - Throws a controlled 503 AiServiceUnavailableError on demand when unconfigured.
 * - Supports constructor injection of mock SDK instances for 100% offline unit testing.
 * - Never prints or leaks the API key in logs, errors, or serialized properties.
 */
export class GeminiClient {
  private clientInstance: GoogleGenAI | null = null;
  private readonly apiKey?: string;
  public readonly model: string;
  public readonly maxOutputTokens: number;

  constructor(
    options?: GeminiClientOptions,
    private readonly customSdkClient?: GoogleGenAI
  ) {
    this.apiKey =
      options && "apiKey" in options ? options.apiKey : env.GEMINI_API_KEY;
    this.model = options?.model !== undefined ? options.model : env.AI_MODEL;
    this.maxOutputTokens =
      options?.maxOutputTokens !== undefined
        ? options.maxOutputTokens
        : env.AI_MAX_OUTPUT_TOKENS;

    if (customSdkClient) {
      this.clientInstance = customSdkClient;
    }
  }

  /**
   * Returns true if a valid non-empty API key is present or a custom SDK mock client was provided.
   */
  public isConfigured(): boolean {
    if (this.customSdkClient) {
      return true;
    }
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Retrieves the initialized GoogleGenAI instance.
   * Lazily creates the instance on first access.
   * Throws 503 AiServiceUnavailableError if the client is not configured.
   */
  public getSdkClient(): GoogleGenAI {
    if (!this.isConfigured()) {
      throw new AiServiceUnavailableError(
        "AI service is currently unavailable: GEMINI_API_KEY is not configured"
      );
    }

    if (!this.clientInstance) {
      this.clientInstance = new GoogleGenAI({
        apiKey: this.apiKey,
      });
    }

    return this.clientInstance;
  }

  /**
   * Generates content using the configured model and options.
   */
  public async generateContent(params: GenerateContentParams) {
    const client = this.getSdkClient();
    const modelToUse = params.model || this.model;
    const config = {
      maxOutputTokens: this.maxOutputTokens,
      ...params.config,
    };

    return client.models.generateContent({
      model: modelToUse,
      contents: params.contents as any,
      config,
    });
  }

  /**
   * Generates streamed content chunks using the configured model and options.
   */
  public async generateContentStream(params: GenerateContentParams) {
    const client = this.getSdkClient();
    const modelToUse = params.model || this.model;
    const config = {
      maxOutputTokens: this.maxOutputTokens,
      ...params.config,
    };

    return client.models.generateContentStream({
      model: modelToUse,
      contents: params.contents as any,
      config,
    });
  }
}

/**
 * Singleton Gemini client configured from the application environment.
 */
export const geminiClient = new GeminiClient();
