# Week 3 Engineering Retrospective
**SupportDesk — Frontend Integration, Full-Stack Delivery & AI Features**

---

## 1. Retrospective Status & Sprint Context
- **Sprint Period:** Week 3 (Days 13 through 18)
- **Focus Areas:**
  - Days 13–15: Frontend web application (React, TanStack Query, Tailwind CSS, ticket list, detail, creation, accessible modals, and Supertest/Vitest quality gates).
  - Day 16: AI Feature backend integration (Gemini client, Suggest Reply SSE streaming, Auto-categorisation structured JSON, pricing models).
  - Day 17: AI Guardrails hardening (Input length bounds, untrusted XML delimitation, Indian & global PII masking, content moderation pre-filter, 429 rate limiter, evaluation harness refactoring).
  - Day 18: Full-stack end-to-end demo, documentation, and Week 3 sign-off.
- **Participants:** Full-Stack Engineering Team

---

## 2. Keep / Start / Stop Framework

### Keep (What worked well and should continue)
1. **Layered Defense-in-Depth for AI Features:**
   Enforcing security guardrails at every layer (Route rate limiter &rarr; Content moderation pre-filter &rarr; PII redaction &rarr; XML context boundaries &rarr; Zod schema parsing) prevented prompt injection and data leaks without relying on brittle LLM prompts alone.
2. **Reviewable Draft Buffering (Human-in-the-Loop):**
   Never letting the AI autonomously post comments or mutate database records was an essential safety win. Streaming draft proposals directly into an editable textarea gave agents full agency.
3. **Stacked Git PR Strategy:**
   Maintaining clean, reviewable, stacked feature branches (`feat/day-16-ai-features` &rarr; `feat/day-17-ai-guardrails`) kept pull requests focused and decoupled backend API enhancements from frontend UI additions.
4. **Transparent Quality Gates & Honest Evaluation:**
   Refactoring the evaluation script to eliminate fake 100% heuristic scores and explicitly declaring official acceptance blocked until lead datasets arrive established genuine engineering integrity.

### Start (What new practices should be introduced)
1. **Shared Distributed Rate Limiting (Redis):**
   `express-rate-limit` currently uses an in-memory store. For Week 4 multi-instance deployments, we must start using `rate-limit-redis` to share rate-limiting windows across load-balanced API containers.
2. **Contract-Driven API Mocking in Frontend Tests:**
   While MSW and manual mocks worked well in Vitest, establishing automated OpenAPI schema validation against frontend API mocks will prevent contract drift between Express controllers and React Query hooks.
3. **Centralized Test Fixture Repositories:**
   Creating dedicated test repository builders (e.g. `createMockTicketRecord()`) prevented duplication across `ai.feature.spec.ts`, `ai.guardrails.spec.ts`, and `ai.evaluation.spec.ts`.

### Stop (What caused avoidable friction or delays)
1. **Silent Fallbacks Masking Failure Modes:**
   Early evaluation implementations silently swallowed provider exceptions and fell back to hardcoded regex heuristics, fabricating a misleading 100% score. We stopped this completely: provider failures must always record explicit failures.
2. **Over-Constraining International Telco Regexes:**
   Initial US phone regex required central office codes to start with 2–9, breaking standard customer test samples (`555-123-4567`). Regex patterns must be validated against realistic customer data fixtures.
3. **Mixing Test Environments:**
   Attempting to bind real TCP ports in ephemeral sandbox environments caused Supertest EPERM errors. Testing Express middleware in-process and integration tests against dedicated Docker ports resolved this cleanly.

---

## 3. Technical Learnings (2 Required)

### Learning 1: Context Boundary Delimitation vs. Instruction Hijacking (Root Cause Analysis)
* **Insight:** LLMs operate on a unified token stream where instructions and data are indistinguishable by default. Prompt injection occurs when untrusted user data is treated by the attention mechanism as control instructions.
* **Architecture Solution:** Neutralizing prompt injection requires multi-tiered containment:
  1. Encapsulating untrusted user text in explicit XML tags (`<untrusted_ticket_data>`).
  2. Sanitizing closing tags (`</untrusted_...>` &rarr; `&lt;/untrusted_...&gt;`) to eliminate boundary breakout.
  3. Adding unequivocal developer directives establishing that content inside untrusted tags is passive reference data that must never override instructions.
  4. Parsing output through strict Zod schemas with non-negotiable enums.

### Learning 2: SSE Disconnect Handling and Stream Lifecycle Management
* **Insight:** During Server-Sent Events (SSE) streaming, the client may navigate away or close the connection mid-generation. If the backend fails to monitor socket lifecycle events, the LLM continues generating tokens in the background, consuming API quota and causing unhandled write errors on closed sockets.
* **Architecture Solution:** Listening to `res.on('close')` and maintaining a `clientDisconnected` flag allows immediately terminating the consumption loop (`for await (const chunk of stream) { if (clientDisconnected) break; }`), logging partial metrics, and finalizing the HTTP cycle cleanly.

---

## 4. Improvement Action (1 Required)

* **Action Item:** Implement Distributed Redis Rate Limiting & GIN Trigram Search Indexing.
* **Owner:** Backend Engineering
* **Timeline:** Week 4 Sprint
* **Success Metric:** Replace in-memory rate-limiting with Redis-backed distributed limiter supporting 50+ concurrent requests across clustered containers, and add PostgreSQL `pg_trgm` GIN indexes on ticket titles and descriptions to ensure search latency remains < 50ms on 10,000+ records.
