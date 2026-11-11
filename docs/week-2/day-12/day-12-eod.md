# Day 12 — Code Review Day — EOD / Week 2 Report

**1. Review partner:**  
`[Pending Partner Assignment by Lead]`

**2. PR reviewed:**  
`[Pending Partner PR URL / Branch]`

**3. Requirements/acceptance criteria checked:**  
- Layered MVC architecture (Routes $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Repositories).
- Authentication perimeter, JWT verification, bcrypt hashing (work factor 12), and role-based access control.
- Ticket querying (pagination, status/priority/assignee filtering, search, allowlisted sorting).
- Comments API (customer ownership isolation, public vs. internal visibility, server-side author binding).
- OpenAPI 3.0.3 specification and Swagger UI documentation at `/docs`.
- Dedicated PostgreSQL test database safety guardrails.

**4. Number of meaningful review comments submitted:**  
`[Pending Partner PR - Target: At least 10 meaningful review comments]`

**5. Main human review findings:**  
`[Pending Partner PR Diff]` (Review evaluation rubric established in `docs/week-2/day-12/peer-review-checklist.md`).

**6. ChatGPT review findings:**  
`[Pending Partner PR Diff]` (Standardized ChatGPT review prompt prepared for execution once partner diff is provided).

**7. Human vs AI comparison:**  
`[Pending Partner PR Diff]`

**8. AI false positives or unsupported findings:**  
`[Pending Partner PR Diff]`

**9. Valid review comments fixed:**  
`[Pending Incoming Review on PR #20 (feat/day-11-tickets-comments-openapi)]`

**10. Comments answered with technical reasons:**  
`[Pending Incoming Review on PR #20]`

**11. Comments escalated to lead:**  
`0 (None)`

**12. Tests run after fixes and actual result:**  
- `npm run typecheck`: **PASSED (0 errors)** across all TypeScript source files, tests, and seed scripts.
- `npm run build`: **PASSED (0 errors)** generating clean production build in `dist/`.
- `npm run test:jest`: **PASSED (119/119 tests passing, 0 failures)** across all 7 test suites (86 unit tests + 29 Supertest integration tests + 4 sanity/docs tests).
- `npm run test:node`: **PASSED (128/128 tests passing, 0 failures)** across 44 test suites.
- `npm test` (Unified Test Command): **PASSED (247/247 tests passing, 0 failures)**.
- `npm run test:coverage`: **PASSED (100% Statements, 98.66% Branch, 100% Functions, 100% Lines)** across `auth.service.ts`, `comments.service.ts`, and `tickets.service.ts`.
- `tests/integration.spec.ts`: **VERIFIED & PASSED (29/29 integration tests passing against supportdesk_test)**.

**13. Postman demo flows completed:**  
Runbook prepared and verified against API routes in `docs/week-2/day-12/postman-api-demo.md`:
- Customer registration (`POST /api/v1/auth/register`) and login (`POST /api/v1/auth/login`).
- Protected ticket routes without token returning 401.
- Privilege escalation attempts returning 403.
- Ticket creation, scoped listing, and anti-enumeration 404 verification.
- Advanced querying (pagination, filtering, title search, allowlisted sorting).
- Public vs. internal comment creation and visibility isolation.
- Interactive documentation at `/docs`.

**14. 401 / 403 evidence:**  
- Unauthenticated request to `GET /api/v1/tickets` returns `401 Unauthorized` with `{ code: "UNAUTHORIZED", message: "Authentication token required" }`.
- Customer request attempting to set `assigneeId` on `POST /api/v1/tickets` returns `403 Forbidden` with `{ code: "FORBIDDEN", message: "Customers are not permitted to assign tickets" }`.
- Customer request attempting to post internal comment (`isInternal: true`) returns `403 Forbidden`.

**15. Ticket ownership and agent access evidence:**  
- `TicketsService.listTickets()` forces `createdById = user.id` when `user.role === UserRole.CUSTOMER`.
- Accessing a foreign ticket returns `404 Not Found` to prevent IDOR scanning.
- Agent and Admin accounts view all tickets across customers with optional `assigneeId` filtering.

**16. Querying/comments demo evidence:**  
- Query parameters `page=1&limit=10&status=OPEN&priority=P2&sortBy=createdAt&sortOrder=desc` validated via Zod schema and passed to Prisma query.
- Comments on tickets: customer receives only `isInternal: false` comments; agent receives both public and internal comments.

**17. /docs demo result:**  
- `GET /docs` serves interactive Swagger UI rendering all endpoints.
- `GET /docs/openapi.json` returns valid OpenAPI 3.0.3 JSON schema.
- Schema assertion test in `tests/docs.spec.ts` verifies documentation matches runtime Zod schemas.

**18. Week 2 quiz result (if scored):**  
`[Pending Lead Assessment]` (Study guide covering all 20 questions completed in `docs/week-2/day-12/week-2-quiz-study-guide.md`).

**19. Keep:**  
- Strict MVC layering with service-level business logic and repository query isolation.
- Zod schema validation at HTTP route boundaries.
- Dedicated test database safety guards (`resolveDatabaseUrl`).

**20. Start:**  
- Introduce dedicated `tsconfig.test.json` to streamline test typing.
- Commit version-controlled Postman/Bruno collections in Git.
- Implement pre-push typecheck hooks.

**21. Stop:**  
- Dual test runners (`node:test` alongside Jest); consolidate onto a single runner.
- Slicing or filtering data in-memory; keep all operations in the database query.

**22. Week 2 PR links:**  
- Primary Feature PR (Day 11): PR #20 (`feat/day-11-tickets-comments-openapi` $\rightarrow$ `feat/day-9-api-skeleton`) ([GitHub PR #20 Link](https://github.com/PiyushNavangulQloax/SupportDesk/pull/20))
- Partner PR: `[Pending Partner Assignment by Lead]`

**23. Week 2 test/coverage evidence:**  
- Total Tests: 247 passed, 0 failed across node:test (128) and Jest (119).
- Integration tests: 29 passed, 0 failed against PostgreSQL supportdesk_test.
- Service Coverage: 100% Stmts, 98.66% Branch, 100% Funcs, 100% Lines.

**24. Blockers or unfinished work:**  
- Awaiting partner PR assignment from lead to execute peer review, AI comparison, and review comment resolution.

**25. Three things learned:**  
1. Anti-enumeration security design (returning 404 rather than 403 to prevent resource discovery).
2. Server-side author ID binding from JWT claims to prevent identity spoofing.
3. Database safety guardrails ensuring test suites never overwrite development databases.

**26. One improvement goal for Week 3:**  
- Consolidate all test suites under a single unified test runner and implement PostgreSQL GIN trigram indexes for fast narrative ticket searches.

