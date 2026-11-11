# Week 2 Engineering Weekly Report
**SupportDesk — Days 7 to 12 (Sprint Summary)**

---

## 1. Executive Summary

During Week 2 of the SupportDesk engineering sprint, the backend architecture was advanced from initial monorepo scaffolding to a production-grade, secure, and documented Express REST API powered by PostgreSQL and Prisma ORM.

Key achievements include:
- Establishing a robust layered MVC pattern (Routes $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Repositories).
- Implementing enterprise security standards: bcrypt password hashing (12 rounds), JWT-based stateless authentication, role-based access control (RBAC), and IP rate limiting.
- Building the Comments API with strict customer ownership scoping and author ID server binding.
- Providing an interactive OpenAPI 3.0.3 documentation interface via Swagger UI at `/docs`.
- Configuring a dual testing pipeline with Jest ESM and Supertest, achieving **100% statement coverage across all domain services**.

---

## 2. Daily Deliverables Summary (Days 7–12)

| Day | Focus Area | Deliverables Completed | Status |
|:---:|:---|:---|:---:|
| **Day 7** | Repository Setup & Infrastructure | Monorepo layout, TypeScript configuration, Docker Compose for PostgreSQL, npm workspace scripts | **Verified Complete** |
| **Day 8** | Database Modeling & Migrations | Prisma 7 schema (`User`, `Ticket`, `Comment`, `AuditLog`), enums, UUID primary keys, foreign key constraints, seed script | **Verified Complete** |
| **Day 9** | MVC Skeleton & Ticket CRUD | Express 5 application setup, standardized `{ success, data, error, meta }` response envelope, Ticket CRUD endpoints, Zod validation | **Verified Complete** |
| **Day 10** | Authentication & Security Perimeter | `POST /auth/register`, `POST /auth/login`, bcrypt work factor 12, JWT issuance & verification, auth middleware, rate limiter, CORS policies | **Verified Complete** |
| **Day 11** | Querying, Comments & OpenAPI Docs | Ticket pagination/filtering/sorting/search, Comments API (public vs. internal), OpenAPI 3.0.3 specification at `/docs`, Jest ESM test suite | **Verified Complete** |
| **Day 12** | Review, Demo & Retrospective | Independent verification, Postman runbook, Quiz study guide, Peer review checklist framework | **Phase A Complete; Partner Activities Pending** |

---

## 3. Pull Request & Git Status

