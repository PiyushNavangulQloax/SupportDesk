/**
 * SupportDesk AI Guardrails - AI Categorization Evaluation Harness
 *
 * Executes categorization evaluation using the production AiService pipeline.
 *
 * Key Principles:
 * - Always routes through AiService.categorizeTicket() to ensure production
 *   prompt construction, PII masking, content moderation, timeout handling,
 *   and Zod schema validation are executed.
 * - Explicitly separates LIVE model evaluation from MOCK pipeline verification.
 * - NEVER uses hardcoded offline heuristics to fabricate model accuracy scores.
 * - If provider calls fail or credentials are missing, reports genuine failures.
 * - If the official project lead dataset is unavailable, explicitly reports:
 *   "Official acceptance evaluation: BLOCKED — awaiting project lead's labelled dataset."
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EVALUATION_TICKETS, type EvaluationTicket } from "../datasets/evaluationTickets.js";
import { geminiClient, GeminiClient } from "../gemini.client.js";
import { AiService, type CategorizeTicketResult } from "../ai.service.js";
import type { TicketRecord } from "../../repositories/tickets.repository.js";
import { TicketStatus, TicketPriority } from "../../repositories/tickets.repository.js";
import type { CommentsRepository } from "../../repositories/comments.repository.js";
import type { AuthenticatedUser } from "../../types/express.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type EvaluationMode = "LIVE" | "MOCK";

export interface EvaluationItemResult {
  id: string;
  title: string;
  expectedCategory: string;
  expectedPriority: string;
  predictedCategory?: string;
  predictedPriority?: string;
  categoryMatch: boolean;
  priorityMatch: boolean;
  combinedMatch: boolean;
  success: boolean;
  reasoning?: string;
  error?: string;
  durationMs?: number;
}

export interface EvaluationSummary {
  mode: EvaluationMode;
  datasetOrigin: "synthetic" | "lead-provided" | "verified";
  isOfficialDataset: boolean;
  total: number;
  successfulPredictions: number;
  failedPredictions: number;
  categoryCorrect: number;
  categoryAccuracyPercent: number;
  priorityCorrect: number;
  priorityAccuracyPercent: number;
  combinedCorrect: number;
  combinedAccuracyPercent: number;
  results: EvaluationItemResult[];
  categoryBreakdown: Record<string, { total: number; correct: number; accuracy: number }>;
  failureReasons: { id: string; error: string }[];
  isBlocked?: boolean;
  blockReason?: string;
}

export interface EvaluationOptions {
  mode?: EvaluationMode;
  dataset?: EvaluationTicket[];
  aiService?: AiService;
  client?: GeminiClient;
  user?: AuthenticatedUser;
}

/**
 * In-memory tickets repository mapping evaluation tickets to TicketRecord
 * so AiService.categorizeTicket can query tickets in-memory.
 */
export class InMemoryEvaluationTicketsRepository {
  private readonly tickets = new Map<string, TicketRecord>();

  constructor(evaluationTickets: EvaluationTicket[]) {
    for (const t of evaluationTickets) {
      this.tickets.set(t.id, {
        id: t.id,
        title: t.title,
        description: t.description,
        status: TicketStatus.OPEN,
        priority: TicketPriority.P3,
        category: null,
        createdById: "eval-agent-id",
        assigneeId: null,
        slaDueAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: "eval-agent-id", name: "Evaluation Agent", email: "evaluator@supportdesk.local" },
      });
    }
  }

  async findById(id: string): Promise<TicketRecord | null> {
    return this.tickets.get(id) || null;
  }
}

/**
 * In-memory comments repository returning empty comments for evaluation tickets.
 */
export class InMemoryEvaluationCommentsRepository implements Partial<CommentsRepository> {
  async findByTicketId(): Promise<any[]> {
    return [];
  }
}

/**
 * Mock Gemini client used for offline CI and pipeline verification.
 * Always labels reasoning with [Mock Provider] to prevent conflation with real AI output.
 */
export class MockEvaluationGeminiClient extends GeminiClient {
  constructor(
    private readonly responseGenerator?: (
      promptText: string,
      ticketId?: string
    ) => { category: string; priority: string; reasoning: string }
  ) {
    super({ apiKey: "mock-evaluation-key" });
  }

