# Week 3 Engineering Weekly Report & Sign-off Gate
**SupportDesk — Days 13 to 18 (Frontend, Full-Stack Integration & AI Guardrails)**

---

## 1. Executive Summary

During Week 3 of the SupportDesk engineering sprint, the application evolved from a headless REST backend into a full-stack, AI-augmented customer support platform. 

Key milestones achieved:
- **Full-Stack Web Application (Days 13–15):** Built responsive, accessible React 18 interfaces powered by Vite, Tailwind CSS, TanStack Query, and React Hook Form with Zod resolvers. Delivered customer login, ticket creation, list filtering/search/sorting, and detailed conversation threads with public comments and internal staff notes.
- **AI Feature Implementation (Day 16):** Integrated Google Gemini (`gemini-3.5-flash-lite`) delivering **Feature A (AI Suggest Reply)** via Server-Sent Events (SSE) streaming and **Feature B (AI Auto-Categorisation & Priority)** via structured JSON output schemas with token-based cost tracking.
- **Enterprise Guardrails Hardening (Day 17):** Built a 5-layer defense-in-depth security perimeter: input length boundaries, XML context boundary delimitation, delimiter sanitization (`&lt;/...&gt;`), pre-invocation content moderation filter, deterministic PII masking for global and Indian identifiers (PAN, Aadhaar, bank accounts, mobile), per-user rate limiting (10 req/min/user), 10s request timeouts, and unified safe manual fallbacks (`AI unavailable — reply manually.`).
- **Demo & Full-Stack Sign-off (Day 18):** Completed end-to-end demonstrations across customer and agent flows, verified live prompt injection defenses, authored comprehensive documentation (`docs/ai-features.md`), completed technical quizzes, and verified 282 passing automated tests with zero typecheck or build errors.

---

## 2. Daily Deliverables Summary (Days 13–18)

| Day | Focus Area | Deliverables Completed | Status |
|:---:|:---|:---|:---:|
| **Day 13** | Web Foundation & Auth | React 18 + Vite setup, Tailwind CSS theme, AuthContext, `POST /auth/login` integration, ProtectedRoute guard, accessible error alerts | **Verified Complete** |
| **Day 14** | Ticket Querying & Detail Screens | Ticket list view, search input, status/priority filters, pagination, ticket detail view, conversation thread, public comments, amber-badged internal notes | **Verified Complete** |
| **Day 15** | Create Ticket & Quality Audits | Ticket creation form with Zod client validation, accessible modals, responsive mobile audit, Lighthouse performance audit, Vitest suite (183 tests) | **Verified Complete** |
| **Day 16** | AI Feature Backend Integration | Google GenAI SDK client, Suggest Reply SSE streaming endpoint, Auto-Categorisation structured JSON endpoint, token usage & pricing calculator, RBAC protection | **Verified Complete** |
| **Day 17** | AI Guardrails & Evaluation | Input boundaries, XML delimiter isolation, Indian PII masking (PAN, Aadhaar, bank a/c, phone), content moderation pre-filter, 429 rate limiter, evaluation harness refactoring | **Verified Complete** |
| **Day 18** | Full-Stack Demo & Sign-off | End-to-end workflow demo, prompt injection proof, `docs/ai-features.md`, demo runbook, Week 3 quiz, retrospective, and weekly report | **Verified Complete** |

---

## 3. Pull Request & Git Status

