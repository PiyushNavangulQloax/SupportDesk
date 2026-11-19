/**
 * Official Google Gemini Model Pricing (USD per 1,000,000 tokens).
 * Official Source: https://ai.google.dev/gemini-api/docs/pricing
 * Model Lifecycle Reference: https://ai.google.dev/gemini-api/docs/models
 * Verification Date: 17 November 2026
 *
 * Scope: Standard Paid-Tier Rates (Pay-as-you-go).
 * Note: Estimated costs represent approximate token consumption for telemetry
 * and monitoring only; they do not represent final invoice amounts or account
 * for discounts (e.g. prompt caching, batch processing, or free tier quotas).
 */
export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  status: "ACTIVE" | "ACCESS_RESTRICTED" | "RETIRED";
  notes?: string;
}

/**
 * Current verified model pricing for active Gemini Developer API models (Standard paid tier).
 */
export const ACTIVE_MODEL_PRICING: Record<string, ModelPricing> = {
  // Gemini 3.5 Flash-Lite: Recommended active stable model for high-frequency triage & drafting
  "gemini-3.5-flash-lite": {
    inputPerMillion: 0.30,
    outputPerMillion: 2.50,
    status: "ACTIVE",
    notes: "Standard paid tier: $0.30 input / $2.50 output per 1M tokens. Official stable workhorse model.",
  },
  // Gemini 3.8 Flash: Frontier-class performance model
  "gemini-3.8-flash": {
    inputPerMillion: 0.75,
    outputPerMillion: 3.75,
    status: "ACTIVE",
    notes: "Standard paid tier: Introductory pricing ($0.75 input / $3.75 output per 1M tokens) through December 31, 2026; moves to $1.50 input / $7.50 output starting January 1, 2027.",
  },
};

/**
 * Reference records for access-restricted or retired models.
 * Retained for auditing and historical log interpretation.
 * Access-restricted or retired models cannot be used for active project cost estimation.
 */
export const HISTORICAL_MODEL_PRICING: Record<string, ModelPricing> = {
  // Gemini 2.5 Flash: Access-restricted to existing active users; continues to be served via API until further notice.
  // Google recommends gemini-3.5-flash-lite for new projects.
  "gemini-2.5-flash": {
    inputPerMillion: 0.30,
    outputPerMillion: 2.50,
    status: "ACCESS_RESTRICTED",
    notes: "Access-restricted to existing active users. Continues to be served via Developer API until further notice. Not recommended for new projects.",
  },
  // Gemini 1.5 Flash: Retired / shut down upstream.
  "gemini-1.5-flash": {
    inputPerMillion: 0.075,
    outputPerMillion: 0.30,
    status: "RETIRED",
    notes: "Shut down upstream; not valid for active API requests.",
  },
};

/**
 * Combined pricing dictionary for reference and audit logging.
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  ...HISTORICAL_MODEL_PRICING,
  ...ACTIVE_MODEL_PRICING,
};

/**
 * Calculates estimated USD cost based on verified official token pricing.
 *
 * Requirements:
 * 1. Returns undefined if token counts are missing or undefined.
 * 2. Returns undefined if the model is not found in ACTIVE_MODEL_PRICING or status is not 'ACTIVE'
 *    (preventing fabricated costs or silent estimation on access-restricted/retired models).
 * 3. Does not imply an invoice amount; represents an operational token-rate estimate.
 */
export function calculateEstimatedCostUsd(
  model: string,
  promptTokens?: number,
  candidatesTokens?: number
): number | undefined {
  if (promptTokens === undefined || candidatesTokens === undefined) {
    return undefined;
  }

  // Strictly require active verified pricing
  const pricing = ACTIVE_MODEL_PRICING[model];
  if (!pricing || pricing.status !== "ACTIVE") {
    return undefined;
  }

  const inputCost = (promptTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (candidatesTokens / 1_000_000) * pricing.outputPerMillion;

  return Number((inputCost + outputCost).toFixed(6));
}