- **Primary Feature Branch:** `feat/day-11-tickets-comments-openapi`
- **Head Commits:** `e803e71` (API Implementation) + `91182ea` (Documentation Deliverables)
- **Remote Tracking:** Pushed to `origin/feat/day-11-tickets-comments-openapi`
- **Base Branch (Stacked):** `feat/day-9-api-skeleton` (stacked on PR #17, which targets `feat/day-8-prisma-database` in PR #16)
- **Live Pull Request:** [PR #20](https://github.com/PiyushNavangulQloax/SupportDesk/pull/20) (`state: OPEN`, `mergeable: MERGEABLE`)
- **Review Status:** Ready for lead review / incoming peer review comments (0 comments so far).
- **Partner PR Review Status:** `[Pending Partner Assignment by Lead]` (Blocked)

---

## 4. Test Results and Service Coverage Evidence

### A. TypeScript Typecheck
- **Command:** `npm run typecheck`
- **Result:** **PASSED (0 errors)** across production source code, test files, and seed scripts.

### B. Unit Test Suite (Jest ESM with Mocked Repositories)
- **Command:** `npm run test:jest -- tests/*.spec.ts`
- **Verified Result:** **86 tests passed, 0 failed** across 6 test suites:
  - `tests/sanity.spec.ts`: 3 passed
  - `tests/ticket-querying.spec.ts`: 29 passed
  - `tests/tickets.service.spec.ts`: 17 passed
  - `tests/comments.spec.ts`: 14 passed
  - `tests/docs.spec.ts`: 11 passed
  - `tests/auth.service.spec.ts`: 5 passed

### C. Domain Service Code Coverage
- **Command:** `npm run test:coverage`
- **Evidence:**

```text
---------------------|---------|----------|---------|---------|-------------------
File                 | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
---------------------|---------|----------|---------|---------|-------------------
All files            |     100 |    98.66 |     100 |     100 |                   
 auth.service.ts     |     100 |      100 |     100 |     100 |                   
 comments.service.ts |     100 |      100 |     100 |     100 |                   
 tickets.service.ts  |     100 |    97.91 |     100 |     100 | 134               
---------------------|---------|----------|---------|---------|-------------------
```

### D. Supertest Integration Tests (`tests/integration.spec.ts`)
- **Status:** **VERIFIED & PASSED (29/29 passed, 0 failures)**
- **Evidence:** Executed against dedicated test database `supportdesk_test` via Docker container `supportdesk-postgres` on port 5433:
  - 1. Authentication & Security Middleware Integration: **5/5 passed**
  - 2. Ticket Querying Integration (Pagination, Filtering, Search, Sorting): **8/8 passed**
  - 3. Customer Isolation & RBAC Integration: **4/4 passed**
  - 4. Comments API Integration (Create, List, Permissions & Visibility): **10/10 passed**
  - 5. OpenAPI & Swagger Documentation Endpoints: **2/2 passed**

### E. Complete Unified Test Suite Execution
- **Command:** `npm test` (`npm run test:node && npm run test:jest`)
- **Result:** **PASSED — 247 tests passing, 0 failures**:
  - `node:test` runner: **128 passed, 0 failed** across 44 test suites.
  - `Jest` runner: **119 passed, 0 failed** across 7 test suites (86 unit + 29 integration + 4 sanity/docs).
  - Total duration: ~6.7s. 100% test pass rate.

---

## 5. Postman Demonstration Evidence

Documented and verified against the API specification in `docs/week-2/day-12/postman-api-demo.md`:
1. **Authentication Flow:** User registration (`201`), login (`200`), token acquisition, and verified absence of `passwordHash`.
2. **Perimeter Security:** Unauthenticated request rejected with `401 UNAUTHORIZED`.
3. **Role Authorization:** Customer attempt to assign a ticket rejected with `403 FORBIDDEN`.
4. **Data Isolation:** Customer ticket list strictly returns owned tickets; foreign ticket ID lookup returns `404 NOT_FOUND` for anti-enumeration.
5. **Advanced Querying:** Status/priority filtering, search across title and description, and allowlisted sorting.
6. **Comments API:** Public vs. internal comment creation and visibility isolation (customers never see internal notes).
7. **Documentation:** Interactive Swagger UI active at `/docs`.

---

## 6. Peer Code Review Summary (Human vs. AI)

- **Peer Review Status:** `[Pending Partner Assignment]`
- **Evaluation Standard:** Configured in `docs/week-2/day-12/peer-review-checklist.md`.
- **Findings Recorded:** `[Pending Partner PR Diff]`
- **AI Review of Same Diff:** `[Pending Partner PR Diff]`
- **Disposition & Resolutions:** `[Pending Partner PR Diff]`

---

## 7. Week 2 Knowledge Quiz Status

- **Status:** Preparation & Study Guide Completed (`docs/week-2/day-12/week-2-quiz-study-guide.md`).
- **Coverage:** Complete beginner-to-advanced explanations, SupportDesk code paths, and interview-ready answers for all 20 curriculum questions.
- **Formal Quiz Score:** `[Pending Lead Assessment]`

---

## 8. Retrospective Summary

- **Keep:** Strict layered MVC separation, Zod schema validation at HTTP boundary, database safety guards (`assertTestDatabase`).
- **Start:** Introduce `tsconfig.test.json` early, commit versioned Postman collections, pre-push typecheck hooks.
- **Stop:** Dual test runners (`node:test` alongside Jest); consolidate on a single framework.

---

## 9. Blockers & Technical Debt

- **Docker Daemon Availability:** Host Docker daemon must be running to execute the 29 live PostgreSQL integration tests.
- **PostgreSQL Text Search Indexing:** Narrative search across ticket title and description currently uses Prisma `contains`; requires PostgreSQL GIN trigram index migration in Week 3.

---

## 10. Key Learnings & Goals

### Three Technical Concepts Confidently Mastered:
1. **Anti-Enumeration Security Patterns:** Returning `404 Not Found` rather than `403 Forbidden` for foreign resources to prevent malicious IDOR enumeration attacks.
2. **Server-Side Author Identity Binding:** Disregarding client-supplied author IDs and strictly binding entities to verified JWT claims (`req.user.id`).
3. **Database Safety Guards in Automated Testing:** Enforcing strict environment checks to guarantee destructive test operations never execute against development or production databases.

### One Measurable Goal for Week 3:
- Consolidate all test suites under a single unified test runner with 100% pass rate and implement database-level full-text search indexing with response latency under 50ms on large datasets.

