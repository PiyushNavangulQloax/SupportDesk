/**
 * SupportDesk AI Guardrails - AI Evaluation Harness Specification
 *
 * Verifies that the evaluation harness:
 * 1. Uses the real production AiService.categorizeTicket() pipeline.
 * 2. Does NOT use hardcoded heuristics to fake model accuracy.
 * 3. Records provider failures as failures, never converting them to successes.
 * 4. Rejects invalid model outputs adhering to Zod schema validation.
 * 5. Blocks live evaluation when API credentials are missing.
 * 6. Correctly identifies mock results and synthetic datasets as BLOCKED for official acceptance.
 * 7. Correctly calculates category, priority, and combined accuracy metrics.
 */

import { jest } from "@jest/globals";
import {
  runCategorizationEvaluation,
  generateMarkdownReport,
  MockEvaluationGeminiClient,
  type EvaluationSummary,
} from "../src/ai/evaluation/evaluateCategorization.js";
import { GeminiClient } from "../src/ai/gemini.client.js";
import { AiService } from "../src/ai/ai.service.js";
import type { EvaluationTicket } from "../src/ai/datasets/evaluationTickets.js";

describe("Day 17 — AI Categorization Evaluation Harness", () => {
  const sampleTickets: EvaluationTicket[] = [
    {
      id: "TEST-001",
      title: "Production checkout error 500",
      description: "Checkout fails on POST /api/checkout",
      expectedCategory: "Technical",
      expectedPriority: "P1",
      rationale: "Outage",
    },
    {
      id: "TEST-002",
      title: "Invoice duplicate charge",
      description: "Charged twice for subscription",
      expectedCategory: "Billing",
      expectedPriority: "P2",
      rationale: "Duplicate billing",
    },
    {
      id: "TEST-003",
      title: "Reset password link not received",
      description: "Need password reset link",
      expectedCategory: "Account",
      expectedPriority: "P3",
      rationale: "Auth issue",
    },
    {
      id: "TEST-004",
      title: "Export tickets to CSV",
      description: "Requesting export button for reports",
      expectedCategory: "Feature Request",
      expectedPriority: "P4",
      rationale: "Feature enhancement",
    },
  ];

  it("1. verifies evaluation calls the production AiService pipeline end-to-end", async () => {
    let aiServiceCalls = 0;
    const mockClient = new MockEvaluationGeminiClient((prompt) => {
      // Prompt must include the production XML tags and guardrail directives
      expect(prompt).toContain("<untrusted_ticket_data>");
      expect(prompt).toContain("</untrusted_ticket_data>");
      return {
        category: "Technical",
        priority: "P1",
        reasoning: "Valid response from mock provider.",
      };
    });

    const summary = await runCategorizationEvaluation({
      mode: "MOCK",
      dataset: [sampleTickets[0]],
      client: mockClient,
    });

    expect(summary.total).toBe(1);
    expect(summary.successfulPredictions).toBe(1);
    expect(summary.failedPredictions).toBe(0);
    expect(summary.results[0].predictedCategory).toBe("Technical");
    expect(summary.results[0].predictedPriority).toBe("P1");
    expect(summary.results[0].categoryMatch).toBe(true);
    expect(summary.results[0].priorityMatch).toBe(true);
    expect(summary.results[0].combinedMatch).toBe(true);
  });

  it("2. records provider failures as failures and never converts them to successful heuristic predictions", async () => {
    class FailingGeminiClient extends GeminiClient {
      constructor() {
        super({ apiKey: "mock-fail-key" });
      }
      override async generateContent(): Promise<any> {
        throw new Error("Provider connection refused (simulated 503)");
      }
    }

    const summary = await runCategorizationEvaluation({
      mode: "MOCK",
      dataset: sampleTickets,
      client: new FailingGeminiClient(),
    });

    expect(summary.total).toBe(4);
    expect(summary.successfulPredictions).toBe(0);
    expect(summary.failedPredictions).toBe(4);
    expect(summary.categoryCorrect).toBe(0);
    expect(summary.priorityCorrect).toBe(0);
    expect(summary.combinedCorrect).toBe(0);
    expect(summary.categoryAccuracyPercent).toBe(0);
    expect(summary.failureReasons).toHaveLength(4);
    expect(summary.failureReasons[0].error).toContain("AI unavailable — reply manually.");

    // Must NOT contain heuristic match badges
    summary.results.forEach((r) => {
      expect(r.success).toBe(false);
      expect(r.categoryMatch).toBe(false);
      expect(r.priorityMatch).toBe(false);
      expect(r.combinedMatch).toBe(false);
    });
  });

  it("3. records invalid/malformed model responses as evaluation failures", async () => {
    class MalformedOutputGeminiClient extends GeminiClient {
      constructor() {
        super({ apiKey: "mock-malformed-key" });
      }
      override async generateContent(): Promise<any> {
        // Returns invalid category and invalid priority tier
        return {
          text: JSON.stringify({
            category: "NON_EXISTENT_CATEGORY",
            priority: "P99_INVALID",
            reasoning: "Malformed output",
          }),
        };
      }
    }

    const summary = await runCategorizationEvaluation({
      mode: "MOCK",
      dataset: [sampleTickets[0]],
      client: new MalformedOutputGeminiClient(),
    });

    expect(summary.total).toBe(1);
    expect(summary.successfulPredictions).toBe(0);
    expect(summary.failedPredictions).toBe(1);
    expect(summary.results[0].success).toBe(false);
    expect(summary.failureReasons[0].error).toContain("AI unavailable — reply manually.");
  });

  it("4. blocks live evaluation when credentials are missing and does not compute live accuracy", async () => {
    class UnconfiguredGeminiClient extends GeminiClient {
      constructor() {
        super({ apiKey: undefined });
      }
      override isConfigured(): boolean {
        return false;
      }
    }

    const summary = await runCategorizationEvaluation({
      mode: "LIVE",
      dataset: sampleTickets,
      client: new UnconfiguredGeminiClient(),
    });

    expect(summary.mode).toBe("LIVE");
    expect(summary.isBlocked).toBe(true);
    expect(summary.blockReason).toContain("GEMINI_API_KEY is not configured or missing");
    expect(summary.categoryAccuracyPercent).toBe(0);
    expect(summary.priorityAccuracyPercent).toBe(0);
    expect(summary.results).toHaveLength(0);

    const markdown = generateMarkdownReport(summary);
    expect(markdown).toContain("LIVE MODEL EVALUATION BLOCKED");
    expect(markdown).toContain("Reason: GEMINI_API_KEY is not configured");
  });

  it("5. labels mock mode results with mode MOCK and includes mock warning in generated report", async () => {
    const summary = await runCategorizationEvaluation({
      mode: "MOCK",
      dataset: [sampleTickets[0]],
    });

    expect(summary.mode).toBe("MOCK");
    const markdown = generateMarkdownReport(summary);

    expect(markdown).toContain("MOCK PIPELINE VERIFICATION RUN");
    expect(markdown).toContain("These results do NOT represent real AI model accuracy and cannot be used for acceptance.");
  });

  it("6. ensures synthetic dataset results explicitly state official evaluation is BLOCKED", async () => {
    const summary = await runCategorizationEvaluation({
      mode: "MOCK",
      dataset: sampleTickets,
    });

    expect(summary.datasetOrigin).toBe("synthetic");
    expect(summary.isOfficialDataset).toBe(false);

    const markdown = generateMarkdownReport(summary);
    expect(markdown).toContain("Official acceptance evaluation: BLOCKED — awaiting project lead's labelled dataset.");
    expect(markdown).toContain("Target Accuracy:");
    expect(markdown).toContain("(Requires official lead dataset and live model evaluation)");
    expect(markdown).not.toContain("Target Exceeded");
  });

  it("7. calculates category, priority, and combined accuracy accurately", async () => {
    // 4 tickets with predictable responses based on prompt text:
    // TEST-001: matches Category (Technical), matches Priority (P1) -> Combined match (1/4)
    // TEST-002: matches Category (Billing), mismatches Priority (P4) -> Cat only (2/4)
    // TEST-003: mismatches Category (Technical), matches Priority (P3) -> Pri only (2/4)
    // TEST-004: mismatches Category (General), mismatches Priority (P1) -> Neither
    const mockClient = new MockEvaluationGeminiClient((prompt) => {
      if (prompt.includes("checkout")) {
        return { category: "Technical", priority: "P1", reasoning: "Testing metrics" };
      }
      if (prompt.includes("duplicate charge")) {
        return { category: "Billing", priority: "P4", reasoning: "Testing metrics" };
      }
      if (prompt.includes("password reset")) {
        return { category: "Technical", priority: "P3", reasoning: "Testing metrics" };
      }
      return { category: "General", priority: "P1", reasoning: "Fallback" };
    });

    const summary = await runCategorizationEvaluation({
      mode: "MOCK",
      dataset: sampleTickets,
      client: mockClient,
    });

    expect(summary.total).toBe(4);
    // Category matches: TEST-001 (Technical) and TEST-002 (Billing) = 2/4 = 50%
    expect(summary.categoryCorrect).toBe(2);
    expect(summary.categoryAccuracyPercent).toBe(50);

    // Priority matches: TEST-001 (P1) and TEST-003 (P3) = 2/4 = 50%
    expect(summary.priorityCorrect).toBe(2);
    expect(summary.priorityAccuracyPercent).toBe(50);

    // Combined matches: only TEST-001 = 1/4 = 25%
    expect(summary.combinedCorrect).toBe(1);
    expect(summary.combinedAccuracyPercent).toBe(25);
  });
});
