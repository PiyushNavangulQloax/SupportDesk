// =============================================================================
// SupportDesk Day 8 — Database Seed Script
// Target: PostgreSQL 17 (Docker, localhost:5433, database: supportdesk)
// Prisma ORM: 7.10.1  |  Adapter: @prisma/adapter-pg
//
// SAFETY:
//   - Reads DATABASE_URL from environment; never hardcodes credentials.
//   - Fully repeatable & idempotent: all entities use deterministic UUIDs
//     and upsert operations. Running 1, 2, or 100 times produces identical counts.
//   - Non-destructive: does not drop, wipe, or truncate tables, preserving any
//     unrelated data.
//   - Passwords use documented development-only placeholder hashes (DEV_ONLY:).
// =============================================================================

import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import {
  UserRole,
  TicketStatus,
  TicketPriority,
} from "../src/generated/prisma/enums.js";

// ---------------------------------------------------------------------------
// Bootstrap Prisma Client with PostgreSQL adapter
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Deterministic UUID generators for idempotent seeding
// ---------------------------------------------------------------------------

function deterministicUuid(namespace: number, id: number): string {
  const ns = String(namespace).padStart(8, "0");
  const suffix = String(id).padStart(12, "0");
  return `${ns}-0000-0000-0000-${suffix}`;
}

const NS_USER = 1;
const NS_TICKET = 2;
const NS_COMMENT = 3;
const NS_ATTACHMENT = 4;
const NS_AUDIT = 5;
const NS_TAG = 6;

// ---------------------------------------------------------------------------
// Helper: pick an element by cycling index (deterministic)
// ---------------------------------------------------------------------------

function pick<T>(arr: readonly T[] | T[], index: number): T {
  return arr[index % arr.length];
}

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

const USER_SEEDS = [
  // --- customers (4) ---
  {
    name: "Alice Moreau",
    email: "alice.moreau@example.com",
    passwordHash: "DEV_ONLY:alice-placeholder-hash",
    role: UserRole.CUSTOMER,
  },
  {
    name: "Ben Okafor",
    email: "ben.okafor@example.com",
    passwordHash: "DEV_ONLY:ben-placeholder-hash",
    role: UserRole.CUSTOMER,
  },
  {
    name: "Clara Nguyen",
    email: "clara.nguyen@example.com",
    passwordHash: "DEV_ONLY:clara-placeholder-hash",
    role: UserRole.CUSTOMER,
  },
  {
    name: "David Singh",
    email: "david.singh@example.com",
    passwordHash: "DEV_ONLY:david-placeholder-hash",
    role: UserRole.CUSTOMER,
  },
  // --- agents (2) ---
  {
    name: "Priya Kapoor",
    email: "priya.kapoor@supportdesk.internal",
    passwordHash: "DEV_ONLY:priya-placeholder-hash",
    role: UserRole.AGENT,
  },
  {
    name: "James Whitfield",
    email: "james.whitfield@supportdesk.internal",
    passwordHash: "DEV_ONLY:james-placeholder-hash",
    role: UserRole.AGENT,
  },
  // --- admin (1) ---
  {
    name: "Sofia Admin",
    email: "sofia.admin@supportdesk.internal",
    passwordHash: "DEV_ONLY:sofia-placeholder-hash",
    role: UserRole.ADMIN,
  },
] as const;

const TAG_SEEDS = [
  "billing",
  "account",
  "password-reset",
  "api",
  "performance",
  "ui-bug",
  "data-export",
  "mobile",
  "integration",
  "feature-request",
  "security",
  "onboarding",
] as const;

