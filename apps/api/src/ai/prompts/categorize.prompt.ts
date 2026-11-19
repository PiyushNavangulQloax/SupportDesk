import { Type } from "@google/genai";
import type { TicketRecord } from "../../repositories/tickets.repository.js";
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES } from "../schemas/ai.schema.js";

export const CATEGORIZE_PROMPT_VERSION = "1.0.0";

export interface CategorizeContext {
  ticket: TicketRecord;
}

export const CATEGORIZE_SYSTEM_INSTRUCTION = `You are an expert IT and customer service triage analyst for SupportDesk.
Your task is to analyze an incoming customer support ticket and accurately classify its category and urgency priority.

Categories:
- "Technical": Software bugs, system errors, API issues, integration failures, technical troubleshooting.
- "Billing": Invoicing, payment errors, subscription management, refunds, pricing inquiries.
- "Account": Authentication, login problems, password resets, user permissions, profile updates.
- "General": Basic questions, general documentation lookups, general feedback.
- "Feature Request": Suggestions for new functionality, enhancements, or product requests.

Priority Definitions:
- "P1": Critical business outage, total system unavailable, severe data loss risk, complete blocker with no workaround.
- "P2": Major functionality broken affecting core workflow, significant impact with temporary or clumsy workaround.
- "P3": Normal operational issue, standard bug with clear workaround, minor feature impairment.
- "P4": Low urgency, general cosmetic issue, minor question, informational inquiry, non-urgent request.

Provide a concise 1-2 sentence reasoning explaining why this category and priority were selected.`;

/**
 * Google GenAI JSON schema specification for structured output.
 */
export const CATEGORIZE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: Array.from(SUPPORT_CATEGORIES),
      description: "The primary support category for the ticket.",
    },
    priority: {
      type: Type.STRING,
      enum: Array.from(SUPPORT_PRIORITIES),
      description: "The urgency priority level: P1, P2, P3, or P4.",
    },
    reasoning: {
      type: Type.STRING,
      description: "Concise 1-2 sentence rationale for the classification.",
    },
  },
  required: ["category", "priority", "reasoning"],
};

/**
 * Builds user prompt contents for ticket categorization.
 */
export function buildCategorizePrompt(context: CategorizeContext): string {
  const { ticket } = context;

  return `TICKET TO CLASSIFY:
Title: ${ticket.title}

Description:
${ticket.description}

Please analyze this ticket and provide the appropriate category, priority, and reasoning in the requested JSON structure.`;
}
