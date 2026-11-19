import { z } from "zod";

/**
 * Permitted SupportDesk Categories.
 */
export const SUPPORT_CATEGORIES = [
  "Technical",
  "Billing",
  "Account",
  "General",
  "Feature Request",
] as const;

export const SUPPORT_PRIORITIES = ["P1", "P2", "P3", "P4"] as const;

/**
 * Strict Zod schema for Feature B: Auto-categorise + Priority response.
 */
export const aiCategorizeResponseSchema = z.object({
  category: z.enum([
    "Technical",
    "Billing",
    "Account",
    "General",
    "Feature Request",
  ]),
  priority: z.enum(["P1", "P2", "P3", "P4"]),
  reasoning: z
    .string()
    .trim()
    .min(1, "Reasoning is required")
    .max(1000, "Reasoning must not exceed 1000 characters"),
});

export type AiCategorizeResponse = z.infer<typeof aiCategorizeResponseSchema>;

/**
 * Optional request body for Feature A: Suggest Reply.
 */
export const suggestReplyBodySchema = z.object({
  instructions: z.string().trim().max(500).optional(),
});

export type SuggestReplyBody = z.infer<typeof suggestReplyBodySchema>;

/**
 * Structured telemetry metric capturing usage and cost metadata without sensitive data.
 */
export interface AiTelemetryMetric {
  type: "AI_USAGE_METRIC";
  feature: "SUGGEST_REPLY" | "AUTO_CATEGORIZE";
  ticketId: string;
  model: string;
  promptTokens?: number;
  candidatesTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  durationMs: number;
  success: boolean;
  timestamp: string;
}

/**
 * Emits sanitized AI telemetry metadata.
 * Never logs prompts, generated replies, ticket descriptions, comments, or credentials.
 */
export function logAiUsage(metric: AiTelemetryMetric): void {
  console.info(JSON.stringify(metric));
}