// 50 fictional ticket definitions:
//   open: 12  |  in_progress: 10  |  waiting_on_customer: 8  |  resolved: 10  |  closed: 10
//   P1: 5  |  P2: 11  |  P3: 24  |  P4: 10
const TICKET_SEEDS: Array<{
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  creatorIndex: number;
  assigneeIndex: number | null;
  tagIndices: number[];
  hasAttachment: boolean;
}> = [
  // ---- OPEN (12) ----
  {
    title: "Cannot log in after password reset",
    description:
      "After requesting a password reset link and setting a new password I am still unable to log in. The error message says 'Invalid credentials'. I have cleared my browser cache.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.P1,
    category: "Authentication",
    creatorIndex: 0,
    assigneeIndex: null,
    tagIndices: [2, 1],
    hasAttachment: false,
  },
  {
    title: "Invoice #2047 shows wrong amount",
    description:
      "My latest invoice shows $349 but according to my plan it should be $199. Please investigate and issue a corrected invoice.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.P2,
    category: "Billing",
    creatorIndex: 1,
    assigneeIndex: null,
    tagIndices: [0],
    hasAttachment: true,
  },
  {
    title: "API rate limit errors under normal load",
    description:
      "We are receiving 429 Too Many Requests errors even though our request rate is well within the documented limits. Happening since Tuesday 2026-10-28.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.P2,
    category: "API",
    creatorIndex: 2,
    assigneeIndex: null,
    tagIndices: [3, 4],
    hasAttachment: false,
  },
  {
    title: "Mobile app crashes on startup on iOS 18",
    description:
      "After updating to iOS 18.1 the SupportDesk mobile app crashes immediately on launch. Reinstalling does not help. Device: iPhone 15 Pro.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.P2,
    category: "Mobile",
    creatorIndex: 3,
    assigneeIndex: null,
    tagIndices: [7],
    hasAttachment: true,
  },
  {
    title: "Dashboard charts not loading",
    description:
      "The analytics dashboard shows blank charts. The loading spinner runs indefinitely. Network tab shows 500 errors from /api/metrics.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.P3,
    category: "UI",
    creatorIndex: 0,
    assigneeIndex: null,
    tagIndices: [5, 4],
    hasAttachment: false,
  },
  {
    title: "Need to export ticket history to CSV",
    description:
      "We need a full export of all tickets from Q3 2026 for our compliance audit. The export button produces an empty file.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.P3,
    category: "Data",
    creatorIndex: 1,
    assigneeIndex: null,
    tagIndices: [6],
    hasAttachment: false,
  },
  {
    title: "Webhook events not arriving for ticket.closed",
    description:
      "We have configured a webhook endpoint but are not receiving the ticket.closed event. Other events (ticket.created) work correctly.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.P3,
    category: "Integrations",
    creatorIndex: 2,
    assigneeIndex: null,
    tagIndices: [8],
    hasAttachment: false,
  },
  {
    title: "Account deactivated without notice",
    description:
      "Our team account was deactivated this morning. We have an active subscription. We cannot access any tickets or settings.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.P1,
    category: "Account",
    creatorIndex: 3,
    assigneeIndex: null,
    tagIndices: [1, 10],
    hasAttachment: false,
  },
  {
    title: "Two-factor authentication codes not delivered",
    description:
      "2FA codes via SMS are not being received. Email 2FA also does not deliver. We are locked out of the admin account.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.P2,
    category: "Security",
    creatorIndex: 0,
    assigneeIndex: null,
    tagIndices: [10, 1],
    hasAttachment: false,
  },
  {
    title: "Onboarding wizard skips step 3 silently",
    description:
      "When a new user completes step 2 of onboarding they are taken directly to step 4 without filling in billing details. This causes account creation to fail.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.P3,
    category: "Onboarding",
    creatorIndex: 1,
    assigneeIndex: null,
    tagIndices: [11, 5],
    hasAttachment: false,
  },
  {
    title: "Search returns irrelevant results",
    description:
      "The global ticket search returns tickets that do not match the search term. Searching for 'billing' returns unrelated installation tickets.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.P4,
    category: "Search",
    creatorIndex: 2,
    assigneeIndex: null,
    tagIndices: [5],
    hasAttachment: false,
  },
  {
    title: "Request: bulk-close resolved tickets",
    description:
      "We would like a way to bulk-close all tickets in resolved status older than 30 days. Currently we have to close them one by one.",
    status: TicketStatus.OPEN,
    priority: TicketPriority.P4,
    category: "Feature Request",
    creatorIndex: 3,
    assigneeIndex: null,
    tagIndices: [9],
    hasAttachment: false,
  },

  // ---- IN_PROGRESS (10) ----
  {
    title: "Integration with Slack not posting updates",
    description:
      "The Slack integration stopped posting ticket update messages two days ago. The app is still installed in Slack and permissions look correct.",
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.P2,
    category: "Integrations",
    creatorIndex: 0,
    assigneeIndex: 4, // Priya
    tagIndices: [8],
    hasAttachment: false,
  },
  {
    title: "Report generation takes over 10 minutes",
    description:
      "Generating the monthly summary report used to take 30 seconds. Since last week it times out after 10 minutes without producing any output.",
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.P2,
    category: "Performance",
    creatorIndex: 1,
    assigneeIndex: 5, // James
    tagIndices: [4, 6],
    hasAttachment: false,
  },
  {
    title: "Cannot add team members to organisation",
    description:
      "The 'Invite Member' button on the Team Settings page does nothing. The invitation email is never sent.",
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.P3,
    category: "Account",
    creatorIndex: 2,
    assigneeIndex: 4,
    tagIndices: [1],
    hasAttachment: false,
  },
  {
    title: "PDF attachments not rendering in ticket view",
    description:
      "When a PDF is attached to a ticket the preview shows a blank white box. Downloading the attachment works correctly.",
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.P3,
    category: "UI",
    creatorIndex: 3,
    assigneeIndex: 5,
    tagIndices: [5],
    hasAttachment: true,
  },
  {
    title: "API key expires before documented TTL",
    description:
      "API keys we generate expire after 24 hours even though the documentation states 90 days. This is breaking our CI/CD pipeline.",
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.P1,
    category: "API",
    creatorIndex: 0,
    assigneeIndex: 4,
    tagIndices: [3, 10],
    hasAttachment: false,
  },
  {
    title: "Date picker shows wrong timezone",
    description:
      "The SLA due-date picker shows UTC time instead of the account timezone (Europe/Paris). This causes SLA breaches to be recorded incorrectly.",
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.P3,
    category: "UI",
    creatorIndex: 1,
    assigneeIndex: 5,
    tagIndices: [5],
    hasAttachment: false,
  },
  {
    title: "Notifications sent to wrong email address",
    description:
      "Ticket update notifications are being sent to a former employee's email rather than the current account owner. Settings show the correct email.",
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.P2,
    category: "Notifications",
    creatorIndex: 2,
    assigneeIndex: 4,
    tagIndices: [1],
    hasAttachment: false,
  },
  {
    title: "Mobile push notifications not working on Android",
    description:
      "Push notifications stopped working on Android devices after the 3.4.0 app update. iOS is unaffected.",
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.P3,
    category: "Mobile",
    creatorIndex: 3,
    assigneeIndex: 5,
    tagIndices: [7],
    hasAttachment: false,
  },
  {
    title: "Cannot delete custom ticket fields",
    description:
      "The delete button for custom fields in Settings is greyed out even when the field has no data. Expected it to be removable.",
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.P4,
    category: "Settings",
    creatorIndex: 0,
    assigneeIndex: 4,
    tagIndices: [9],
    hasAttachment: false,
  },
  {
    title: "SSO login loop — redirects endlessly",
    description:
      "Our SAML SSO configuration causes an infinite redirect loop on login. Direct login with credentials works. Affects all SSO users.",
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.P1,
    category: "Authentication",
    creatorIndex: 1,
    assigneeIndex: 5,
    tagIndices: [2, 10],
    hasAttachment: false,
  },

  // ---- WAITING_ON_CUSTOMER (8) ----
  {
    title: "Subscription upgrade not reflected on billing page",
    description:
      "I upgraded from Starter to Pro three days ago but the billing page still shows the Starter plan. I was charged the Pro amount.",
    status: TicketStatus.WAITING_ON_CUSTOMER,
    priority: TicketPriority.P3,
    category: "Billing",
    creatorIndex: 2,
    assigneeIndex: 4,
    tagIndices: [0],
    hasAttachment: true,
  },
  {
    title: "Data import from Zendesk failed halfway",
    description:
      "The Zendesk migration imported 2300 of 5600 tickets then stopped. No error message was shown. Import status page shows 'Completed'.",
    status: TicketStatus.WAITING_ON_CUSTOMER,
    priority: TicketPriority.P2,
    category: "Data",
    creatorIndex: 3,
    assigneeIndex: 5,
    tagIndices: [6, 8],
    hasAttachment: false,
  },
  {
    title: "Custom domain not resolving",
    description:
      "We pointed our custom domain support.example.com to SupportDesk but it shows a DNS error. CNAME is configured as instructed.",
    status: TicketStatus.WAITING_ON_CUSTOMER,
    priority: TicketPriority.P3,
    category: "Setup",
    creatorIndex: 0,
    assigneeIndex: 4,
    tagIndices: [11],
    hasAttachment: false,
  },
  {
    title: "Cannot verify business email address",
    description:
      "The verification email is not arriving at our business domain. We have checked spam folders. Personal Gmail addresses receive it fine.",
    status: TicketStatus.WAITING_ON_CUSTOMER,
    priority: TicketPriority.P4,
    category: "Onboarding",
    creatorIndex: 1,
    assigneeIndex: 5,
    tagIndices: [11, 1],
    hasAttachment: false,
  },
  {
    title: "API pagination returns duplicate records",
    description:
      "Using cursor-based pagination on /api/tickets, some records appear in both page N and page N+1 when records are updated between requests.",
    status: TicketStatus.WAITING_ON_CUSTOMER,
    priority: TicketPriority.P3,
    category: "API",
    creatorIndex: 2,
    assigneeIndex: 4,
    tagIndices: [3],
    hasAttachment: false,
  },
  {
    title: "Report shows data from wrong date range",
    description:
      "The weekly report delivered on Monday covers Thursday–Wednesday instead of Monday–Sunday. Time zone setting on account is UTC.",
    status: TicketStatus.WAITING_ON_CUSTOMER,
    priority: TicketPriority.P3,
    category: "Reports",
    creatorIndex: 3,
    assigneeIndex: 5,
    tagIndices: [6],
    hasAttachment: false,
  },
  {
    title: "Profile picture upload failing",
    description:
      "Uploading a profile picture produces the error 'File type not supported'. I have tried JPG, PNG and WebP files all under 2MB.",
    status: TicketStatus.WAITING_ON_CUSTOMER,
    priority: TicketPriority.P4,
    category: "UI",
    creatorIndex: 0,
    assigneeIndex: 4,
    tagIndices: [5],
    hasAttachment: true,
  },
  {
    title: "Team dashboard not visible for sub-accounts",
    description:
      "Sub-account users can see their own tickets but cannot see the shared team dashboard. Main account admin can see it without problems.",
    status: TicketStatus.WAITING_ON_CUSTOMER,
    priority: TicketPriority.P3,
    category: "Account",
    creatorIndex: 1,
    assigneeIndex: 5,
    tagIndices: [1],
    hasAttachment: false,
  },

  // ---- RESOLVED (10) ----
  {
    title: "Cannot download generated reports",
    description:
      "The download link for generated reports returns a 403 Forbidden. The reports themselves are generated successfully.",
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.P3,
    category: "Reports",
    creatorIndex: 2,
    assigneeIndex: 4,
    tagIndices: [6],
    hasAttachment: false,
  },
  {
    title: "Filter by assignee not working in ticket list",
    description:
      "Filtering the ticket list by assignee returns all tickets regardless of the selected agent. The URL parameter updates correctly.",
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.P3,
    category: "UI",
    creatorIndex: 3,
    assigneeIndex: 5,
    tagIndices: [5],
    hasAttachment: false,
  },
  {
    title: "API endpoint returning 401 with valid token",
    description:
      "GET /api/v2/tickets returns 401 with a valid OAuth2 token. The same token works on other endpoints. Issue started after last deployment.",
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.P2,
    category: "API",
    creatorIndex: 0,
    assigneeIndex: 4,
    tagIndices: [3],
    hasAttachment: false,
  },
  {
    title: "Ticket SLA timer not pausing on waiting status",
    description:
      "When a ticket moves to 'Waiting on Customer' the SLA countdown timer should pause but continues running. This causes false SLA breaches.",
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.P3,
    category: "SLA",
    creatorIndex: 1,
    assigneeIndex: 5,
    tagIndices: [4],
    hasAttachment: false,
  },
  {
    title: "Email replies not threading into the ticket",
    description:
      "Customer email replies are creating new tickets instead of appending as comments. The Reply-To header is configured correctly.",
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.P3,
    category: "Email",
    creatorIndex: 2,
    assigneeIndex: 4,
    tagIndices: [8],
    hasAttachment: false,
  },
  {
    title: "Account logo not showing in customer portal",
    description:
      "The company logo uploaded in Branding Settings does not appear in the customer-facing portal. It shows the default SupportDesk logo.",
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.P4,
    category: "Branding",
    creatorIndex: 3,
    assigneeIndex: 5,
    tagIndices: [11],
    hasAttachment: true,
  },
  {
    title: "Long ticket descriptions get truncated in email",
    description:
      "When a ticket description exceeds ~500 characters the email notification sent to the customer is truncated mid-sentence.",
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.P4,
    category: "Email",
    creatorIndex: 0,
    assigneeIndex: 4,
    tagIndices: [],
    hasAttachment: false,
  },
  {
    title: "Cannot assign ticket to agent via API",
    description:
      "PATCH /api/tickets/:id with { assigneeId: '<agentId>' } returns 422 Unprocessable Entity. Manual assignment in the UI works.",
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.P3,
    category: "API",
    creatorIndex: 1,
    assigneeIndex: 5,
    tagIndices: [3],
    hasAttachment: false,
  },
  {
    title: "Keyboard shortcut 'N' opens wrong modal",
    description:
      "Pressing N on the ticket list opens the 'New Tag' dialog instead of 'New Ticket'. Regression introduced in v4.2.0.",
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.P4,
    category: "UI",
    creatorIndex: 2,
    assigneeIndex: 4,
    tagIndices: [5],
    hasAttachment: false,
  },
  {
    title: "Spanish locale showing English error messages",
    description:
      "Users with browser language set to Spanish (es-ES) see validation error messages in English. All other UI text is translated correctly.",
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.P3,
    category: "Localisation",
    creatorIndex: 3,
    assigneeIndex: 5,
    tagIndices: [5],
    hasAttachment: false,
  },

  // ---- CLOSED (10) ----
  {
    title: "Account shows trial expired incorrectly",
    description:
      "Account was showing 'Trial expired' even though payment had been processed. The issue self-resolved after the billing system synced.",
    status: TicketStatus.CLOSED,
    priority: TicketPriority.P3,
    category: "Billing",
    creatorIndex: 0,
    assigneeIndex: 4,
    tagIndices: [0, 1],
    hasAttachment: false,
  },
  {
    title: "Duplicate ticket created on page refresh",
    description:
      "Refreshing the browser immediately after submitting a ticket was creating a second identical ticket. Fixed by idempotency key.",
    status: TicketStatus.CLOSED,
    priority: TicketPriority.P3,
    category: "UI",
    creatorIndex: 1,
    assigneeIndex: 5,
    tagIndices: [5],
    hasAttachment: false,
  },
  {
    title: "API docs show incorrect authentication header",
    description:
      "API documentation showed 'X-API-Token' but the server expects 'Authorization: Bearer'. Docs have been updated.",
    status: TicketStatus.CLOSED,
    priority: TicketPriority.P4,
    category: "Documentation",
    creatorIndex: 2,
    assigneeIndex: 4,
    tagIndices: [3],
    hasAttachment: false,
  },
  {
    title: "Webhook signature validation failing",
    description:
      "Webhook HMAC signature verification was failing due to extra whitespace in the secret key stored server-side. Resolved at infrastructure level.",
    status: TicketStatus.CLOSED,
    priority: TicketPriority.P2,
    category: "Integrations",
    creatorIndex: 3,
    assigneeIndex: 5,
    tagIndices: [8, 10],
    hasAttachment: false,
  },
  {
    title: "High memory usage on agent dashboard",
    description:
      "The agent dashboard was consuming >1.2GB of RAM on Firefox due to an event listener leak. Fixed in v4.2.1 patch.",
    status: TicketStatus.CLOSED,
    priority: TicketPriority.P2,
    category: "Performance",
    creatorIndex: 0,
    assigneeIndex: 4,
    tagIndices: [4],
    hasAttachment: false,
  },
  {
    title: "New ticket form loses data on browser back",
    description:
      "Navigating back from the new ticket form cleared all entered data. Added sessionStorage persistence to form state.",
    status: TicketStatus.CLOSED,
    priority: TicketPriority.P3,
    category: "UI",
    creatorIndex: 1,
    assigneeIndex: 5,
    tagIndices: [5],
    hasAttachment: false,
  },
  {
    title: "Incorrect VAT applied to EU invoices",
    description:
      "EU customers with a valid VAT number were still having 20% VAT applied. Fixed in billing engine after VAT number validation was corrected.",
    status: TicketStatus.CLOSED,
    priority: TicketPriority.P1,
    category: "Billing",
    creatorIndex: 2,
    assigneeIndex: 4,
    tagIndices: [0],
    hasAttachment: true,
  },
  {
    title: "Comment timestamps displaying in UTC only",
    description:
      "Comment timestamps were always shown in UTC regardless of user timezone preference. Fixed by applying account timezone on render.",
    status: TicketStatus.CLOSED,
    priority: TicketPriority.P3,
    category: "UI",
    creatorIndex: 3,
    assigneeIndex: 5,
    tagIndices: [5],
    hasAttachment: false,
  },
  {
    title: "Mobile session expires too quickly",
    description:
      "Mobile users were being logged out after 15 minutes of inactivity instead of the configured 8 hours. Resolved by correcting token TTL.",
    status: TicketStatus.CLOSED,
    priority: TicketPriority.P3,
    category: "Mobile",
    creatorIndex: 0,
    assigneeIndex: 4,
    tagIndices: [7, 10],
    hasAttachment: false,
  },
  {
    title: "Export includes deactivated user data",
    description:
      "CSV exports were including rows for deactivated users. Added an active_only filter that is now applied by default.",
    status: TicketStatus.CLOSED,
    priority: TicketPriority.P4,
    category: "Data",
    creatorIndex: 1,
    assigneeIndex: 5,
    tagIndices: [6, 1],
    hasAttachment: false,
  },
];

