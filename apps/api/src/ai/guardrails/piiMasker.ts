/**
 * SupportDesk AI Guardrails - PII Masker
 *
 * Scans input text and redacts sensitive Personally Identifiable Information (PII)
 * before any data is sent to external AI providers or prompt engines.
 *
 * Supported PII types:
 * - Indian PAN numbers (Permanent Account Number) -> [PAN_REDACTED]
 * - Aadhaar numbers (12-digit Indian national ID) -> [AADHAAR_REDACTED]
 * - Indian bank account numbers (9-18 digits with contextual indicator) -> [ACCOUNT_REDACTED]
 * - Credit/debit card numbers (Visa, Mastercard, Amex, etc.) -> [CARD_REDACTED]
 * - Social Security Numbers (US SSN) -> [SSN_REDACTED]
 * - Phone numbers (Indian mobile +91, US & International) -> [PHONE_REDACTED]
 * - Email addresses -> [EMAIL_REDACTED]
 * - Auth tokens, API keys, passwords -> [TOKEN_REDACTED]
 * - IPv4 and IPv6 addresses -> [IP_REDACTED]
 */

export interface MaskPiiResult {
  maskedText: string;
  piiDetected: boolean;
  detectedTypes: string[];
}

// Regex patterns for sensitive data

// 1. UUID protection regex (prevents false-positive masking on system UUIDs)
const UUID_REGEX =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;

// 2. Indian PAN: 5 uppercase letters, 4 digits, 1 uppercase letter (case-insensitive for user input)
const PAN_REGEX = /\b[A-Za-z]{5}[0-9]{4}[A-Za-z]\b/g;

// 3. Indian Aadhaar: 12 digits, first digit 2-9, formatted as 4-4-4 (spaces/hyphens) or contiguous
const AADHAAR_REGEX = /\b[2-9]\d{3}[-\s]\d{4}[-\s]\d{4}\b|\b[2-9]\d{11}\b/g;

// 4. Indian Bank Account Number: 9 to 18 digits preceded by account identifier keywords
const BANK_ACCOUNT_REGEX =
  /(\b(?:a\/c|acct|account|acc|bank\s*a\/c|account\s*no\.?|a\/c\s*no\.?|sb\s*a\/c)\s*(?:number|no\.?)?\s*[:#-]?\s*)(\d{9,18})\b/gi;

// 5. Credit card formats (13 to 19 digits with optional spaces or dashes)
const CREDIT_CARD_REGEX =
  /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5}\b/g;

// 6. US Social Security Number (xxx-xx-xxxx or xxx xx xxxx)
const SSN_REGEX = /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g;

// 7. Passwords, auth tokens, API keys (e.g. Bearer tokens, AIza keys, sk- keys, password=xyz)
const TOKEN_REGEX =
  /\b(?:bearer\s+[A-Za-z0-9._~+/=-]+|AIza[0-9A-Za-z-_]{35}|sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|AKIA[0-9A-Z]{16})\b|(?<=\b(?:password|passwd|pwd|secret|api[_-]?key)\s*[:=]\s*)[^\s,;]+/gi;

// 8. Email addresses
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// 9. Phone Numbers:
// - Indian mobile numbers (+91, 0, or 10-digit starting with 6, 7, 8, 9, with optional 5-5 grouping)
// Uses (?<![\w+]) and (?!\d) to avoid partial matching inside longer numeric tracking IDs or serial numbers
const INDIA_PHONE_REGEX =
  /(?<![\w+])(?:(?:\+|00)91[-\s]?|0)?[6-9]\d{4}[-\s]?\d{5}(?!\d)/g;

// - US & International phone formats with standard punctuation
// Uses (?<![\w+]) and (?!\d) to prevent matching arbitrary 13+ digit numbers
const US_INTL_PHONE_REGEX =
  /(?<![\w+])(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]\d{4}(?!\d)|(?<!\w)\+\d{1,3}[-\s]\d{1,4}[-\s]\d{3,4}[-\s]\d{3,4}(?!\d)/g;

// 10. IP Addresses (IPv4 and IPv6)
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

  // Temporarily preserve UUIDs to eliminate false-positive phone/card masking
  const preservedUuids: string[] = [];
  let result = text.replace(UUID_REGEX, (match) => {
    preservedUuids.push(match);
    return `___UUID_RESERVED_${preservedUuids.length - 1}___`;
  });

  // 1. Bank Account Masking (contextual 9-18 digits; run before credit card to prevent collision)
  if (BANK_ACCOUNT_REGEX.test(result)) {
    detectedTypes.add("BANK_ACCOUNT");
    result = result.replace(BANK_ACCOUNT_REGEX, "$1[ACCOUNT_REDACTED]");
  }

  // 2. Credit Card Masking
  if (CREDIT_CARD_REGEX.test(result)) {
    detectedTypes.add("CREDIT_CARD");
    result = result.replace(CREDIT_CARD_REGEX, "[CARD_REDACTED]");
  }

  // 3. Indian Aadhaar Number Masking
  if (AADHAAR_REGEX.test(result)) {
    detectedTypes.add("AADHAAR");
    result = result.replace(AADHAAR_REGEX, "[AADHAAR_REDACTED]");
  }

  // 4. Indian PAN Masking
  if (PAN_REGEX.test(result)) {
    detectedTypes.add("PAN");
    result = result.replace(PAN_REGEX, "[PAN_REDACTED]");
  }

  // 5. US SSN Masking
  if (SSN_REGEX.test(result)) {
    detectedTypes.add("SSN");
    result = result.replace(SSN_REGEX, "[SSN_REDACTED]");
  }

  // 6. Auth Token & Password Masking
  if (TOKEN_REGEX.test(result)) {
    detectedTypes.add("TOKEN");
    result = result.replace(TOKEN_REGEX, "[TOKEN_REDACTED]");
  }

  // 7. Email Masking
  if (EMAIL_REGEX.test(result)) {
    detectedTypes.add("EMAIL");
    result = result.replace(EMAIL_REGEX, "[EMAIL_REDACTED]");
  }

  // 8. Phone Number Masking (Indian mobile + international/US)
  let phoneMatched = false;
  if (INDIA_PHONE_REGEX.test(result)) {
    phoneMatched = true;
    result = result.replace(INDIA_PHONE_REGEX, "[PHONE_REDACTED]");
  }

  if (US_INTL_PHONE_REGEX.test(result)) {
    phoneMatched = true;
    result = result.replace(US_INTL_PHONE_REGEX, "[PHONE_REDACTED]");
  }

  if (phoneMatched) {
    detectedTypes.add("PHONE");
  }

  // 9. IP Address Masking (IPv4 & IPv6)
  if (IPV4_REGEX.test(result)) {
    detectedTypes.add("IPV4");
    result = result.replace(IPV4_REGEX, "[IP_REDACTED]");
  }

  if (IPV6_REGEX.test(result)) {
    detectedTypes.add("IPV6");
    result = result.replace(IPV6_REGEX, "[IP_REDACTED]");
  }

  // Restore preserved UUIDs
  result = result.replace(
    /___UUID_RESERVED_(\d+)___/g,
    (_, idx) => preservedUuids[Number(idx)]
  );

  return {
    maskedText: result,
    piiDetected: detectedTypes.size > 0,
    detectedTypes: Array.from(detectedTypes),
  };
}
