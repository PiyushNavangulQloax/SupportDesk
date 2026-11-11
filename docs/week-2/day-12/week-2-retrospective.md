# Week 2 Engineering Retrospective
**SupportDesk — Week 2 Day 6 (Day 12)**

---

## 1. Retrospective Status & Context

- **Participant:** Individual Backend Engineer / Intern
- **Scope:** Days 7 through 11 (Repository Setup, Prisma Schema, MVC Architecture, Authentication & Security, Ticket Querying, Comments API, OpenAPI Documentation)
- **Status:** Draft Prepared (Partner feedback and team retrospective discussion marked as `[Pending Partner Assignment]`)

---

## 2. Keep / Start / Stop Framework

### Keep (What worked well and should continue)
1. **Strict Layered MVC Architecture:**  
   Separating Routes $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Repositories made unit testing straightforward. Mocking repository classes in Jest allowed testing complex access control and pagination without database overhead.
2. **Schema-First Request Validation with Zod:**  
   Validating request params, query strings, and request bodies via Zod schemas at the router level stopped malformed data at the HTTP boundary before it touched controllers or services.
3. **Database Safety Guards for Testing:**  
   Implementing `resolveDatabaseUrl()` and `assertTestDatabase()` ensured that automated tests cannot run destructively against the development or production database.
4. **Interactive OpenAPI / Swagger Documentation:**  
   Serving interactive documentation at `/docs` with route assertion tests ensured API documentation remained accurate and synchronized with the actual codebase.

### Start (What new practices should be introduced)
1. **Dedicated Test TypeScript Configuration (`tsconfig.test.json`):**  
   Introducing a dedicated `tsconfig.test.json` including `@types/jest` and `tests/**/*.ts` from Day 1 will prevent IDE problems panel discrepancies when test files are excluded from the main production `tsconfig.json`.
2. **Standardized Postman Collections in Git:**  
   Checking in an exported Postman/Bruno collection (`postman/supportdesk-api.json`) directly into the repository will streamline peer review and demo workflows.
3. **Pre-Push Git Hooks for Typecheck:**  
   Adding a lightweight git pre-push hook running `npm run typecheck` to catch typing regressions before pushing remote branches.

### Stop (What caused avoidable delays or confusion)
1. **Running Dual Test Runners (`node:test` alongside Jest):**  
   Maintaining both the native Node.js test runner for Day 10 tests and Jest for Day 11 tests created cognitive overhead, module resolution friction with ESM/NodeNext, and duplicate assertions. The test suite should be consolidated into a single unified runner (Jest or Vitest).
2. **In-Memory Query Slicing:**  
   Avoid any temptation to slice or filter arrays in Node.js memory; all filtering, pagination, and sorting must strictly remain at the PostgreSQL/Prisma query level.

---

## 3. Deep-Dive Reflections

### Most Difficult Task
- **Day 11 Stage 1 & 2 (Jest ESM Configuration & TypeScript NodeNext Integration):**  
  Configuring Jest to work seamlessly with TypeScript in an ESM (`"type": "module"`) environment with `"moduleResolution": "NodeNext"` required careful tuning of `@swc/jest`, experimental Node VM modules (`--experimental-vm-modules`), and specific type annotations for mocked repositories.

### How AI Helped
- AI accelerated boilerplate generation for repetitive Zod schemas, OpenAPI 3.0 path objects, and mock repository fixture scaffolding.
- AI helped identify edge cases in query combination (e.g. structuring Prisma `AND` and `OR` blocks safely).

### AI Output that Required Human Correction
1. **Missing Schema Input vs. Output Types:**  
   AI initially generated schemas where fields with `.default()` were inferred as required on input (`z.infer`), causing TypeScript compilation errors in unit tests when callers omitted default fields. Corrected by using `z.input` for request input types.
2. **Untracked Module Exports:**  
   AI generated test imports referencing `AuthenticatedUser` from `src/middleware/auth.middleware.ts`, whereas the type was actually exported from `src/types/express.ts`. Corrected manually.
3. **Sandbox Network Context:**  
   AI assumed local network ports were accessible during sandboxed execution, requiring manual verification of Docker/Postgres availability.

### Remaining Architecture Concepts to Clarify
- Transitioning Prisma 7 full-text search to native PostgreSQL GIN trigram indexes (`pg_trgm`) for large-scale narrative search across ticket descriptions.
- Strategies for rate-limiting across horizontally scaled container pods using Redis rather than in-memory stores.

### Feedback from Review Partner
- `[Pending Partner Assignment]` *(To be recorded following peer code review session).*

### Measurable Goal for Week 3
- Achieve 100% test passing rate under a single unified test runner, and implement database-level full-text search indexing with response latency under 50ms on 10,000+ records.

