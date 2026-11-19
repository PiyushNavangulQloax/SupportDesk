import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { GeminiClient } from "../src/ai/gemini.client.js";
import { AiServiceUnavailableError } from "../src/errors/appError.js";
import { envSchema } from "../src/config/env.js";
import type { GoogleGenAI } from "@google/genai";

describe("Gemini Client & Configuration Unit Tests (Day 16)", () => {
  const dummyDbUrl = "postgresql://user:pass@localhost:5432/db";
  const dummyJwtSecret = "this_is_a_very_secure_jwt_secret_with_32_chars!";

  describe("1. Environment Schema Configuration (envSchema)", () => {
    it("accepts valid Gemini environment variables", () => {
      const parsed = envSchema.safeParse({
        DATABASE_URL: dummyDbUrl,
        PORT: 5000,
        JWT_SECRET: dummyJwtSecret,
        GEMINI_API_KEY: "dummy-test-key-12345",
        AI_MODEL: "gemini-3.5-flash-lite",
        AI_MAX_OUTPUT_TOKENS: 2048,
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.GEMINI_API_KEY).toBe("dummy-test-key-12345");
        expect(parsed.data.AI_MODEL).toBe("gemini-3.5-flash-lite");
        expect(parsed.data.AI_MAX_OUTPUT_TOKENS).toBe(2048);
      }
    });

    it("defaults AI_MODEL to 'gemini-3.5-flash-lite' and AI_MAX_OUTPUT_TOKENS to 1000 when omitted", () => {
      const parsed = envSchema.safeParse({
        DATABASE_URL: dummyDbUrl,
        PORT: 5000,
        JWT_SECRET: dummyJwtSecret,
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.GEMINI_API_KEY).toBeUndefined();
        expect(parsed.data.AI_MODEL).toBe("gemini-3.5-flash-lite");
        expect(parsed.data.AI_MAX_OUTPUT_TOKENS).toBe(1000);
      }
    });

    it("rejects non-positive AI_MAX_OUTPUT_TOKENS", () => {
      const parsed = envSchema.safeParse({
        DATABASE_URL: dummyDbUrl,
        PORT: 5000,
        JWT_SECRET: dummyJwtSecret,
        AI_MAX_OUTPUT_TOKENS: -10,
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues.some((i) => i.path.includes("AI_MAX_OUTPUT_TOKENS"))).toBe(true);
      }
    });

    it("rejects non-numeric AI_MAX_OUTPUT_TOKENS", () => {
      const parsed = envSchema.safeParse({
        DATABASE_URL: dummyDbUrl,
        PORT: 5000,
        JWT_SECRET: dummyJwtSecret,
        AI_MAX_OUTPUT_TOKENS: "not-a-number",
      });

      expect(parsed.success).toBe(false);
    });
  });

  describe("2. Unconfigured Client & Missing API Key Behavior", () => {
    it("reports isConfigured() as false when API key is missing or blank", () => {
      const clientWithoutKey = new GeminiClient({ apiKey: "" });
      expect(clientWithoutKey.isConfigured()).toBe(false);

      const clientWithWhitespaceKey = new GeminiClient({ apiKey: "   \t\n  " });
      expect(clientWithWhitespaceKey.isConfigured()).toBe(false);

      const clientWithUndefinedKey = new GeminiClient({ apiKey: undefined });
      expect(clientWithUndefinedKey.isConfigured()).toBe(false);
    });

    it("throws controlled 503 AiServiceUnavailableError when getSdkClient() is requested without key", () => {
      const client = new GeminiClient({ apiKey: "" });

      expect(() => client.getSdkClient()).toThrow(AiServiceUnavailableError);
      try {
        client.getSdkClient();
      } catch (err) {
        expect(err).toBeInstanceOf(AiServiceUnavailableError);
        const appErr = err as AiServiceUnavailableError;
        expect(appErr.statusCode).toBe(503);
        expect(appErr.code).toBe("AI_SERVICE_UNAVAILABLE");
        expect(appErr.message).toContain("GEMINI_API_KEY is not configured");
      }
    });

    it("generateContent rejects with 503 error when unconfigured", async () => {
      const client = new GeminiClient({ apiKey: "" });
      await expect(
        client.generateContent({ contents: "Hello" })
      ).rejects.toThrow(AiServiceUnavailableError);
    });

    it("generateContentStream rejects with 503 error when unconfigured", async () => {
      const client = new GeminiClient({ apiKey: "" });
      await expect(
        client.generateContentStream({ contents: "Hello" })
      ).rejects.toThrow(AiServiceUnavailableError);
    });
  });

  describe("3. Client Initialization & Configuration Options", () => {
    it("reports isConfigured() as true when a non-empty key is provided", () => {
      const client = new GeminiClient({ apiKey: "test-fake-key" });
      expect(client.isConfigured()).toBe(true);
    });

    it("respects custom model and maxOutputTokens options", () => {
      const client = new GeminiClient({
        apiKey: "test-fake-key",
        model: "custom-gemini-model",
        maxOutputTokens: 4096,
      });

      expect(client.model).toBe("custom-gemini-model");
      expect(client.maxOutputTokens).toBe(4096);
    });

    it("lazily initializes and caches GoogleGenAI instance on first access", () => {
      const client = new GeminiClient({ apiKey: "fake-key-for-init-test" });
      const sdkInstance1 = client.getSdkClient();
      const sdkInstance2 = client.getSdkClient();

      expect(sdkInstance1).toBeDefined();
      expect(sdkInstance1).toBe(sdkInstance2);
    });
  });

  describe("4. Mocked SDK Client Execution (Zero Live API Calls)", () => {
    let mockGenerateContent: jest.Mock;
    let mockGenerateContentStream: jest.Mock;
    let mockSdkClient: GoogleGenAI;
    let client: GeminiClient;

    beforeEach(() => {
      mockGenerateContent = jest.fn();
      mockGenerateContentStream = jest.fn();

      mockSdkClient = {
        models: {
          generateContent: mockGenerateContent,
          generateContentStream: mockGenerateContentStream,
        },
      } as unknown as GoogleGenAI;

      client = new GeminiClient(
        {
          model: "gemini-3.5-flash-lite",
          maxOutputTokens: 1000,
        },
        mockSdkClient
      );
    });

    it("delegates generateContent to SDK with default model and maxOutputTokens", async () => {
      const expectedResponse = {
        text: "Draft response from Gemini",
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
      };
      mockGenerateContent.mockResolvedValueOnce(expectedResponse);

      const result = await client.generateContent({
        contents: "Suggest a response for ticket",
      });

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: "gemini-3.5-flash-lite",
        contents: "Suggest a response for ticket",
        config: {
          maxOutputTokens: 1000,
        },
      });
      expect(result).toBe(expectedResponse);
    });

    it("delegates generateContentStream to SDK with default model and merged config", async () => {
      const mockStreamResult = {
        [Symbol.asyncIterator]: async function* () {
          yield { text: "Chunk 1" };
          yield { text: "Chunk 2" };
        },
      };
      mockGenerateContentStream.mockResolvedValueOnce(mockStreamResult);

      const result = await client.generateContentStream({
        contents: "Stream reply",
        config: {
          temperature: 0.2,
        },
      });

      expect(mockGenerateContentStream).toHaveBeenCalledTimes(1);
      expect(mockGenerateContentStream).toHaveBeenCalledWith({
        model: "gemini-3.5-flash-lite",
        contents: "Stream reply",
        config: {
          maxOutputTokens: 1000,
          temperature: 0.2,
        },
      });
      expect(result).toBe(mockStreamResult);
    });

    it("allows overriding model per call in generateContent", async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: "Done" });

      await client.generateContent({
        model: "override-model-id",
        contents: "Categorize ticket",
      });

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "override-model-id",
        })
      );
    });
  });
});
