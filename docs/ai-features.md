# SupportDesk — AI Features Specification & Architecture Guide

**Version:** 2.0.0  
**Last Updated:** Saturday, 28 November 2026  
**Scope:** AI Backend Engine, Streaming Delivery, Security Guardrails & Evaluation  
**Status:** Verified & Production-Hardened  

---

## 1. Executive Overview

SupportDesk integrates Google Gemini Large Language Models (LLMs) to enhance support agent efficiency while strictly enforcing enterprise security guardrails. Untrusted customer content is isolated so that malicious inputs cannot hijack system instructions, exfiltrate sensitive data, or perform unauthorized operations.

SupportDesk provides two core AI capabilities:
1. **Feature A: AI Suggest Reply (Streaming Draft Assistant):** Drafts contextual, empathetic customer responses by synthesizing ticket descriptions and recent conversation history via Server-Sent Events (SSE). The draft is presented to human agents for review, editing, and approval before sending.
2. **Feature B: AI Auto-Categorisation & Priority (Structured Triage):** Analyzes incoming customer support issues to propose appropriate support categories and urgency priority tiers with structured reasoning, strictly validated via Zod schemas.

```mermaid
flowchart TD
    subgraph Frontend["Web Client (React + TanStack Query)"]
        UI_Agent["Support Agent Workspace"]
        UI_Draft["Reviewable Draft Editor"]
        UI_Triage["Proposed Category / Priority"]
    end

    subgraph SecurityPerimeter["Security Perimeter & HTTP Layer"]
        AuthMiddleware["JWT Authentication + RBAC (Agent/Admin Only)"]
        RateLimiter["Per-User Rate Limiter (10 req/min/user)"]
        InputVal["Zod Request Validation"]
    end

    subgraph AIServiceLayer["AiService Domain Layer"]
        ModFilter["Content Moderation Filter (Fast Regex Safety)"]
        PIIMasker["Deterministic PII Masker (Global & Indian Identifiers)"]
        PromptBuilder["Prompt Builder (XML Delimiters + Sanitization)"]
        TimeoutGuard["Request Timeout (10s Promise.race)"]
        ZodValidator["Structured Output Zod Validation"]
    end

    subgraph ExternalProvider["AI Provider Boundary"]
        GeminiClient["Google GenAI SDK (gemini-3.5-flash-lite)"]
    end

    UI_Agent -->|HTTP POST| AuthMiddleware
    AuthMiddleware --> RateLimiter
    RateLimiter --> InputVal
    InputVal --> ModFilter
    ModFilter -- Unsafe Content --> FallbackErr["HTTP 400 (AI_CONTENT_MODERATION_BLOCKED)"]
    ModFilter -- Safe Content --> PIIMasker
    PIIMasker --> PromptBuilder
    PromptBuilder --> TimeoutGuard
    TimeoutGuard --> GeminiClient
    GeminiClient -- SSE Token Stream --> UI_Draft
    GeminiClient -- Structured JSON --> ZodValidator
    ZodValidator --> UI_Triage
```

---

## 2. Feature A: AI Suggest Reply

### 2.1 Overview & Purpose
Support agents spend significant time re-reading long ticket histories and drafting initial replies. Feature A synthesizes the original ticket description and up to 5 recent public customer comments to stream a professional, resolution-oriented draft. 

> [!IMPORTANT]
> **Human-in-the-Loop Constraint:** The AI suggestion is **never automatically posted or sent to the customer**. It is delivered via SSE into an agent draft staging buffer where the agent can review, modify, or discard the draft prior to submission.

### 2.2 User Flow & Backend Endpoint
1. **Trigger:** The agent opens an existing ticket in the web UI (`/tickets/:id`) and clicks **"Suggest Reply"**.
2. **Agent Guidance (Optional):** The agent may enter optional draft guidance (e.g., *"Offer a 10% discount for the delay"*, max 500 chars).
3. **HTTP Endpoint:** `POST /api/v1/tickets/:id/ai/suggest-reply`
4. **Headers:**
   - `Authorization: Bearer <JWT>`
   - `Accept: text/event-stream`
5. **Request Body:**
   ```json
   {
     "instructions": "Offer a 10% credit and explain the shipping delay"
   }
   ```