- **Primary Branch:** `feat/day-17-ai-guardrails`
- **Head Commit:** `887a391` (Day 17 core) + uncommitted working tree enhancements (eval harness, collision tests, Day 18 docs)
- **Base Branch (Stacked):** `feat/day-16-ai-features`
- **Live Pull Requests:**
  - [PR #21](https://github.com/PiyushNavangulQloax/SupportDesk/pull/21): Frontend Web Client & Ticket Workflows (Days 13–15)
  - [PR #22](https://github.com/PiyushNavangulQloax/SupportDesk/pull/22): AI Feature Backend Integration (Day 16)
  - [PR #23](https://github.com/PiyushNavangulQloax/SupportDesk/pull/23): AI Guardrails, PII Masking, Rate Limiting & Evaluation Harness (Day 17/18)
- **Working Tree Cleanliness:** Preserved untracked demo file `supportdesk_messy_express_demo.js` without committing.

---

## 4. Test Results and Verification Evidence

### A. Frontend Quality Gates (Vitest + React Testing Library)
- **Command:** `npm --prefix apps/web test`
- **Result:** **183 tests passed, 0 failed** across 12 test files:
  - `tests/ai.features.test.tsx`: 16 passed (Suggest reply streaming, auto-categorise modal, role guarding)
  - `tests/CreateTicket.test.tsx`: 14 passed (Validation, submission, error handling)
  - `tests/TicketDetail.test.tsx`: 12 passed (Comments, internal notes, status update)
  - `tests/TicketList.test.tsx`: 16 passed (Search, filtering, pagination)
  - `tests/LoginPage.test.tsx`: 8 passed (Auth, errors, navigation)
  - `tests/components.ui.test.tsx`: 70 passed (Accessible badges, buttons, inputs)
  - `tests/ticket.hooks.test.tsx`: 10 passed (React Query caching & invalidation)
  - `tests/tickets.api.test.ts`: 17 passed (API client fetchers)
  - `tests/api-client.test.ts`: 9 passed (Axios/fetch client error envelopes)
  - `tests/Header.test.tsx`: 5 passed (User navigation & logout)
  - `tests/auth.test.tsx`: 4 passed (AuthProvider session management)
  - `tests/ProtectedRoute.test.tsx`: 2 passed (Route redirection)

### B. Backend AI & Guardrails Quality Gates (Jest ESM)
- **Command:** `npm --prefix apps/api run test:jest -- tests/ai.*.spec.ts tests/gemini.client.spec.ts`
- **Result:** **99 tests passed, 0 failed** across 4 test suites:
  - `tests/ai.guardrails.spec.ts`: **55 passed** (PII masking, Indian regex collision suite, comment moderation, 10 malicious attack samples, timeout fallback, 429 rate limiter)
  - `tests/ai.feature.spec.ts`: **26 passed** (Suggest reply, auto-categorize, RBAC, pricing models)
  - `tests/gemini.client.spec.ts`: **11 passed** (Client configuration, lazy SDK init, 503 unavailable errors)
  - `tests/ai.evaluation.spec.ts`: **7 passed** (Production pipeline invocation, failure reporting, mock disclaimers, accuracy math)

### C. Typecheck & Production Build
- `npm --prefix apps/web run typecheck`: **Clean pass (0 errors)**
- `npm --prefix apps/web run build`: **Clean pass (0 errors)** &rarr; `dist/index.html` (gzip: 134 kB JS, 5.9 kB CSS)
- `npm --prefix apps/api run typecheck`: **Clean pass (0 errors)**
- `npm --prefix apps/api run build`: **Clean pass (0 errors)**

---

## 5. Demo Checklist Verification

| Checklist Item | Demo Status | Verification Details |
| :--- | :---: | :--- |
| **[x] Customer login** | **PASS** | Authenticates `customer@example.com`, receives JWT, sets customer context. |
| **[x] Create a ticket** | **PASS** | Submits title, priority, category, description with Zod validation. |
| **[x] Agent ticket list and filters** | **PASS** | Live search, category/priority/status filters, pagination. |
| **[x] Ticket detail, comments and status update** | **PASS** | Public comment thread, amber internal notes, status transition. |
| **[x] AI Suggest Reply** | **PASS** | SSE token streaming into reviewable draft buffer; human edits before sending. |
| **[x] AI auto-categorisation and priority** | **PASS** | Structured JSON proposal; zero autonomous database mutations. |
| **[x] Live prompt-injection test** | **PASS** | `INJ-001` (override) & `INJ-003` (delimiter breakout) neutralized via `<untrusted_...>` tags and entity escaping. |
| **[x] Invalid AI output rejection** | **PASS** | Schema tampering (`INJ-010`, invalid category, `P0` priority) rejected via Zod with HTTP 502. |
| **[x] AI failure/manual fallback** | **PASS** | Returns `"AI unavailable — reply manually."` on timeouts and 503 errors without breaking ticket CRUD. |
| **[x] Evaluation score and known limitations** | **PASS** | Documented in `day-17-evaluation-report.md`; transparently states official evaluation is blocked awaiting lead dataset. |

---

## 6. Official EOD / Weekly Report Form

* **Demo completed:** Yes
* **Documentation PR:** [PR #23](https://github.com/PiyushNavangulQloax/SupportDesk/pull/23)
* **Other PR links:** [PR #21](https://github.com/PiyushNavangulQloax/SupportDesk/pull/21) (Web UI), [PR #22](https://github.com/PiyushNavangulQloax/SupportDesk/pull/22) (AI Features)
* **AI features demonstrated:** Feature A: Suggest Reply Stream (SSE), Feature B: Auto-Categorisation & Priority (Structured JSON)
* **Prompt-injection test result:** PASSED (10/10 malicious attack samples neutralized and verified)
* **Evaluation accuracy:** 20% Category / 45% Priority (Automated mock pipeline verification; 20/20 successful pipeline calls; official live accuracy blocked awaiting lead dataset)
* **Quiz score:** 11/11 (100% Technical Accuracy)
* **Key learnings:**
  1. Context boundary delimitation and entity escaping (`&lt;/...&gt;`) as architectural root-cause mitigations for prompt injection.
  2. SSE socket lifecycle management using `res.on('close')` to prevent orphan token generation on client disconnects.
* **Retrospective — Start / Stop / Continue:**
  - *Start:* Redis-backed distributed rate limiting (`rate-limit-redis`) for clustered containers; PostgreSQL `pg_trgm` GIN trigram indexes for fast full-text ticket search.
  - *Stop:* Silent fallback heuristics that mask genuine provider errors; over-constraining international telco exchange code regexes.
  - *Continue:* Layered defense-in-depth; reviewable draft buffering (human-in-the-loop); transparent quality gates and honest blocker declarations.
* **Pending issues / follow-up tasks:**
  - Await project lead's official 20 labelled tickets to execute live model evaluation and demonstrate &ge; 80% accuracy.
  - Merge stacked PRs #21, #22, and #23 into main.
* **Week 3 sign-off:** **Pass (Implementation-Complete; Official Lead Acceptance Blocked Awaiting Dataset)**
* **Term of the day:** **Sign-off** — Formal confirmation that agreed requirements and acceptance criteria have been met.
