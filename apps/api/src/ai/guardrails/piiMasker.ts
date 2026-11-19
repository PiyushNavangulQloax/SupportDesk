/**
 * SupportDesk AI Guardrails - PII Masker
 *
 * Scans input text and redacts sensitive Personally Identifiable Information (PII)
 * before any data is sent to external AI providers or prompt engines.
 *
 * Supported PII types:
 * - Email addresses -> [EMAIL_REDACTED]
 * - Phone numbers (US & International) -> [PHONE_REDACTED]
 * - Credit card numbers (Visa, Mastercard, Amex, etc.) -> [CARD_REDACTED]
 * - Social Security Numbers (SSN) -> [SSN_REDACTED]
 * - Auth tokens, API keys, passwords -> [TOKEN_REDACTED]
 * - IPv4 and IPv6 addresses -> [IP_REDACTED]
 */

export interface MaskPiiResult {
  maskedText: string;
  piiDetected: boolean;
  detectedTypes: string[];
}

// Regex patterns for sensitive data
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// US and international phone formats with standard punctuation
const PHONE_REGEX =
  /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

// Credit card formats (13 to 19 digits with optional spaces or dashes)
const CREDIT_CARD_REGEX =
  /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5}\b/g;

// US Social Security Number (xxx-xx-xxxx or xxx xx xxxx)
const SSN_REGEX = /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g;

// Passwords, auth tokens, API keys (e.g. Bearer tokens, AIza keys, sk- keys, password=xyz)
const TOKEN_REGEX =
  /\b(?:bearer\s+[A-Za-z0-9._~+/=-]+|AIza[0-9A-Za-z-_]{35}|sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|AKIA[0-9A-Z]{16})\b|(?<=\b(?:password|passwd|pwd|secret|api[_-]?key)\s*[:=]\s*)[^\s,;]+/gi;

// IP Addresses (IPv4 and IPv6)
const IPV4_REGEX =
  /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;

const IPV6_REGEX =
  /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}:|:(?::[0-9a-fA-F]{1,4}){1,7}\b/g;

/**
 * Redacts sensitive PII from a given string.
 */
export function maskPii(text: string): MaskPiiResult {
  if (!text || typeof text !== "string") {
    return { maskedText: "", piiDetected: false, detectedTypes: [] };
  }

  const detectedTypes = new Set<string>();
  let result = text;

  // 1. Credit Card Masking
  if (CREDIT_CARD_REGEX.test(result)) {
    detectedTypes.add("CREDIT_CARD");
    result = result.replace(CREDIT_CARD_REGEX, "[CARD_REDACTED]");
  }

  // 2. SSN Masking
  if (SSN_REGEX.test(result)) {
    detectedTypes.add("SSN");
    result = result.replace(SSN_REGEX, "[SSN_REDACTED]");
  }

  // 3. Auth Token & Password Masking
  if (TOKEN_REGEX.test(result)) {
    detectedTypes.add("TOKEN");
    result = result.replace(TOKEN_REGEX, "[TOKEN_REDACTED]");
  }

  // 4. Email Masking
  if (EMAIL_REGEX.test(result)) {
    detectedTypes.add("EMAIL");
    result = result.replace(EMAIL_REGEX, "[EMAIL_REDACTED]");
  }

  // 5. Phone Number Masking (executed after credit cards/SSN to avoid partial collision)
  if (PHONE_REGEX.test(result)) {
    detectedTypes.add("PHONE");
    result = result.replace(PHONE_REGEX, "[PHONE_REDACTED]");
  }

  // 6. IP Address Masking (IPv4 & IPv6)
  if (IPV4_REGEX.test(result)) {
    detectedTypes.add("IPV4");
    result = result.replace(IPV4_REGEX, "[IP_REDACTED]");
  }

  if (IPV6_REGEX.test(result)) {
    detectedTypes.add("IPV6");
    result = result.replace(IPV6_REGEX, "[IP_REDACTED]");
  }

  return {
    maskedText: result,
    piiDetected: detectedTypes.size > 0,
    detectedTypes: Array.from(detectedTypes),
  };
}