  override async generateContent(params: any): Promise<any> {
    const promptStr = typeof params?.contents === "string" ? params.contents : JSON.stringify(params?.contents || "");

    if (this.responseGenerator) {
      const generated = this.responseGenerator(promptStr);
      return {
        text: JSON.stringify({
          category: generated.category,
          priority: generated.priority,
          reasoning: `[Mock Provider] ${generated.reasoning}`,
        }),
        usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 25, totalTokenCount: 75 },
      };
    }

    return {
      text: JSON.stringify({
        category: "General",
        priority: "P4",
        reasoning: "[Mock Provider] Standard mock verification output.",
      }),
      usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 25, totalTokenCount: 75 },
    };
  }
}

/**
 * Runs the categorization evaluation harness using the production AiService pipeline.
 */
export async function runCategorizationEvaluation(
  options: EvaluationOptions = {}
): Promise<EvaluationSummary> {
  const mode: EvaluationMode = options.mode || (process.argv.includes("--live") ? "LIVE" : "MOCK");
  const dataset = options.dataset || EVALUATION_TICKETS;
  const user: AuthenticatedUser = options.user || {
    id: "eval-agent-id",
    email: "evaluator@supportdesk.local",
    role: "AGENT",
  };

  // Check LIVE evaluation prerequisites
  const client = options.client || (mode === "LIVE" ? geminiClient : new MockEvaluationGeminiClient());

  if (mode === "LIVE" && !client.isConfigured()) {
    return {
      mode: "LIVE",
      datasetOrigin: "synthetic",
      isOfficialDataset: false,
      isBlocked: true,
      blockReason: "GEMINI_API_KEY is not configured or missing in environment. Live model evaluation blocked.",
      total: dataset.length,
      successfulPredictions: 0,
      failedPredictions: dataset.length,
      categoryCorrect: 0,
      categoryAccuracyPercent: 0,
      priorityCorrect: 0,
      priorityAccuracyPercent: 0,
      combinedCorrect: 0,
      combinedAccuracyPercent: 0,
      results: [],
      categoryBreakdown: {},
      failureReasons: [{ id: "ALL", error: "Missing GEMINI_API_KEY configuration." }],
    };
  }

  // Setup in-memory repositories for evaluation dataset
  const ticketsRepo = new InMemoryEvaluationTicketsRepository(dataset);
  const commentsRepo = new InMemoryEvaluationCommentsRepository();

  // Create AiService instance wired to production pipeline
  const aiService = options.aiService || new AiService(client, ticketsRepo as any, commentsRepo as any);

  const results: EvaluationItemResult[] = [];
  const failureReasons: { id: string; error: string }[] = [];

  for (const ticket of dataset) {
    const startTime = Date.now();
    try {
      // Invoke production AiService pipeline
      const response: CategorizeTicketResult = await aiService.categorizeTicket(ticket.id, user);
      const prediction = response.data;

      const categoryMatch = prediction.category === ticket.expectedCategory;
      const priorityMatch = prediction.priority === ticket.expectedPriority;
      const combinedMatch = categoryMatch && priorityMatch;

      results.push({
        id: ticket.id,
        title: ticket.title,
        expectedCategory: ticket.expectedCategory,
        expectedPriority: ticket.expectedPriority,
        predictedCategory: prediction.category,
        predictedPriority: prediction.priority,
        categoryMatch,
        priorityMatch,
        combinedMatch,
        success: true,
        reasoning: prediction.reasoning,
        durationMs: Date.now() - startTime,
      });
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message || String(err);
      failureReasons.push({ id: ticket.id, error: errorMsg });

      results.push({
        id: ticket.id,
        title: ticket.title,
        expectedCategory: ticket.expectedCategory,
        expectedPriority: ticket.expectedPriority,
        categoryMatch: false,
        priorityMatch: false,
        combinedMatch: false,
        success: false,
        error: errorMsg,
        durationMs: Date.now() - startTime,
      });
    }
  }

  const total = results.length;
  const successfulPredictions = results.filter((r) => r.success).length;
  const failedPredictions = results.filter((r) => !r.success).length;
  const categoryCorrect = results.filter((r) => r.categoryMatch).length;
  const priorityCorrect = results.filter((r) => r.priorityMatch).length;
  const combinedCorrect = results.filter((r) => r.combinedMatch).length;

  const categoryAccuracyPercent = total > 0 ? Math.round((categoryCorrect / total) * 100) : 0;
  const priorityAccuracyPercent = total > 0 ? Math.round((priorityCorrect / total) * 100) : 0;
  const combinedAccuracyPercent = total > 0 ? Math.round((combinedCorrect / total) * 100) : 0;

  // Breakdown per category
  const categoryBreakdown: Record<string, { total: number; correct: number; accuracy: number }> = {};
  for (const cat of ["Technical", "Billing", "Account", "General", "Feature Request"]) {
    const items = results.filter((r) => r.expectedCategory === cat);
    const correct = items.filter((r) => r.categoryMatch).length;
    categoryBreakdown[cat] = {
      total: items.length,
      correct,
      accuracy: items.length > 0 ? Math.round((correct / items.length) * 100) : 0,
    };
  }

  return {
    mode,
    datasetOrigin: "synthetic",
    isOfficialDataset: false,
    total,
    successfulPredictions,
    failedPredictions,
    categoryCorrect,
    categoryAccuracyPercent,
    priorityCorrect,
    priorityAccuracyPercent,
    combinedCorrect,
    combinedAccuracyPercent,
    results,
    categoryBreakdown,
    failureReasons,
  };
}

