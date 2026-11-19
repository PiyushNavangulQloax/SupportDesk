/**
 * SupportDesk AI Guardrails - 20 Labelled Evaluation Tickets
 *
 * Balanced dataset covering all 5 support categories and 4 priority tiers.
 * Used for repeatable categorization accuracy benchmarking (target >= 80%).
 */

export interface EvaluationTicket {
  id: string;
  title: string;
  description: string;
  expectedCategory: "Technical" | "Billing" | "Account" | "General" | "Feature Request";
  expectedPriority: "P1" | "P2" | "P3" | "P4";
  rationale: string;
}

export const EVALUATION_TICKETS: EvaluationTicket[] = [
  // 1-4: Technical
  {
    id: "EVAL-001",
    title: "Production checkout API returning 500 internal server error",
    description:
      "Our main checkout service is throwing HTTP 500 errors on all POST /api/v1/checkout requests. Customers cannot complete any purchases and all transactions are failing across all regions.",
    expectedCategory: "Technical",
    expectedPriority: "P1",
    rationale: "Total outage on primary revenue-generating checkout workflow.",
  },
  {
    id: "EVAL-002",
    title: "Mobile app crashes on iOS 18 when scanning barcodes",
    description:
      "Whenever warehouse workers tap the barcode scanner icon in the iOS mobile app, the application immediately crashes to the home screen. Affects iOS 18 users only; manual entry works as a workaround.",
    expectedCategory: "Technical",
    expectedPriority: "P2",
    rationale: "Significant core feature crash with temporary manual workaround.",
  },
  {
    id: "EVAL-003",
    title: "Webhook delivery experiencing 2-minute delays",
    description:
      "Our event webhooks for ticket updates are being delivered with a 2 to 3-minute delay rather than real-time. Delivery succeeds, but delayed.",
    expectedCategory: "Technical",
    expectedPriority: "P3",
    rationale: "Normal operational bug with minor latency impact.",
  },
  {
    id: "EVAL-004",
    title: "Typo in API documentation code snippet for Python SDK",
    description:
      "In the developer docs under 'Quickstart -> Python', the variable client_id is misspelled as clent_id in the example snippet.",
    expectedCategory: "Technical",
    expectedPriority: "P4",
    rationale: "Cosmetic documentation erratum with negligible impact.",
  },

  // 5-8: Billing
  {
    id: "EVAL-005",
    title: "Charged twice for annual enterprise plan renewal",
    description:
      "We noticed two separate charges of $1,200 on our credit card statement on November 1st for our annual enterprise subscription. Please investigate and refund the duplicate charge immediately.",
    expectedCategory: "Billing",
    expectedPriority: "P2",
    rationale: "Direct financial discrepancy involving duplicate high-value billing.",
  },
  {
    id: "EVAL-006",
    title: "Need updated invoice with corporate VAT and Tax ID",
    description:
      "Can you re-issue our October invoice #INV-2026-8891 including our corporate Tax ID (EU98412984) and legal entity address for accounting audit?",
    expectedCategory: "Billing",
    expectedPriority: "P3",
    rationale: "Routine accounting documentation update.",
  },
  {
    id: "EVAL-007",
    title: "Credit card renewal failed, subscription in grace period",
    description:
      "Our corporate card expired last month and the automated subscription renewal failed. We need to update the card details before the 7-day grace period ends.",
    expectedCategory: "Billing",
    expectedPriority: "P3",
    rationale: "Standard payment failure requiring card update before suspension.",
  },
  {
    id: "EVAL-008",
    title: "Inquiring about volume discount pricing for 100+ seats",
    description:
      "We are planning to expand our support team from 15 to 120 agents next quarter. Could you provide details on enterprise volume tiers and discount schedules?",
    expectedCategory: "Billing",
    expectedPriority: "P4",
    rationale: "Informational pricing inquiry with no immediate operational urgency.",
  },

  // 9-12: Account
  {
    id: "EVAL-009",
    title: "Organization admin locked out of account after lost 2FA device",
    description:
      "Our primary organization owner lost their mobile phone with Google Authenticator and cannot log into the admin portal. We have no other active owners to manage access.",
    expectedCategory: "Account",
    expectedPriority: "P2",
    rationale: "Administrative lockout blocking team management.",
  },
  {
    id: "EVAL-010",
    title: "Password reset link emails not arriving in mailbox",
    description:
      "I have requested a password reset three times over the past 30 minutes, but the reset email never reaches my inbox or spam folder.",
    expectedCategory: "Account",
    expectedPriority: "P3",
    rationale: "Single user authentication blocker with alternate login channels.",
  },
  {
    id: "EVAL-011",
    title: "How to invite a new staff member and assign Agent role",
    description:
      "We just hired a new support representative. What are the steps in the settings dashboard to invite them and grant the Agent role?",
    expectedCategory: "Account",
    expectedPriority: "P4",
    rationale: "Routine permission guidance and user onboarding question.",
  },
  {
    id: "EVAL-012",
    title: "Request for GDPR data export and account closure for departed employee",
    description:
      "Please provide an archive of personal data for user j.smith@example.com and proceed with account deletion pursuant to GDPR Article 17.",
    expectedCategory: "Account",
    expectedPriority: "P3",
    rationale: "Formal compliance and identity lifecycle request with 30-day window.",
  },

  // 13-16: General
  {
    id: "EVAL-013",
    title: "Customer support holiday operating hours for December",
    description:
      "Could you confirm your technical support desk operating hours and response SLAs during the upcoming Christmas and New Year holiday period?",
    expectedCategory: "General",
    expectedPriority: "P4",
    rationale: "Informational inquiry regarding holiday operational hours.",
  },
  {
    id: "EVAL-014",
    title: "Clarification on ticket retention policy for archived tickets",
    description:
      "How long are closed and resolved tickets retained in the database before they are permanently purged from the audit log?",
    expectedCategory: "General",
    expectedPriority: "P4",
    rationale: "General policy and retention clarification inquiry.",
  },
  {
    id: "EVAL-015",
    title: "Where can we find the SOC2 compliance report?",
    description:
      "Our internal compliance team is preparing our annual audit. Where can we download your latest SOC2 Type II audit report and NDA?",
    expectedCategory: "General",
    expectedPriority: "P4",
    rationale: "Standard compliance documentation lookup.",
  },
  {
    id: "EVAL-016",
    title: "Feedback on the new table navigation and search filter UI",
    description:
      "Just wanted to share feedback that the updated table filter bar released yesterday is much faster and easier to navigate. Great job!",
    expectedCategory: "General",
    expectedPriority: "P4",
    rationale: "General positive feedback with no action required.",
  },

  // 17-20: Feature Request
  {
    id: "EVAL-017",
    title: "Add CSV and Excel export functionality for ticket reports",
    description:
      "We would love to have a one-click button on the ticket list page to export filtered ticket tables to CSV or XLSX format for weekly management reviews.",
    expectedCategory: "Feature Request",
    expectedPriority: "P4",
    rationale: "Product enhancement request for reporting export functionality.",
  },
  {
    id: "EVAL-018",
    title: "Dark mode theme support for the web agent workspace",
    description:
      "Our night shift support agents spend 8+ hours in the portal and frequently request a dark theme option to reduce eye strain.",
    expectedCategory: "Feature Request",
    expectedPriority: "P4",
    rationale: "UI/UX enhancement request for dark mode option.",
  },
  {
    id: "EVAL-019",
    title: "Request for SAML 2.0 / Okta Single Sign-On integration",
    description:
      "Our enterprise security policy mandates that all SaaS tools connect through Okta SAML 2.0 with SCIM provisioning. Is this planned on your roadmap?",
    expectedCategory: "Feature Request",
    expectedPriority: "P3",
    rationale: "High-value enterprise architectural feature request.",
  },
  {
    id: "EVAL-020",
    title: "Customizable automated webhook triggers on ticket priority change",
    description:
      "We want to trigger an external PagerDuty alert whenever a ticket priority is updated to P1. Could you add configurable webhook event triggers?",
    expectedCategory: "Feature Request",
    expectedPriority: "P3",
    rationale: "Integration enhancement request for automated workflow automation.",
  },
];