const COMMENT_TEMPLATES = [
  {
    body: "Thank you for reaching out. We have received your ticket and are investigating.",
    isInternal: false,
  },
  {
    body: "Reproduced internally. Root cause appears to be a caching issue — escalating to the platform team.",
    isInternal: true,
  },
  {
    body: "Could you please share the exact error message or a screenshot so we can investigate further?",
    isInternal: false,
  },
  {
    body: "Checked server logs — no errors visible at the reported timestamp. Requesting extended diagnostics from customer.",
    isInternal: true,
  },
  {
    body: "We have deployed a fix to staging. Can you please test on your end and let us know if the issue persists?",
    isInternal: false,
  },
  {
    body: "Platform team confirmed: configuration drift in the CDN was causing the problem. Rolling back now.",
    isInternal: true,
  },
  {
    body: "The issue has been resolved. Please feel free to reopen the ticket if you encounter this again.",
    isInternal: false,
  },
  {
    body: "Closing after 7 days with no customer response per standard SLA policy.",
    isInternal: true,
  },
] as const;

const ATTACHMENT_TEMPLATES = [
  { fileName: "screenshot-error.png", storageRef: "dev://uploads/seed/screenshot-error.png" },
  { fileName: "invoice-2047.pdf", storageRef: "dev://uploads/seed/invoice-2047.pdf" },
  { fileName: "debug-logs.txt", storageRef: "dev://uploads/seed/debug-logs.txt" },
  { fileName: "screen-recording.mp4", storageRef: "dev://uploads/seed/screen-recording.mp4" },
] as const;

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("🌱  SupportDesk seed starting…");
  console.log(`    DATABASE_URL → ${connectionString!.replace(/:([^:@]+)@/, ":***@")}`);

  // ── 1. Upsert users (7) with deterministic UUIDs ──────────────────────────
  console.log("\n👤  Upserting users…");
  const users = await Promise.all(
    USER_SEEDS.map((u, idx) => {
      const userId = deterministicUuid(NS_USER, idx + 1);
      return prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          passwordHash: u.passwordHash,
          role: u.role,
        },
        create: {
          id: userId,
          name: u.name,
          email: u.email,
          passwordHash: u.passwordHash,
          role: u.role,
        },
      });
    })
  );
  console.log(`    ✔ ${users.length} users ready.`);

  // ── 2. Upsert tags (12) with deterministic UUIDs ──────────────────────────
  console.log("\n🏷️   Upserting tags…");
  const tags = await Promise.all(
    TAG_SEEDS.map((name, idx) => {
      const tagId = deterministicUuid(NS_TAG, idx + 1);
      return prisma.tag.upsert({
        where: { name },
        update: {},
        create: { id: tagId, name },
      });
    })
  );
  console.log(`    ✔ ${tags.length} tags ready.`);

  // ── 3. Seed 50 tickets with deterministic UUIDs (idempotent) ──────────────
  console.log("\n🎫  Seeding 50 tickets…");

  for (let i = 0; i < TICKET_SEEDS.length; i++) {
    const seed = TICKET_SEEDS[i];
    const ticketId = deterministicUuid(NS_TICKET, i + 1);

    const creator = users[seed.creatorIndex];
    const assignee =
      seed.assigneeIndex !== null ? users[seed.assigneeIndex] : null;

    await prisma.$transaction(async (tx) => {
      // Upsert ticket
      const ticket = await tx.ticket.upsert({
        where: { id: ticketId },
        update: {
          title: seed.title,
          description: seed.description,
          status: seed.status,
          priority: seed.priority,
          category: seed.category,
          createdById: creator.id,
          assigneeId: assignee ? assignee.id : null,
        },
        create: {
          id: ticketId,
          title: seed.title,
          description: seed.description,
          status: seed.status,
          priority: seed.priority,
          category: seed.category,
          createdById: creator.id,
          assigneeId: assignee ? assignee.id : null,
        },
      });

      // Comments: 1 comment for even ticket index, 2 comments for odd
      const commentCount = i % 2 === 0 ? 1 : 2;
      for (let c = 0; c < commentCount; c++) {
        const commentId = deterministicUuid(NS_COMMENT, i * 10 + c + 1);
        const tpl = pick(COMMENT_TEMPLATES, i + c);
        const authorId = tpl.isInternal
          ? (assignee?.id ?? users[6].id) // Staff (assignee or admin fallback)
          : creator.id;                   // Customer

        await tx.comment.upsert({
          where: { id: commentId },
          update: {
            ticketId: ticket.id,
            authorId,
            body: tpl.body,
            isInternal: tpl.isInternal,
          },
          create: {
            id: commentId,
            ticketId: ticket.id,
            authorId,
            body: tpl.body,
            isInternal: tpl.isInternal,
          },
        });
      }

      // Attachment (if ticket has one)
      if (seed.hasAttachment) {
        const attachmentId = deterministicUuid(NS_ATTACHMENT, i + 1);
        const atpl = pick(ATTACHMENT_TEMPLATES, i);
        await tx.attachment.upsert({
          where: { id: attachmentId },
          update: {
            ticketId: ticket.id,
            fileName: atpl.fileName,
            storageRef: atpl.storageRef,
          },
          create: {
            id: attachmentId,
            ticketId: ticket.id,
            fileName: atpl.fileName,
            storageRef: atpl.storageRef,
          },
        });
      }

      // Tags: composite PK (ticketId, tagId) upsert
      for (const tagIdx of seed.tagIndices) {
        const tag = tags[tagIdx];
        await tx.ticketTag.upsert({
          where: { ticketId_tagId: { ticketId: ticket.id, tagId: tag.id } },
          update: {},
          create: { ticketId: ticket.id, tagId: tag.id },
        });
      }

      // Ticket creation audit log: deterministic UUID per ticket (insert-only, append-only)
      const ticketAuditId = deterministicUuid(NS_AUDIT, i + 1);
      await tx.auditLog.createMany({
        data: [
          {
            id: ticketAuditId,
            actorId: creator.id,
            action: "ticket.created",
            targetType: "Ticket",
            targetId: ticket.id,
            details: {
              title: ticket.title,
              status: ticket.status,
              priority: ticket.priority,
            },
          },
        ],
        skipDuplicates: true,
      });
    });

    process.stdout.write(`\r    ✔ ${i + 1}/50 tickets seeded`);
  }

  console.log("\n");

  // ── 4. Summary audit log (deterministic UUID, insert-only) ─────────────────
  const summaryAuditId = deterministicUuid(NS_AUDIT, 999999);
  await prisma.auditLog.createMany({
    data: [
      {
        id: summaryAuditId,
        actorId: users[6].id, // Sofia (admin)
        action: "seed.completed",
        targetType: "System",
        targetId: "seed-script",
        details: {
          ticketsSeeded: 50,
          usersSeeded: users.length,
          tagsSeeded: tags.length,
        },
      },
    ],
    skipDuplicates: true,
  });

  // ── 5. Final counts ────────────────────────────────────────────────────────
  const [ticketCount, userCount, commentCount, tagCount, attachmentCount, auditCount] =
    await Promise.all([
      prisma.ticket.count(),
      prisma.user.count(),
      prisma.comment.count(),
      prisma.tag.count(),
      prisma.attachment.count(),
      prisma.auditLog.count(),
    ]);

  console.log("📊  Database totals after seed:");
  console.log(`    users:       ${userCount}`);
  console.log(`    tickets:     ${ticketCount}`);
  console.log(`    comments:    ${commentCount}`);
  console.log(`    tags:        ${tagCount}`);
  console.log(`    attachments: ${attachmentCount}`);
  console.log(`    audit_logs:  ${auditCount}`);
  console.log("\n✅  Seed complete.\n");
}

// ---------------------------------------------------------------------------
// Execution wrapper with safe connection cleanup
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  try {
    await main();
  } catch (err) {
    console.error("❌  Seed failed:", err);
    process.exitCode = 1;
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectErr) {
      console.error("❌  Failed to disconnect Prisma Client:", disconnectErr);
    }
    try {
      await pool.end();
    } catch (poolErr) {
      console.error("❌  Failed to close PostgreSQL pool:", poolErr);
    }
  }
}

void run();