/**
 * Generates formatted Markdown report recording evaluation results.
 */
export function generateMarkdownReport(summary: EvaluationSummary): string {
  const isMock = summary.mode === "MOCK";

  const rows = summary.results
    .map((r) => {
      const pred = r.success
        ? `**${r.predictedCategory}** / ${r.predictedPriority}`
        : `*FAILED: ${r.error || "Provider Error"}*`;
      const matchBadge = !r.success
        ? "❌ FAILED"
        : r.combinedMatch
        ? "✅ MATCH"
        : r.categoryMatch
        ? "⚠️ CAT ONLY"
        : r.priorityMatch
        ? "⚠️ PRI ONLY"
        : "❌ MISMATCH";
      const reasoningText = r.success ? r.reasoning || "—" : `Error: ${r.error}`;

      return `| \`${r.id}\` | ${r.title.slice(0, 42)}... | **${r.expectedCategory}** / ${r.expectedPriority} | ${pred} | ${matchBadge} | ${reasoningText} |`;
    })
    .join("\n");

  const breakdownRows = Object.entries(summary.categoryBreakdown)
    .map(
      ([cat, stats]) =>
        `| **${cat}** | ${stats.total} | ${stats.correct} | **${stats.accuracy}%** |`
    )
    .join("\n");

  const failureRows =
    summary.failureReasons.length > 0
      ? summary.failureReasons
          .map((f) => `- Ticket \`${f.id}\`: ${f.error}`)
          .join("\n")
      : "_None. All ticket categorization calls completed without unhandled provider errors._";

  const modeWarning = isMock
    ? `> [!WARNING]
> **MOCK PIPELINE VERIFICATION RUN**
> This evaluation was executed using an offline mock provider for automated pipeline testing.
> It verifies that prompt construction, PII masking, content moderation, timeout handling, and Zod response validation function end-to-end.
> **These results do NOT represent real AI model accuracy and cannot be used for acceptance.**`
    : summary.isBlocked
    ? `> [!CAUTION]
> **LIVE MODEL EVALUATION BLOCKED**
> Reason: ${summary.blockReason}`
    : `> [!NOTE]
> **LIVE MODEL EVALUATION RUN**
> Executed against configured Google Gemini AI model via production \`AiService.categorizeTicket()\` pipeline.`;

  return `# SupportDesk Day 17 — AI Categorization Evaluation Report

- **Evaluation Date:** Wednesday, 25 November 2026
- **Evaluator Harness:** Production AI Pipeline (\`AiService.categorizeTicket\`)
- **Evaluation Mode:** \`${summary.mode === "LIVE" ? "LIVE_MODEL_EVALUATION" : "MOCK_PIPELINE_VERIFICATION"}\`
- **Dataset Origin:** Synthetic (${summary.total} self-authored tickets; project lead dataset missing)
- **Official Lead Dataset Available:** ❌ **No**
- **Official Acceptance Status:** **Official acceptance evaluation: BLOCKED — awaiting project lead's labelled dataset.**
- **Target Accuracy:** &ge; 80% (Requires official lead dataset and live model evaluation)

---

${modeWarning}

---

## 1. Executive Summary

The evaluation suite was executed through the production \`AiService.categorizeTicket()\` pipeline.
Every evaluation item exercised:
- Strict input length boundaries (\`MAX_TITLE_LENGTH = 255\`, \`MAX_DESCRIPTION_LENGTH = 4000\`)
- Pre-invocation content moderation (\`moderateContent\`)
- High-precision PII masking for Indian identifiers (PAN, Aadhaar, Bank accounts, Mobile) and global identifiers (SSN, Cards, Emails, IPs)
- Untrusted context boundary isolation (\`<untrusted_ticket_data>\`) with delimiter breakout protection (\`sanitizeDelimiters\`)
- 10-second request timeout handling (\`withTimeout\`)
- Strict Zod output schema enforcement (\`aiCategorizeResponseSchema\`)

### Summary Metrics:
| Metric | Value |
| :--- | :--- |
| **Evaluation Mode** | \`${summary.mode}\` |
| **Total Tickets Tested** | ${summary.total} |
| **Successful Pipeline Calls** | ${summary.successfulPredictions} / ${summary.total} |
| **Failed Pipeline Calls** | ${summary.failedPredictions} / ${summary.total} |
| **Category Classification Accuracy** | **${summary.categoryAccuracyPercent}%** (${summary.categoryCorrect}/${summary.total}) |
| **Priority Tier Accuracy** | **${summary.priorityAccuracyPercent}%** (${summary.priorityCorrect}/${summary.total}) |
| **Combined (Category + Priority) Accuracy** | **${summary.combinedAccuracyPercent}%** (${summary.combinedCorrect}/${summary.total}) |
| **Official Acceptance Status** | **BLOCKED (Awaiting project lead's labelled dataset)** |

---

## 2. Category Performance Breakdown

| Category | Total Tickets | Correct Predictions | Accuracy |
| :--- | :---: | :---: | :---: |
${breakdownRows}

---

## 3. Detailed Results per Ticket

| Ticket ID | Title | Expected (Cat/Pri) | Predicted (Cat/Pri) | Match | Rationale / Reasoning |
| :--- | :--- | :--- | :--- | :---: | :--- |
${rows}

---

## 4. Provider Failures & Pipeline Errors

${failureRows}

---

## 5. Security & Authenticity Audit

1. **Production Pipeline Integrity:**
   - The evaluation harness executes \`AiService.categorizeTicket()\` directly.
   - Offline heuristic classifiers (\`classifyOfflineBenchmark\`) have been removed from accuracy reporting.
   - Any model or provider failure is recorded as an evaluation failure, preventing false-positive scoring.

2. **Credential & Secret Protection:**
   - Zero API keys, environment secrets, or credentials are leaked in evaluation reports or logs.

3. **Dataset Verification Status:**
   - The 20 tickets currently evaluated are synthetic test fixtures created during development.
   - Official Day 17 evaluation acceptance remains **BLOCKED** until the project lead supplies the authorized 20 labelled tickets.
`;
}

// Standalone execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    const isLive = process.argv.includes("--live");
    console.log(`Running SupportDesk AI Categorization Evaluation (${isLive ? "LIVE" : "MOCK"} mode)...`);

    const summary = await runCategorizationEvaluation({ mode: isLive ? "LIVE" : "MOCK" });

    console.log(`Mode: ${summary.mode}`);
    console.log(`Evaluated: ${summary.total} tickets`);
    console.log(`Category Accuracy: ${summary.categoryAccuracyPercent}% (${summary.categoryCorrect}/${summary.total})`);
    console.log(`Priority Accuracy: ${summary.priorityAccuracyPercent}% (${summary.priorityCorrect}/${summary.total})`);
    console.log(`Combined Accuracy: ${summary.combinedAccuracyPercent}% (${summary.combinedCorrect}/${summary.total})`);

    if (summary.isBlocked) {
      console.warn(`Evaluation Blocked: ${summary.blockReason}`);
    }

    const reportPath = path.resolve(__dirname, "../../../../../docs/day-17-evaluation-report.md");
    const markdown = generateMarkdownReport(summary);
    fs.writeFileSync(reportPath, markdown, "utf-8");
    console.log(`Wrote evaluation report to ${reportPath}`);
  })();
}
