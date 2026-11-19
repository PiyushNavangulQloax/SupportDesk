/**
 * SupportDesk AI Guardrails - Content Moderation
 *
 * Provides fast, deterministic safety classification for untrusted ticket content
 * and agent draft prompts prior to LLM submission.
 * Detects severe safety violations: hate speech, threats of violence, self-harm, and illegal exploits.
 */

export interface ModerationResult {
  isSafe: boolean;
  flaggedCategories: string[];
  reason?: string;
}

// Patterns for abusive, violent, self-harm, or severely inappropriate content
const SAFETY_PATTERNS: Array<{ category: string; regex: RegExp; message: string }> = [
  {
    category: "VIOLENCE_THREATS",
    regex: /\b(?:i(?:'ll| will| am going to)\s+(?:kill|murder|bomb|shoot|assassinate|destroy)\s+(?:you|your staff|your office|everyone))\b/i,
    message: "Content contains explicit threats of violence or bodily harm.",
  },
  {
    category: "SELF_HARM",
    regex: /\b(?:i(?:'ll| will| am going to)\s+(?:kill myself|commit suicide|end my life))\b/i,
    message: "Content indicates imminent self-harm or suicide.",
  },
  {
    category: "EXPLOITATION",
    regex: /\b(?:child\s+porn|csam|exploit\s+minors)\b/i,
    message: "Content references child exploitation or illegal material.",
  },
  {
    category: "MALICIOUS_INJECTION_CODE",
    regex: /<script[\s\S]*?>[\s\S]*?<\/script>|javascript:\s*alert/i,
    message: "Content contains malicious executable script tags or XSS payloads.",
  },
];

/**
 * Checks content against safety and moderation rules.
 */
export function moderateContent(text: string): ModerationResult {
  if (!text || typeof text !== "string") {
    return { isSafe: true, flaggedCategories: [] };
  }

  const flagged: string[] = [];
  const reasons: string[] = [];

  for (const rule of SAFETY_PATTERNS) {
    if (rule.regex.test(text)) {
      flagged.push(rule.category);
      reasons.push(rule.message);
    }
  }

  if (flagged.length > 0) {
    return {
      isSafe: false,
      flaggedCategories: flagged,
      reason: reasons.join(" "),
    };
  }

  return {
    isSafe: true,
    flaggedCategories: [],
  };
}
