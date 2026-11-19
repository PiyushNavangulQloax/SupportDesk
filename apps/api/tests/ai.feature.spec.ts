import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { AiService } from "../src/ai/ai.service.js";
import { AiController } from "../src/controllers/ai.controller.js";
import { GeminiClient } from "../src/ai/gemini.client.js";
import { TicketsRepository, type TicketRecord } from "../src/repositories/tickets.repository.js";
import { CommentsRepository, type CommentRecord } from "../src/repositories/comments.repository.js";
import { NotFoundError, AppError, UnauthorizedError, ForbiddenError, AiServiceUnavailableError } from "../src/errors/appError.js";
import { UserRole } from "../src/generated/prisma/enums.js";
import { authorize } from "../src/middleware/auth.middleware.js";
import type { AuthenticatedUser } from "../src/types/express.js";
import { EventEmitter } from "node:events";
import {
  calculateEstimatedCostUsd,
  ACTIVE_MODEL_PRICING,
  HISTORICAL_MODEL_PRICING,
} from "../src/ai/pricing.js";

describe("Day 16 — AI Feature Backend Implementation & Quality Gates", () => {
  let mockGeminiClient: jest.Mocked<GeminiClient>;
  let mockTicketsRepo: jest.Mocked<TicketsRepository>;
  let mockCommentsRepo: jest.Mocked<CommentsRepository>;
  let service: AiService;
  let controller: AiController;

  const agentUser: AuthenticatedUser = {
    id: "agent-1",
    email: "agent@supportdesk.internal",
    role: UserRole.AGENT,
  };

  const adminUser: AuthenticatedUser = {
    id: "admin-1",
    email: "admin@supportdesk.internal",
    role: UserRole.ADMIN,
  };

  const customerUser: AuthenticatedUser = {
    id: "cust-1",
    email: "customer@example.com",
    role: UserRole.CUSTOMER,
  };

  const sampleTicket: TicketRecord = {
    id: "00000000-0000-0000-0000-000000000001",
    title: "Cannot access billing portal after password reset",
    description: "Every time I attempt to login to invoices, it gives error 403 forbidden.",
    status: "OPEN" as any,
    priority: "P2" as any,
    category: "Billing",
    createdById: "cust-1",
    assigneeId: "agent-1",
    slaDueAt: null,
    createdAt: new Date("2026-11-17T08:00:00Z"),
    updatedAt: new Date("2026-11-17T08:30:00Z"),
    createdBy: {
      id: "cust-1",
      name: "Alice Customer",
      email: "customer@example.com",
    } as any,
  };

  const samplePublicComments: CommentRecord[] = [
    {
      id: "c-1",
      ticketId: sampleTicket.id,
      authorId: "cust-1",
      body: "Here is a screenshot of the 403 error page.",
      isInternal: false,
      createdAt: new Date("2026-11-17T08:05:00Z"),
      updatedAt: new Date("2026-11-17T08:05:00Z"),
      author: { name: "Alice Customer", role: "CUSTOMER" } as any,
    },
    {
      id: "c-2",
      ticketId: sampleTicket.id,
      authorId: "agent-1",
      body: "Thanks Alice, we are investigating the IAM permissions for your billing account.",
      isInternal: false,
      createdAt: new Date("2026-11-17T08:10:00Z"),
      updatedAt: new Date("2026-11-17T08:10:00Z"),
      author: { name: "Agent Bob", role: "AGENT" } as any,
    },
  ];

  beforeEach(() => {
    mockGeminiClient = {
      model: "gemini-3.5-flash-lite",
      maxOutputTokens: 1000,
      isConfigured: jest.fn().mockReturnValue(true),
      getSdkClient: jest.fn(),
      generateContent: jest.fn(),
      generateContentStream: jest.fn(),
    } as unknown as jest.Mocked<GeminiClient>;

    mockTicketsRepo = {
      findById: jest.fn().mockResolvedValue(sampleTicket),
      update: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      countRelations: jest.fn(),
    } as unknown as jest.Mocked<TicketsRepository>;

    mockCommentsRepo = {
      findByTicketId: jest.fn().mockResolvedValue(samplePublicComments),
      create: jest.fn(),
    } as unknown as jest.Mocked<CommentsRepository>;

    service = new AiService(mockGeminiClient, mockTicketsRepo, mockCommentsRepo);
    controller = new AiController(service);
  });

  describe("1. Feature A: Suggest Reply Service Logic", () => {
    it("successfully creates stream handle using ticket details and public comments only", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { text: "Hello Alice," };
          yield { text: " We have resolved the billing issue." };
        },
      };
      mockGeminiClient.generateContentStream.mockResolvedValueOnce(mockStream as any);

      const handle = await service.suggestReplyStream(sampleTicket.id, agentUser);

      expect(mockTicketsRepo.findById).toHaveBeenCalledWith(sampleTicket.id);
      // Ensures includeInternal is strictly false to prevent private staff notes leak
      expect(mockCommentsRepo.findByTicketId).toHaveBeenCalledWith(sampleTicket.id, false);
      expect(mockGeminiClient.generateContentStream).toHaveBeenCalledTimes(1);

      const callArgs = mockGeminiClient.generateContentStream.mock.calls[0][0];
      expect(callArgs.contents).toContain("Cannot access billing portal");
      expect(callArgs.contents).toContain("Alice Customer");
      expect(callArgs.contents).toContain("Here is a screenshot of the 403 error page");
      // Privacy verification: customer email must NOT be included in the prompt
      expect(callArgs.contents).not.toContain("customer@example.com");

      // Verify no persistence or auto-sending occurred
      expect(mockTicketsRepo.update).not.toHaveBeenCalled();
      expect(mockCommentsRepo.create).not.toHaveBeenCalled();

      // Test completion handler metadata logging
      const usageMetadata = { promptTokenCount: 150, candidatesTokenCount: 60, totalTokenCount: 210 };
      const metrics = handle.onComplete(usageMetadata, true);

      expect(metrics.promptTokens).toBe(150);
      expect(metrics.candidatesTokens).toBe(60);
      expect(metrics.totalTokens).toBe(210);
      expect(metrics.estimatedCostUsd).toBeGreaterThan(0);
      expect(metrics.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("throws NotFoundError when ticket does not exist", async () => {
      mockTicketsRepo.findById.mockResolvedValueOnce(null);

      await expect(
        service.suggestReplyStream("non-existent-id", agentUser)
      ).rejects.toThrow(NotFoundError);
    });

    it("throws AiServiceUnavailableError when Gemini client is not configured", async () => {
      mockGeminiClient.generateContentStream.mockRejectedValueOnce(
        new AiServiceUnavailableError()
      );

      await expect(
        service.suggestReplyStream(sampleTicket.id, agentUser)
      ).rejects.toThrow(AiServiceUnavailableError);
    });

    it("handles provider failure gracefully during stream initiation", async () => {
      mockGeminiClient.generateContentStream.mockRejectedValueOnce(
        new Error("Gemini quota exceeded or server timeout")
      );

      await expect(
        service.suggestReplyStream(sampleTicket.id, agentUser)
      ).rejects.toThrow("Gemini quota exceeded or server timeout");
    });
  });

  describe("2. Feature B: Auto-Categorisation & Priority Service Logic", () => {
    it("successfully generates structured category, priority, and reasoning", async () => {
      const mockApiResponse = {
        text: JSON.stringify({
          category: "Billing",
          priority: "P2",
          reasoning: "The customer cannot access invoice management due to an authentication error.",
        }),
        usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 30, totalTokenCount: 110 },
      };
      mockGeminiClient.generateContent.mockResolvedValueOnce(mockApiResponse as any);

      const result = await service.categorizeTicket(sampleTicket.id, agentUser);

      expect(mockTicketsRepo.findById).toHaveBeenCalledWith(sampleTicket.id);
      expect(mockGeminiClient.generateContent).toHaveBeenCalledTimes(1);

      const categorizeArgs = mockGeminiClient.generateContent.mock.calls[0][0];
      // Prompt privacy check: ticket title and description are present, but customer PII is omitted
      expect(categorizeArgs.contents).toContain("Cannot access billing portal");
      expect(categorizeArgs.contents).not.toContain("Alice Customer");
      expect(categorizeArgs.contents).not.toContain("customer@example.com");

      expect(result.data.category).toBe("Billing");
      expect(result.data.priority).toBe("P2");
      expect(result.data.reasoning).toContain("authentication error");

      expect(result.meta.usage.totalTokens).toBe(110);
      expect(result.meta.usage.estimatedCostUsd).toBeGreaterThan(0);

      // Verify no persistence or auto-save occurred
      expect(mockTicketsRepo.update).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when ticket does not exist", async () => {
      mockTicketsRepo.findById.mockResolvedValueOnce(null);

      await expect(
        service.categorizeTicket("non-existent-id", agentUser)
      ).rejects.toThrow(NotFoundError);
    });

    it("rejects non-JSON output from AI provider with 502 AI_INVALID_OUTPUT", async () => {
      mockGeminiClient.generateContent.mockResolvedValueOnce({
        text: "I am unable to classify this ticket right now.",
      } as any);

      try {
        await service.categorizeTicket(sampleTicket.id, agentUser);
        throw new Error("Expected call to throw");
      } catch (err: any) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(502);
        expect(err.code).toBe("AI_INVALID_OUTPUT");
      }
    });

    it("rejects invalid schema output (invalid category) with 502 AI_SCHEMA_VALIDATION_ERROR", async () => {
      mockGeminiClient.generateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          category: "NonExistentCategory",
          priority: "P2",
          reasoning: "Some reasoning",
        }),
      } as any);

      try {
        await service.categorizeTicket(sampleTicket.id, agentUser);
        throw new Error("Should have thrown validation error");
      } catch (err: any) {
        expect(err.statusCode).toBe(502);
        expect(err.code).toBe("AI_SCHEMA_VALIDATION_ERROR");
      }

      // Verify ticket was not modified
      expect(mockTicketsRepo.update).not.toHaveBeenCalled();
    });

    it("rejects invalid schema output (invalid priority P99) with 502 error", async () => {
      mockGeminiClient.generateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          category: "Technical",
          priority: "P99",
          reasoning: "Invalid priority code",
        }),
      } as any);

      await expect(
        service.categorizeTicket(sampleTicket.id, agentUser)
      ).rejects.toThrow(AppError);
    });
  });

  describe("3. HTTP Controller & SSE Streaming Delivery", () => {
    it("suggestReply sets SSE headers and streams chunks with completion event", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { text: "Chunk 1" };
          yield { text: "Chunk 2", usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 } };
        },
      };
      mockGeminiClient.generateContentStream.mockResolvedValueOnce(mockStream as any);

      const writtenData: string[] = [];
      const setHeaders: Record<string, string> = {};

      const req: any = Object.assign(new EventEmitter(), {
        params: { id: sampleTicket.id },
        user: agentUser,
        body: {},
      });

      const res: any = Object.assign(new EventEmitter(), {
        headersSent: false,
        writableEnded: false,
        setHeader: jest.fn((k: string, v: string) => {
          setHeaders[k.toLowerCase()] = v;
        }),
        flushHeaders: jest.fn(),
        write: jest.fn((data: string) => {
          writtenData.push(data);
          res.headersSent = true;
          return true;
        }),
        end: jest.fn(() => {
          res.writableEnded = true;
        }),
      });

      const next = jest.fn();

      await controller.suggestReply(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream; charset=utf-8");
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache, no-transform");
      expect(res.setHeader).toHaveBeenCalledWith("Connection", "keep-alive");

      // Verify streamed chunks
      expect(writtenData.some((chunk) => chunk.includes("Chunk 1"))).toBe(true);
      expect(writtenData.some((chunk) => chunk.includes("Chunk 2"))).toBe(true);
      expect(writtenData.some((chunk) => chunk.includes('"done":true'))).toBe(true);
      expect(writtenData.some((chunk) => chunk.includes("[DONE]"))).toBe(true);
      expect(res.end).toHaveBeenCalledTimes(1);
    });

    it("handles missing usage metadata cleanly by setting estimatedCostUsd to undefined", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { text: "Chunk without metadata" };
        },
      };
      mockGeminiClient.generateContentStream.mockResolvedValueOnce(mockStream as any);

      const handle = await service.suggestReplyStream(sampleTicket.id, agentUser);
      // Simulate stream completion without usageMetadata
      const metrics = handle.onComplete(undefined, true);

      expect(metrics.promptTokens).toBeUndefined();
      expect(metrics.candidatesTokens).toBeUndefined();
      expect(metrics.totalTokens).toBeUndefined();
      expect(metrics.estimatedCostUsd).toBeUndefined();
      expect(metrics.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("handles client disconnect during stream by halting delivery using res.on('close')", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { text: "First chunk" };
          yield { text: "Second chunk" };
        },
      };
      mockGeminiClient.generateContentStream.mockResolvedValueOnce(mockStream as any);

      const req: any = {
        params: { id: sampleTicket.id },
        user: agentUser,
        body: {},
      };

      const writtenData: string[] = [];
      const res: any = Object.assign(new EventEmitter(), {
        headersSent: false,
        writableEnded: false,
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn((chunk: string) => {
          writtenData.push(chunk);
          // Simulate client closing connection prematurely after first chunk
          res.emit("close");
          return true;
        }),
        end: jest.fn(() => {
          res.writableEnded = true;
        }),
      });

      const next = jest.fn();

      await controller.suggestReply(req, res, next);

      // Verify stream stopped early and did not emit second chunk
      expect(writtenData.some((d) => d.includes("First chunk"))).toBe(true);
      expect(writtenData.some((d) => d.includes("Second chunk"))).toBe(false);
      expect(writtenData.some((d) => d.includes('"done":true'))).toBe(false);
    });

    it("does not abort streaming when req stream finishes uploading (req.on('close'))", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { text: "Normal chunk 1" };
          yield { text: "Normal chunk 2" };
        },
      };
      mockGeminiClient.generateContentStream.mockResolvedValueOnce(mockStream as any);

      const req: any = Object.assign(new EventEmitter(), {
        params: { id: sampleTicket.id },
        user: agentUser,
        body: { instructions: "Be polite" },
      });

      const writtenData: string[] = [];
      const res: any = Object.assign(new EventEmitter(), {
        headersSent: false,
        writableEnded: false,
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn((chunk: string) => {
          writtenData.push(chunk);
          // Simulate req body stream close
          req.emit("close");
          return true;
        }),
        end: jest.fn(() => {
          res.writableEnded = true;
        }),
      });

      const next = jest.fn();

      await controller.suggestReply(req, res, next);

      // Verify both chunks were written despite req close
      expect(writtenData.some((d) => d.includes("Normal chunk 1"))).toBe(true);
      expect(writtenData.some((d) => d.includes("Normal chunk 2"))).toBe(true);
      expect(writtenData.some((d) => d.includes('"done":true'))).toBe(true);
    });

    it("categorizeTicket returns 200 with standard envelope", async () => {
      mockGeminiClient.generateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          category: "Technical",
          priority: "P1",
          reasoning: "Database unreachable",
        }),
        usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 25, totalTokenCount: 75 },
      } as any);

      const req: any = {
        params: { id: sampleTicket.id },
        user: agentUser,
      };

      let responseStatus = 0;
      let responseBody: any = null;

      const res: any = {
        status: jest.fn((s: number) => {
          responseStatus = s;
          return res;
        }),
        json: jest.fn((body: any) => {
          responseBody = body;
          return res;
        }),
      };

      const next = jest.fn();

      await controller.categorizeTicket(req, res, next);

      expect(responseStatus).toBe(200);
      expect(responseBody.error).toBeNull();
      expect(responseBody.data.category).toBe("Technical");
      expect(responseBody.data.priority).toBe("P1");
      expect(responseBody.meta.model).toBe("gemini-3.5-flash-lite");
      expect(responseBody.meta.usage.totalTokens).toBe(75);
    });

    it("rejects unauthenticated requests with 401 UnauthorizedError", async () => {
      const req: any = {
        params: { id: sampleTicket.id },
        user: undefined, // No user
      };

      const next = jest.fn();

      await controller.suggestReply(req, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));

      const next2 = jest.fn();
      await controller.categorizeTicket(req, {} as any, next2);
      expect(next2).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  describe("4. Role-Based Access Control (RBAC) & Tenant Security", () => {
    it("rejects CUSTOMER role with 403 Forbidden via authorize middleware", () => {
      const rbacMiddleware = authorize(UserRole.AGENT, UserRole.ADMIN);

      const req: any = { user: customerUser };
      let capturedError: any = null;

      rbacMiddleware(req, {} as any, (err?: any) => {
        capturedError = err;
      });

      expect(capturedError).toBeInstanceOf(ForbiddenError);
      expect(capturedError.statusCode).toBe(403);
      expect(capturedError.code).toBe("FORBIDDEN");
      expect(capturedError.message).toContain("user role 'CUSTOMER' is not permitted");
    });

    it("allows AGENT and ADMIN roles through authorize middleware", () => {
      const rbacMiddleware = authorize(UserRole.AGENT, UserRole.ADMIN);

      let agentNextCalled = false;
      rbacMiddleware({ user: agentUser } as any, {} as any, () => {
        agentNextCalled = true;
      });
      expect(agentNextCalled).toBe(true);

      let adminNextCalled = false;
      rbacMiddleware({ user: adminUser } as any, {} as any, () => {
        adminNextCalled = true;
      });
      expect(adminNextCalled).toBe(true);
    });
  });

  describe("5. Pricing Calculation & Model Lifecycle Quality Gates", () => {
    it("verifies gemini-3.5-flash-lite active pricing ($0.30/1M input, $2.50/1M output)", () => {
      expect(ACTIVE_MODEL_PRICING["gemini-3.5-flash-lite"]).toBeDefined();
      expect(ACTIVE_MODEL_PRICING["gemini-3.5-flash-lite"].status).toBe("ACTIVE");
      expect(ACTIVE_MODEL_PRICING["gemini-3.5-flash-lite"].inputPerMillion).toBe(0.30);
      expect(ACTIVE_MODEL_PRICING["gemini-3.5-flash-lite"].outputPerMillion).toBe(2.50);

      // 100,000 prompt tokens = $0.03
      // 10,000 candidate tokens = $0.025
      // Total = $0.055
      const cost = calculateEstimatedCostUsd("gemini-3.5-flash-lite", 100_000, 10_000);
      expect(cost).toBe(0.055);
    });

    it("verifies gemini-3.8-flash active pricing ($0.75/1M input, $3.75/1M output)", () => {
      expect(ACTIVE_MODEL_PRICING["gemini-3.8-flash"]).toBeDefined();
      expect(ACTIVE_MODEL_PRICING["gemini-3.8-flash"].status).toBe("ACTIVE");
      expect(ACTIVE_MODEL_PRICING["gemini-3.8-flash"].inputPerMillion).toBe(0.75);
      expect(ACTIVE_MODEL_PRICING["gemini-3.8-flash"].outputPerMillion).toBe(3.75);

      // 100,000 prompt tokens = $0.075
      // 10,000 candidate tokens = $0.0375
      // Total = $0.1125
      const cost = calculateEstimatedCostUsd("gemini-3.8-flash", 100_000, 10_000);
      expect(cost).toBe(0.1125);
    });

    it("refuses to calculate cost for access-restricted model (gemini-2.5-flash) and returns undefined", () => {
      expect(HISTORICAL_MODEL_PRICING["gemini-2.5-flash"]).toBeDefined();
      expect(HISTORICAL_MODEL_PRICING["gemini-2.5-flash"].status).toBe("ACCESS_RESTRICTED");

      // Access-restricted models must return undefined for active new project cost calculations
      const cost = calculateEstimatedCostUsd("gemini-2.5-flash", 1000, 500);
      expect(cost).toBeUndefined();
    });

    it("refuses to calculate cost for retired model (gemini-1.5-flash) and returns undefined", () => {
      expect(HISTORICAL_MODEL_PRICING["gemini-1.5-flash"]).toBeDefined();
      expect(HISTORICAL_MODEL_PRICING["gemini-1.5-flash"].status).toBe("RETIRED");

      const cost = calculateEstimatedCostUsd("gemini-1.5-flash", 1000, 500);
      expect(cost).toBeUndefined();
    });

    it("returns undefined for unknown or unsupported models", () => {
      const cost = calculateEstimatedCostUsd("non-existent-model", 1000, 500);
      expect(cost).toBeUndefined();
    });

    it("returns undefined when token counts are missing or undefined", () => {
      expect(calculateEstimatedCostUsd("gemini-3.5-flash-lite", undefined, 100)).toBeUndefined();
      expect(calculateEstimatedCostUsd("gemini-3.5-flash-lite", 100, undefined)).toBeUndefined();
      expect(calculateEstimatedCostUsd("gemini-3.5-flash-lite", undefined, undefined)).toBeUndefined();
    });
  });
});