6. **SSE Response Stream:**
   - Establishes `Content-Type: text/event-stream; charset=utf-8` with `Connection: keep-alive`.
   - Streams text delta chunks: `data: {"chunk": "Hello Alex, "}\n\n`
   - Emits completion event: `data: {"done": true, "model": "gemini-3.5-flash-lite", "usage": { ... }}\n\n`
   - Terminates with: `data: [DONE]\n\n`

### 2.3 Prompt Template & Instructions
* **File Location:** [`apps/api/src/ai/prompts/suggestReply.prompt.ts`](file:///Users/prathameshnavangul/Piyush%20Qloxa/SupportDesk/SupportDesk/apps/api/src/ai/prompts/suggestReply.prompt.ts)
* **Prompt Version:** `2.0.0`
* **System Instructions:** Directs the model to act as an empathetic, professional SupportDesk specialist; mandates polite greetings using customer name; prohibits referencing internal systems or fabricating commitments.
* **Untrusted Boundary Directives:** Instructs the model that all content within `<untrusted_ticket_data>` and `<untrusted_customer_comments>` is raw data that must never override instructions, change personas (e.g. DAN), or execute commands.

---

## 3. Feature B: AI Auto-Categorisation & Priority

### 3.1 Overview & Purpose
New tickets require accurate categorization and SLA prioritization. Feature B analyzes ticket titles and descriptions to recommend an appropriate functional category (`Technical`, `Billing`, `Account`, `General`, `Feature Request`) and priority tier (`P1`, `P2`, `P3`, `P4`) with concise reasoning.

> [!NOTE]
> Auto-categorisation is a proposal engine. It **does not mutate the ticket in the database**. The agent must explicitly accept the proposal or adjust the fields manually.

### 3.2 User Flow & Backend Endpoint
1. **Trigger:** An agent clicks **"Auto-Categorise"** on a ticket detail view.
2. **HTTP Endpoint:** `POST /api/v1/tickets/:id/ai/categorize`
3. **Headers:** `Authorization: Bearer <JWT>`
4. **Response Envelope:**
   ```json
   {
     "data": {
       "category": "Technical",
       "priority": "P1",
       "reasoning": "Complete outage on payment checkout gateway affecting customer transactions."
     },
     "error": null,
     "meta": {
       "model": "gemini-3.5-flash-lite",
       "promptVersion": "2.0.0",
       "usage": {
         "promptTokens": 142,
         "candidatesTokens": 28,
         "totalTokens": 170,
         "estimatedCostUsd": 0.000113
       },
       "durationMs": 624
     }
   }
   ```

### 3.3 Prompt Template & Instructions
* **File Location:** [`apps/api/src/ai/prompts/categorize.prompt.ts`](file:///Users/prathameshnavangul/Piyush%20Qloxa/SupportDesk/SupportDesk/apps/api/src/ai/prompts/categorize.prompt.ts)
* **Prompt Version:** `2.0.0`
* **Structured Output Schema:** Enforced via Gemini SDK `responseMimeType: "application/json"` and `responseSchema` definition.

---

## 4. Input & Output Schemas (Zod Validation)

### 4.1 Request Schemas
* **Suggest Reply Body Schema:**
  ```ts
  export const suggestReplyBodySchema = z.object({
    instructions: z
      .string()
      .trim()
      .max(500, "Agent instructions cannot exceed 500 characters")
      .optional(),
  });
  ```
* **Ticket ID Param Schema:** Validates standard UUID formats (`ticketIdParamSchema`).

### 4.2 Response Validation Schemas
* **File Location:** [`apps/api/src/ai/schemas/ai.schema.ts`](file:///Users/prathameshnavangul/Piyush%20Qloxa/SupportDesk/SupportDesk/apps/api/src/ai/schemas/ai.schema.ts)
* **Categories Enum:** `"Technical" | "Billing" | "Account" | "General" | "Feature Request"`
* **Priorities Enum:** `"P1" | "P2" | "P3" | "P4"`
* **Zod Schema:**
  ```ts
  export const aiCategorizeResponseSchema = z.object({
    category: z.enum(SUPPORT_CATEGORIES, {
      message: "Category must be Technical, Billing, Account, General, or Feature Request",
    }),
    priority: z.enum(SUPPORT_PRIORITIES, {
      message: "Priority must be P1, P2, P3, or P4",
    }),
    reasoning: z
      .string()
      .trim()
      .min(1, "Reasoning cannot be empty")
      .max(500, "Reasoning cannot exceed 500 characters"),
  });
  ```
* **Rejection Rule:** Any output returning an unknown category, an invalid priority tier (e.g. `P0`), empty reasoning, or non-JSON formatting throws HTTP 502 `AI_SCHEMA_VALIDATION_ERROR` or `AI_INVALID_OUTPUT`.

---

## 5. Security Guardrails Architecture

SupportDesk implements a defense-in-depth security model across five distinct protective layers:

```
[ Incoming Request ]
         │
         ▼
[ Layer 1: Access Control & Rate Limiting ] ──► Reject unauthenticated, customers (403), or >10 req/min (429)
         │
         ▼
[ Layer 2: Input Boundaries & Truncation ] ──► Enforce title (255), desc (4000), comments (5x1000), instructions (500)
         │
         ▼
[ Layer 3: Safety & Content Moderation ] ──► Block violence, self-harm, child exploitation, script tags (400)
         │
         ▼
[ Layer 4: PII Redaction ] ──► Mask PAN, Aadhaar, bank accounts, phones, cards, tokens, emails, IPs
         │
         ▼
[ Layer 5: Untrusted Boundary Delimitation ] ──► XML tag encapsulation + sanitize </untrusted_...> breakout tags
         │
         ▼
[ Layer 6: Execution Timeout & Schema Gate ] ──► 10s request timeout + strict Zod schema parse
```

### 5.1 Layer 1: Authentication, RBAC & Rate Limiting
* **Role Guarding:** Restricted strictly to authenticated `AGENT` and `ADMIN` roles via `authorize(UserRole.AGENT, UserRole.ADMIN)`. End-customers (`CUSTOMER`) are rejected with HTTP 403 `FORBIDDEN`.
* **Per-User Rate Limiting:** Enforced via `aiRateLimiter` mounted on `aiRouter` ([`rateLimiter.ts`](file:///Users/prathameshnavangul/Piyush%20Qloxa/SupportDesk/SupportDesk/apps/api/src/ai/guardrails/rateLimiter.ts)).
  - Window: 1 minute (`60,000 ms`).
  - Cap: Max 10 requests per window per user ID (`req.user.id`).
  - Violation: Returns HTTP 429 `RATE_LIMIT_EXCEEDED` with `retryAfterSeconds` metadata.
  - Isolation: Standard non-AI ticket viewing, creation, and commenting remain completely unthrottled.

### 5.2 Layer 2: Strict Input Boundaries & Server-Side Truncation
All inputs are constrained server-side during prompt interpolation:
* Ticket Title: max 255 characters (`MAX_TITLE_LENGTH`).
* Ticket Description: max 4,000 characters (`MAX_DESCRIPTION_LENGTH`).
* Recent Comments Context: max 5 public comments (`MAX_COMMENTS_COUNT = 5`).
* Comment Body Length: max 1,000 characters per comment (`MAX_COMMENT_LENGTH = 1000`).
* Agent Guidance: max 500 characters (`MAX_AGENT_INSTRUCTIONS_LENGTH = 500`).

### 5.3 Layer 3: Content Moderation Engine
* **File Location:** [`apps/api/src/ai/guardrails/contentModeration.ts`](file:///Users/prathameshnavangul/Piyush%20Qloxa/SupportDesk/SupportDesk/apps/api/src/ai/guardrails/contentModeration.ts)
* **Monitored Targets:** Ticket title, description, agent instructions, and all public customer comments.
* **Flagged Categories:**
  - `VIOLENCE_THREATS`: Explicit threats to kill, shoot, bomb, or murder staff.
  - `SELF_HARM`: Threats of suicide or self-harm.
  - `EXPLOITATION`: References to child abuse or exploitation.
  - `MALICIOUS_INJECTION_CODE`: Executable `<script>` tags, event handlers (`onerror`), or `javascript:alert`.
* **Behavior:** Blocks dispatch immediately; logs sanitized usage telemetry; returns HTTP 400 with `AI_CONTENT_MODERATION_BLOCKED`.

### 5.4 Layer 4: Sensitive Data & PII Masking
* **File Location:** [`apps/api/src/ai/guardrails/piiMasker.ts`](file:///Users/prathameshnavangul/Piyush%20Qloxa/SupportDesk/SupportDesk/apps/api/src/ai/guardrails/piiMasker.ts)
* **Execution Boundary:** Operates deterministically in memory before any string interpolation into prompts.
* **Redaction Rules:**
  - **Indian PAN:** 5 letters, 4 digits, 1 letter &rarr; `[PAN_REDACTED]`
  - **Indian Aadhaar:** 12-digit format (4-4-4, hyphenated, or contiguous starting 2–9) &rarr; `[AADHAAR_REDACTED]`
  - **Indian Bank Accounts:** 9–18 digits preceded by contextual account keywords &rarr; `[ACCOUNT_REDACTED]`
  - **Indian Mobile Numbers:** 10 digits starting 6–9 with optional `+91`, `0091`, or `0` &rarr; `[PHONE_REDACTED]`
  - **US & International Phones:** E.164 and standard formatted phone numbers &rarr; `[PHONE_REDACTED]`
  - **Credit & Debit Cards:** 13–19 digits (Visa, MC, Amex) &rarr; `[CARD_REDACTED]`
  - **Social Security Numbers (US SSN):** `xxx-xx-xxxx` &rarr; `[SSN_REDACTED]`
  - **Auth Secrets & Tokens:** Bearer tokens, `sk-`, `AIza`, `ghp_`, `AKIA`, and password fields &rarr; `[TOKEN_REDACTED]`
  - **IP Addresses:** IPv4 and IPv6 addresses &rarr; `[IP_REDACTED]`
  - **System UUIDs:** Protected via temporary reservation tokens (`___UUID_RESERVED_n___`) to prevent false-positive masking of internal ticket IDs.

### 5.5 Layer 5: Untrusted Context Isolation & Delimiter Sanitization
* All customer text is encapsulated within explicit XML delimiters:
  `<untrusted_ticket_data>` and `<untrusted_customer_comments>`.
* Injected closing tags (e.g. `</untrusted_ticket_data>`) are automatically sanitized into escaped entities: `&lt;/untrusted_ticket_data&gt;`.
* Developer instructions strictly instruct the model to ignore any command or role changes found inside untrusted tags.

---

## 6. Error Handling, Timeouts & Safe Manual Fallback

### 6.1 Strict Fallback Message
Across all AI failure modes, the system returns a unified, safe fallback message:
```text
AI unavailable — reply manually.
```

### 6.2 Failure Mode Matrix
| Failure Scenario | Detection Point | HTTP Status | Response / Behavior |
| :--- | :--- | :---: | :--- |
| **Provider Timeout (>10s)** | `withTimeout` Promise race | **504** | Fallback message returned; normal ticket CRUD continues uninterrupted. |
| **Unconfigured / Missing API Key** | `geminiClient.isConfigured()` | **503** | Controlled `AI_SERVICE_UNAVAILABLE` fallback returned. |
| **Provider Network / Outage** | `generateContent` catch block | **503** | Controlled fallback error returned; logged to telemetry. |
| **Malformed / Non-JSON Response** | `JSON.parse` catch block | **502** | `AI_INVALID_OUTPUT` error returned. |
| **Schema Validation Failure** | `aiCategorizeResponseSchema` | **502** | `AI_SCHEMA_VALIDATION_ERROR` error returned. |
| **Content Moderation Block** | `moderateContent` check | **400** | `AI_CONTENT_MODERATION_BLOCKED` error returned. |
| **Interrupted SSE Stream** | `res.on('close')` event | **200 (SSE)** | Halts stream cleanly; emits `event: error` if headers sent; cleans up listener. |

---

## 7. Model Evaluation, Benchmarks & Dataset Authenticity

### 7.1 Evaluation Harness Architecture
* **Script Location:** [`apps/api/src/ai/evaluation/evaluateCategorization.ts`](file:///Users/prathameshnavangul/Piyush%20Qloxa/SupportDesk/SupportDesk/apps/api/src/ai/evaluation/evaluateCategorization.ts)
* **Execution Command:** `npm --prefix apps/api run ai:eval` (or `npm run ai:eval -- --live`)
* **Pipeline Delegation:** Invokes the genuine `AiService.categorizeTicket()` production pipeline using an in-memory repository.
* **Separation of Modes:**
  - **LIVE Mode (`--live`):** Connects to Google Gemini API via `geminiClient`. If credentials are missing, blocks execution immediately without faking results.
  - **MOCK Mode (Default):** Runs offline automated pipeline verification using `MockEvaluationGeminiClient`. Clearly disclaims that scores verify pipeline mechanics rather than LLM performance.

### 7.2 Dataset Authenticity & Official Acceptance Blocker
* **Dataset File:** [`apps/api/src/ai/datasets/evaluationTickets.ts`](file:///Users/prathameshnavangul/Piyush%20Qloxa/SupportDesk/SupportDesk/apps/api/src/ai/datasets/evaluationTickets.ts) (20 tickets)
* **Origin Status:** **SYNTHETIC.** The 20 tickets were generated during implementation to establish baseline test fixtures. The official dataset from the project lead was not committed to the repository.
* **Official Acceptance Declaration:**
  > [!CAUTION]
  > **Official acceptance evaluation: BLOCKED — awaiting project lead's labelled dataset.**  
  > SupportDesk does NOT claim that the &ge; 80% model acceptance target has been met until the official lead-provided dataset is evaluated against the live Gemini model.

---

## 8. Known Limitations, Risks & Production Improvements

1. **In-Memory Rate Limiting on Horizontal Pods:**
   - *Limitation:* `express-rate-limit` currently uses an in-memory store.
   - *Production Risk:* Multi-instance or Kubernetes deployments will have per-pod rate limits rather than cluster-wide limits.
   - *Improvement:* Transition to a shared Redis store (`rate-limit-redis`) for clustered deployments.
2. **Conservative Standalone 12-Digit Masking:**
   - *Limitation:* Contiguous 12-digit numbers starting with `2–9` without prefixes are conservatively masked as `[AADHAAR_REDACTED]` to prevent national ID leaks.
   - *Mitigation:* Alphanumeric references (e.g. `REF-123456789012` or `INV123456789012`) are preserved without redaction.
3. **Database Migration to Full-Text Search Indexing:**
   - *Improvement:* Enhance ticket and comment retrieval with PostgreSQL GIN trigram indexes (`pg_trgm`) for sub-50ms retrieval on large historical datasets.

---

## 9. Setup & Configuration Runbook

### 9.1 Environment Variables
Configure the following keys in `apps/api/.env` (never commit real credentials):

```bash
# Environment Mode
NODE_ENV=development
PORT=5000

# PostgreSQL Database Connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/supportdesk?schema=public"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5433/supportdesk_test?schema=public"

# Authentication Secrets (Must be at least 32 characters)
JWT_SECRET="your-secure-jwt-secret-at-least-32-chars-long"
JWT_EXPIRES_IN="1d"
CORS_ORIGIN="http://localhost:5173"

# Google Gemini AI Provider Configuration (Backend Only)
# GEMINI_API_KEY is read server-side only; never exposed to frontend or client builds
GEMINI_API_KEY="your-google-ai-studio-api-key"
AI_MODEL="gemini-3.5-flash-lite"
AI_MAX_OUTPUT_TOKENS=1000
```

### 9.2 Running the Application & Test Suites
```bash
# 1. Start database via Docker Compose
docker compose up -d

# 2. Run database migrations and seed baseline data
npm --prefix apps/api run prisma:migrate
npm --prefix apps/api run seed

# 3. Execute backend quality gates (Typecheck & AI Test Suites)
npm --prefix apps/api run typecheck
npm --prefix apps/api run test:jest -- tests/ai.*.spec.ts tests/gemini.client.spec.ts

# 4. Execute frontend quality gates
npm --prefix apps/web run typecheck
npm --prefix apps/web test

# 5. Start development servers
npm --prefix apps/api run dev    # Starts API on http://localhost:5000
npm --prefix apps/web run dev    # Starts Web UI on http://localhost:5173
```
