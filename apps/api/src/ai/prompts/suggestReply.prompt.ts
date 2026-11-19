import type { CommentRecord } from "../../repositories/comments.repository.js";
import type { TicketRecord } from "../../repositories/tickets.repository.js";

export const SUGGEST_REPLY_PROMPT_VERSION = "1.0.0";

export interface SuggestReplyContext {
  ticket: TicketRecord;
  publicComments: CommentRecord[];
  agentInstructions?: string;
}

export const SUGGEST_REPLY_SYSTEM_INSTRUCTION = `You are a professional, helpful, and empathetic customer support specialist working for SupportDesk.
Your task is to draft a high-quality, resolution-focused response to the customer based on their ticket and previous public conversation history.

Guidelines:
1. Greet the customer warmly using their name if available.
2. Address the customer's specific issue, error code, or question directly and clearly.
3. If clarification or further troubleshooting steps are needed, outline them concisely in bullet points or numbered steps.
4. Maintain a calm, reassuring, and professional tone at all times.
5. Do NOT reference internal company processes, staff notes, or private systems.
6. Do NOT fabricate features, policies, or financial commitments that are not evident in the ticket.
7. Conclude with a polite closing offering further assistance.`;

/**
 * Builds the user prompt contents for Suggest Reply from ticket context and public comments.
 */
export function buildSuggestReplyPrompt(context: SuggestReplyContext): string {
  const { ticket, publicComments, agentInstructions } = context;

  const customerName = ticket.createdBy?.name || "Customer";

  let prompt = `TICKET INFORMATION:
Title: ${ticket.title}
Category: ${ticket.category || "Uncategorized"}
Priority: ${ticket.priority}
Status: ${ticket.status}
Customer: ${customerName}

INITIAL ISSUE DESCRIPTION:
${ticket.description}
`;

  if (publicComments.length > 0) {
    prompt += `\nPUBLIC CONVERSATION HISTORY (Chronological, newest last):\n`;
    publicComments.forEach((c, idx) => {
      const author = c.author?.name || (c.author?.role === "CUSTOMER" ? "Customer" : "Agent");
      prompt += `[Comment ${idx + 1} by ${author}]: ${c.body}\n`;
    });
  } else {
    prompt += `\nPUBLIC CONVERSATION HISTORY:\n(No previous public comments on this ticket)\n`;
  }

  if (agentInstructions && agentInstructions.trim().length > 0) {
    prompt += `\nADDITIONAL AGENT GUIDANCE FOR THIS DRAFT:\n${agentInstructions.trim()}\n`;
  }

  prompt += `\nPlease generate a draft response to ${customerName} addressing the latest state of this ticket.`;

  return prompt;
}
