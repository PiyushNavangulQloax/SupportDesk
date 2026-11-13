# SupportDesk — Prompt Journal

**Project:** SupportDesk
**Week:** 1
**Day:** 4 — Git, GitHub & Repository Structure

---

## Entry 1 — Git Repository Inspection and Branch Creation

**Date:** 03 November 2026

### Task / Context

Inspect the existing SupportDesk Git repository, understand its
current state, and create a dedicated feature branch.

### Exact Prompt Used

"Explain the current Git repository status, identify the repository
root and remote, inspect recent commits, and guide me through
creating a feature branch without modifying main."

### Summary of AI Response

AI explained how to inspect the working tree, remote URL,
commit history and current branch. It recommended creating
a feature branch instead of working directly on main.

### Changes or Corrections

- Identified the nested SupportDesk repository.
- Confirmed the existing GitHub remote.
- Confirmed main was synchronized with origin/main.
- Created feat/repository-setup.
- Preserved the existing README and commit history.

### Verification

- Inspected git status.
- Inspected git remote -v.
- Inspected git log.
- Checked the current branch using git branch --show-current.

### Learning

Learned the importance of inspecting an existing repository
before making changes and using feature branches for isolated work.

### Follow-up Question

How should a developer safely synchronize a feature branch
with the latest main branch?

---

## Entry 2 — Monorepo Structure and Git Ignore Configuration

**Date:** 03 November 2026

### Task / Context

Create the initial SupportDesk monorepo directory structure
and configure Git to ignore generated files and local dependencies.

### Exact Prompt Used

"Guide me through creating the SupportDesk monorepo structure
according to the project roadmap. Explain the purpose of every
directory and prepare a suitable .gitignore for the project."

### Summary of AI Response

AI explained the purpose of apps/api, apps/web, apps/mobile,
agents, automation/n8n, postman, infra, docs and GitHub workflows.

It also explained why dependencies, environment files,
build outputs, logs and temporary files should be ignored.

### Changes or Corrections

- Created the required repository directories.
- Added .gitignore configuration.
- Included Node.js, Python, macOS and editor-related exclusions.
- Allowed .env.example while ignoring local environment files.

### Verification

- Inspected directories using find.
- Reviewed .gitignore.
- Checked Git status.
- Checked that the Git metadata directory was not confused
  with the .github directory.

### Learning

Learned how monorepos organise multiple applications and why
Git should not track dependencies, generated files or secrets.

### Follow-up Question

How does Git behave when a file is already tracked but later
added to .gitignore?

---

## Entry 3 — Environment Configuration and README Documentation

**Date:** 03 November 2026

### Task / Context

Create a safe environment variable template and review
the existing SupportDesk README before documenting repository setup.

### Exact Prompt Used

"Help me create a secure .env.example containing placeholder
configuration values. Review the existing README and suggest
a minimal addition documenting the actual repository setup
without overwriting existing project documentation."

### Summary of AI Response

AI explained environment variables, secret management,
Git ignore rules and the importance of preserving existing
project documentation.

It recommended adding a concise repository setup status section.

### Changes or Corrections

- Created .env.example with placeholder values.
- Reviewed the existing 1,122-line README.
- Preserved the existing PRD and architecture documentation.
- Prepared a repository setup status section.

### Verification

- Inspected .env.example.
- Checked Git ignore behaviour.
- Reviewed README headings and content.
- Reviewed Git diff and whitespace checks where performed.

### Learning

Learned how to separate application configuration from source
code and how to document actual implementation status without
presenting proposed architecture as completed functionality.

### Follow-up Question

How should environment variables be validated and managed
across development, testing and production environments?

---

## Day 4 Reflection

Today I learned how to inspect an existing Git repository,
create a feature branch, organise a monorepo, configure
.gitignore and prepare environment variable templates.

I also learned the importance of preserving existing work,
protecting secrets and verifying changes before committing.

**Status:** Initial repository setup in progress.


---

# Week 2 — Day 2: Database Design with AI (Day 8)

**Date:** 06 November 2026
**Branch:** `feat/day-8-prisma-database`
**Application Target:** `apps/api`

---

## 1. Objective

Design, model, migrate, seed, and document a robust relational PostgreSQL database architecture for the SupportDesk backend using Prisma ORM (v7.10.1), Docker Compose (PostgreSQL 17), reproducible seed data (50 tickets), and Mermaid Entity-Relationship Diagrams (ERD).

---

## 2. AI-Assisted Prompts and Work Performed

### Stage 1: Repository Inspection and Database Architecture Proposal
- **Prompt Objective:** Inspect repository state, confirm working branch, and establish design baseline.
- **What AI was asked to do:** Read existing documentation, check current branch, verify clean separation from legacy demo code, and propose an initial relational model structure.
- **What was implemented:** Confirmed branch `feat/day-8-prisma-database`, inspected existing structure, and established requirements for an independent `apps/api` package without modifying root demo files.
- **Review and verification:** Checked `git branch --show-current`, verified absence of root pollution, and confirmed zero modifications to `supportdesk-demo` or untracked legacy files.
- **Corrections / Rejected approaches:** Rejected placing database code or root dependencies in the workspace root; kept all API code strictly inside `apps/api`.

### Stage 2: Review of Seven Database Models and Their Relationships
- **Prompt Objective:** Define the core entity structure and relationship graph.
- **What AI was asked to do:** Model `User`, `Ticket`, `Comment`, `Tag`, `TicketTag`, `Attachment`, and `AuditLog` according to helpdesk domain rules.
- **What was implemented:** Detailed schemas for all 7 models, mapping UUID primary keys, foreign key constraints, composite primary keys for junction tables, and 3 enums (`UserRole`, `TicketStatus`, `TicketPriority`).
- **Review and verification:** Cross-referenced model requirements with real-world helpdesk lifecycle workflows (customer creation, agent assignment, private notes, tags).
- **Corrections / Rejected approaches:** Rejected embedding tags as a PostgreSQL array; established a formal junction table (`ticket_tags`) with composite primary key `(ticketId, tagId)` for proper normalization.

### Stage 3: Database Design Documentation and Design-Decision Review
- **Prompt Objective:** Document the comprehensive architectural blueprint before writing code.
- **What AI was asked to do:** Draft authoritative design notes covering PostgreSQL types, precision, referential integrity (`ON DELETE` rules), indexing strategies, and normalization.
- **What was implemented:** Authored `docs/database-design-notes.md` detailing exact column types (`TIMESTAMPTZ(6)`, `VARCHAR`, `JSONB`), index selections, and dual-layer timestamp handling (`@default(now())` + `@updatedAt`).
- **Review and verification:** Verified that AuditLog immutability and email/tag lowercasing were clearly designated as application-layer responsibilities rather than unportable database triggers.
- **Corrections / Rejected approaches:** Rejected database-level triggers for audit log immutability; documented application-level append-only enforcement to ensure portability across PostgreSQL environments.

### Stage 4: Prisma 7 Configuration and Backend Setup under `apps/api`
- **Prompt Objective:** Initialize `apps/api` as an independent Node.js/TypeScript package with Prisma 7.
- **What AI was asked to do:** Initialize `apps/api/package.json`, configure `tsconfig.json` (ES2022, NodeNext, strict), install exact Prisma 7.10.1 dependencies (`@prisma/client`, `@prisma/adapter-pg`, `pg`, `dotenv`, `prisma`), and create `apps/api/prisma.config.ts`.
- **What was implemented:** Set up `apps/api/package.json` (`private: true`, `type: "module"`), verified TypeScript build/typecheck with `apps/api/src/index.ts`, pinned dependencies to exact `7.10.1`, and created `prisma.config.ts` loading `DATABASE_URL` via `defineConfig` and `env`.
- **Review and verification:** Executed `npx tsc -p tsconfig.json`, `npm ls`, and `npx prisma --version` confirming matching Prisma CLI and Client versions (`7.10.1`).
- **Corrections / Rejected approaches:** Rejected placing `url` directly inside `datasource db` in `schema.prisma`; adopted the official Prisma 7 pattern utilizing `prisma.config.ts`.

### Stage 5: Docker PostgreSQL Configuration
- **Prompt Objective:** Provide a localized, containerized PostgreSQL 17 environment.
- **What AI was asked to do:** Create `apps/api/docker-compose.yml` and local development `.env`.
- **What was implemented:** Configured `postgres:17` container (`supportdesk-postgres`) with named persistent volume (`supportdesk_postgres_data`), `pg_isready` health check, and loopback host binding. Detected native Homebrew PostgreSQL on port 5432 and safely mapped Docker container port to host `127.0.0.1:5433:5432`.
- **Review and verification:** Ran `lsof -i TCP:5433` and `docker compose config`. Confirmed `.env` was properly ignored by Git (`.gitignore:8:.env`). Started container with `docker compose up -d` and confirmed healthy status and connectivity via `psql`.
- **Corrections / Rejected approaches:** Rejected stopping or altering the existing Homebrew PostgreSQL instance on port 5432; resolved conflict by mapping Docker host port to `5433` and configuring `DATABASE_URL` accordingly.

### Stage 6: Prisma Schema Creation and Validation
- **Prompt Objective:** Create the authoritative Prisma schema file.
- **What AI was asked to do:** Translate the approved database design into `apps/api/prisma/schema.prisma`.
- **What was implemented:** Created `schema.prisma` with generator client targeting `../src/generated/prisma`, postgresql datasource, 3 mapped enums (`user_role`, `ticket_status`, `ticket_priority`), 7 models with UUID defaults, Timestamptz precision, foreign keys, and indexes.
- **Review and verification:** Ran `npx prisma validate` and `npx prisma format` (formatted in 15ms). Confirmed all 7 models and 3 enums validated cleanly.
- **Corrections / Rejected approaches:** Pinned client generator to `../src/generated/prisma` inside `apps/api/src` to ensure strict isolation within the subpackage.

### Stage 7: Initial Database Migration
- **Prompt Objective:** Apply the database schema to the live PostgreSQL instance using Prisma Migrate.
- **What AI was asked to do:** Verify database was empty, run initial migration, and inspect resulting database catalog.
- **What was implemented:** Executed `npx prisma migrate dev --name init`, creating migration directory `apps/api/prisma/migrations/20261106043616_init/migration.sql`. Generated 8 tables (7 application tables + `_prisma_migrations`) and 3 custom types.
- **Review and verification:** Queried PostgreSQL system catalogs (`\dt`, `\dT+`) inside container confirming all tables, types, foreign keys, and indexes existed. Executed `npx prisma migrate status`.
- **Corrections / Rejected approaches:** Rejected `prisma db push` or destructive resets; used strictly reproducible version-controlled migrations.

### Stage 8: Seed Script Development for 50 Fictional Tickets
- **Prompt Objective:** Author a comprehensive, realistic TypeScript seed script.
- **What AI was asked to do:** Create `apps/api/prisma/seed.ts` inserting 7 users, 12 tags, 50 tickets across all statuses and priorities, realistic customer/internal comments, file metadata attachments, and audit log entries.
- **What was implemented:** Implemented `seed.ts` using `@prisma/adapter-pg` pool connection, deterministic test data, and development placeholder hashes (`DEV_ONLY:`).
- **Review and verification:** Inspected data definitions for realistic support ticket scenarios across categories (`Authentication`, `Billing`, `API`, `Mobile`, `UI`, `Integrations`).
- **Corrections / Rejected approaches:** Rejected using random test generators (like faker) to keep all test cases completely deterministic and inspectable.

### Stage 9: Seed Idempotency and Relational Integrity Review
- **Prompt Objective:** Audit and guarantee repeatable, non-destructive seed execution.
- **What AI was asked to do:** Audit `seed.ts` to ensure re-running the script does not duplicate tickets, comments, attachments, or audit records.
- **What was implemented:** Replaced random UUID generation with deterministic UUID namespaces (`0000000X-...`) for all entities; converted creations to `upsert`; implemented insert-only `createMany({ skipDuplicates: true })` for AuditLog; configured `migrations.seed = "tsx prisma/seed.ts"` in `prisma.config.ts`.
- **Review and verification:** Tested ESM TypeScript resolution via `tsx`; added strict `typecheck:seed` script; confirmed zero database records were inserted prior to approval.
- **Corrections / Rejected approaches:** Rejected `process.exit(1)` inside `.catch()` which could terminate Node before closing pool/client; restructured into a robust `try/catch/finally` setting `process.exitCode = 1` and ensuring pool and Prisma Client disconnection.

### Stage 10: Priority Distribution Investigation and Correction
- **Prompt Objective:** Resolve discrepancy between approved ticket priority counts and actual seeded counts.
- **What AI was asked to do:** Investigate why actual database priority distribution was `P1: 5, P2: 13, P3: 21, P4: 11` instead of `P1: 5, P2: 11, P3: 24, P4: 10`.
- **What was implemented:** Programmatically inspected `TICKET_SEEDS` in `seed.ts` and confirmed the discrepancy stemmed from source array authorship. Identified exact tickets: Ticket 27 (P4 → P3), Ticket 33 (P2 → P3), and Ticket 34 (P2 → P3). Updated `seed.ts` definitions.
- **Review and verification:** Verified programmatically that `TICKET_SEEDS` exactly matched `P1: 5, P2: 11, P3: 24, P4: 10`. Ran strict `npm run typecheck` and `npm run build`.
- **Corrections / Rejected approaches:** Rejected manual direct SQL updates; fixed the source of truth in `seed.ts` so the seed script remains purely deterministic and reproducible.

### Stage 11: Corrected Seed Execution and Database Verification
- **Prompt Objective:** Execute the corrected seed script exactly once and verify database contents.
- **What AI was asked to do:** Run `npm run seed` and execute extensive SQL verification queries.
- **What was implemented:** Executed `npm run seed` (exit code 0). Verified exact counts: Users: 7, Tags: 12, Tickets: 50, Comments: 75, Attachments: 7, AuditLog: 51, TicketTags: 64. Verified priority distribution (`5 / 11 / 24 / 10`) and verified in-place update of tickets 28, 34, and 35.
- **Review and verification:** Ran 8 automated relational integrity SQL queries (orphans, invalid assignees, customer internal comments, invalid actors); all returned 0 violations. Verified audit log timestamps were preserved without overwrite.
- **Corrections / Rejected approaches:** Verified that re-running the seed script with deterministic UUIDs updated existing rows in-place rather than creating duplicates or corrupting foreign keys.

### Stage 12: Mermaid ERD Creation and Final Validation
- **Prompt Objective:** Produce authoritative visual documentation of the completed database schema.
- **What AI was asked to do:** Create `docs/database-erd.md` containing a Mermaid `erDiagram` representing all 7 models, exact types, primary/foreign keys, unique constraints, and cardinalities.
- **What was implemented:** Created `docs/database-erd.md` with complete Mermaid ERD, detailed field tables, referential action table, enum mappings, and index reference.
- **Review and verification:** Ran `npx prisma validate`, verified Mermaid syntax and cardinality markings, and confirmed live database counts remained intact.
- **Corrections / Rejected approaches:** Clearly documented the polymorphic nature of `AuditLog` target fields (`targetType` + `targetId`) to explain why no database-level foreign key is attached to `targetId`.

---

## 3. Important Engineering Decisions

- **PostgreSQL with Prisma ORM:** PostgreSQL was chosen for rock-solid relational consistency and ACID guarantees. Prisma ORM was selected for end-to-end TypeScript type safety, declarative schema modeling, and automated migration generation.
- **Seven Normalized Models:** Separated concerns into dedicated entities: `User` (identity), `Ticket` (support request), `Comment` (conversation thread), `Tag` (taxonomy), `TicketTag` (many-to-many junction), `Attachment` (file metadata), and `AuditLog` (event trail).
- **Three Enums with Prisma `@map`:** Defined `UserRole` (`customer`, `agent`, `admin`), `TicketStatus` (`open`, `in_progress`, `waiting_on_customer`, `resolved`, `closed`), and `TicketPriority` (`P1`, `P2`, `P3`, `P4`). Used Prisma's `@@map` and `@map` attributes to decouple idiomatic TypeScript PascalCase names from database storage values.
- **UUID Primary Keys:** Used `gen_random_uuid()` for all primary keys to prevent enumeration attacks, enable safe offline ID generation, and simplify distributed data integration.
- **Referential Integrity (`ON DELETE` Rules):**
  - `RESTRICT` on `Ticket.createdById`, `Comment.ticketId`, `Comment.authorId`, `Attachment.ticketId`, and `TicketTag.tagId` to prevent accidental deletion of critical operational records.
  - `SET NULL` on `Ticket.assigneeId` and `AuditLog.actorId` so deleting or deactivating staff accounts leaves tickets unassigned and preserves audit trails.
  - `CASCADE` on `TicketTag.ticketId` so removing a ticket cleanly purges its junction join records.
- **Unique Constraints and Indexes:** Enforced unique constraints on `users.email` and `tags.name`. Added B-Tree indexes on `tickets.status`, `tickets.assigneeId`, `tickets.createdById`, composite `(ticketId, createdAt ASC)` on `comments`, `ticket_tags.tagId`, `attachments.ticketId`, and composite `(targetType, targetId)` on `audit_logs`.
- **Optional SLA Fields & Deferred SLA Policy:** Included `slaDueAt TIMESTAMPTZ(6)` as nullable on `Ticket` to store computed deadlines while deferring dynamic SLA business logic to the application layer.
- **Application-Level Normalization:** Delegated email and tag name lowercasing to application services prior to persistence, ensuring cross-database predictability without relying on proprietary database trigger extensions.
- **Polymorphic AuditLog Target:** Modeled `targetType VARCHAR(50)` and `targetId VARCHAR(100)` without a database foreign key constraint, allowing audit logs to reference any entity type (Tickets, Users, Settings, System events) flexibly.
- **Internal Comment Visibility & Authorization:** Added `isInternal BOOLEAN DEFAULT false` to `comments`. Customer comments must have `isInternal: false`; staff comments can be internal notes. Enforced author role validation at the application service boundary.
- **Prisma 7 Adapter-Based Connection:** Configured `@prisma/adapter-pg` alongside a standard `pg.Pool` in `apps/api/prisma/seed.ts` and loaded configuration through `apps/api/prisma.config.ts`, adopting the modern Prisma 7 runtime architecture.

---

## 4. Database Verification Evidence

- **Docker PostgreSQL Container:** `supportdesk-postgres` (`postgres:17`), running on `127.0.0.1:5433` (healthy).
- **Applied Migration:** `20261106043616_init` applied cleanly (`Database schema is up to date!`).
- **Prisma Validation:** `npx prisma validate` passed with exit code 0 (`The schema at prisma/schema.prisma is valid 🚀`).
- **TypeScript Strict Validation:** `npm run typecheck` and `npm run build` passed with 0 errors.
- **Database Record Counts (PostgreSQL :5433):**
  - `users`: **7**
  - `tags`: **12**
  - `tickets`: **50**
  - `comments`: **75**
  - `attachments`: **7**
  - `audit_logs`: **51**
  - `ticket_tags`: **64**
- **Ticket Priority Distribution:**
  - `P1`: **5** (10%)
  - `P2`: **11** (22%)
  - `P3`: **24** (48%)
  - `P4`: **10** (20%)
  - `Total`: **50** (100%)
- **Ticket Status Distribution:**
  - `open`: **12**
  - `in_progress`: **10**
  - `waiting_on_customer`: **8**
  - `resolved`: **10**
  - `closed`: **10**
  - `Total`: **50**
- **Relational Integrity Checks:**
  - Orphaned tickets (missing creator): **0**
  - Invalid assignee tickets: **0**
  - Orphaned comments (missing ticket/author): **0**
  - Orphaned attachments (missing ticket): **0**
  - Orphaned ticket-tag joins (missing ticket/tag): **0**
  - Invalid audit log actors: **0**
  - Customer comments marked internal: **0**
  - Internal comments authored by non-staff: **0**

---

## 5. Corrections and Lessons Learned

- **Priority Distribution Discrepancy:** The initial database seed yielded `P1: 5, P2: 13, P3: 21, P4: 11` due to an authorship oversight in the `TICKET_SEEDS` array in `seed.ts`. An investigation pinpointed tickets 27, 33, and 34. Corrected Ticket 27 from P4 to P3, Ticket 33 from P2 to P3, and Ticket 34 from P2 to P3.
- **Seed Script Idempotency:** The first draft used `tx.ticket.create()`, which would have duplicated all tickets upon re-execution. Refactoring to deterministic UUIDs (`deterministicUuid(namespace, id)`) and `upsert` guaranteed that the second seed execution updated records in-place without duplicating rows or corrupting relations.
- **Append-Only AuditLog Preservation:** `AuditLog` was converted from `upsert` to `createMany({ skipDuplicates: true })`. This ensured that re-running the seed skipped existing audit logs (`ON CONFLICT DO NOTHING`), preserving original event timestamps without modification.
- **Safe Connection Teardown:** Removed `process.exit(1)` from Promise `.catch()` chains. Implemented a robust `try/catch/finally` execution wrapper ensuring `prisma.$disconnect()` and `pool.end()` are awaited before setting `process.exitCode = 1`.
- **ESM TypeScript Execution with Prisma 7:** Discovered that Node's native type-stripper cannot resolve Prisma-generated relative `.js` extension stubs (e.g. `./enums.js` pointing to `./enums.ts`). Configured `tsx` in `prisma.config.ts` (`migrations.seed = "tsx prisma/seed.ts"`) to resolve TypeScript modules smoothly.
- **Day 5 Utility Note:** The Day 5 CSV-to-JSON utility was not present in the repository or Git history. Data definitions were authored cleanly and directly in TypeScript with complete relational consistency.

---

## 6. Deliverables

- [`docs/database-design-notes.md`](database-design-notes.md) — Complete database architecture blueprint and rationale.
- [`docs/database-erd.md`](database-erd.md) — Visual Mermaid ERD, table dictionaries, referential actions, and index specifications.
- [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma) — Authoritative Prisma schema with 7 models and 3 enums.
- [`apps/api/prisma/migrations/20261106043616_init/migration.sql`](../apps/api/prisma/migrations/20261106043616_init/migration.sql) — Initial PostgreSQL DDL migration script.
- [`apps/api/prisma/seed.ts`](../apps/api/prisma/seed.ts) — Deterministic, idempotent seed script inserting 50 tickets and related entities.
- [`apps/api/docker-compose.yml`](../apps/api/docker-compose.yml) — Container configuration for PostgreSQL 17 bound to port 5433.

---

## 7. What I Learned

- **Prisma Schema vs. Database Migration:** The schema is a declarative abstraction of the desired data model, whereas migrations are version-controlled, chronological SQL statements that physically alter the database catalog. Both must remain in sync.
- **Relational Integrity and Foreign Keys:** Foreign keys with explicit `RESTRICT`, `SET NULL`, and `CASCADE` actions safeguard data consistency far better than application-level conventions alone.
- **Many-to-Many Relationships:** Junction tables (`TicketTag`) with composite primary keys prevent redundant duplicate associations while allowing efficient bidirectional querying via dedicated B-Tree indexes.
- **Query Performance and Indexing:** Strategically placed B-Tree indexes on queue filters (`status`), dashboard lookups (`assigneeId`), and chronological orderings (`ticketId, createdAt ASC`) are essential for query performance under scale.
- **Idempotent Database Seeding:** Seed scripts must be idempotent. Using deterministic UUIDs and `upsert` (or `createMany` with `skipDuplicates`) ensures scripts can run repeatedly in CI/CD or local setup without accumulating duplicate records or wiping out unrelated data.
- **Auditing AI-Generated Database Designs:** AI-generated database code must never be accepted blindly. Thorough human review caught foreign-key cascade risks, port conflicts with existing local services, import resolution defects in Node ESM, and subtle ticket priority count mismatches before code reached production.

---

## 8. Remaining Work

- Update GitHub Kanban board to reflect completion of Day 8 database milestones.
- Review and assemble the Day 8 pull request (`feat/day-8-prisma-database` → `main`).
- Generate the final End of Day (EOD) engineering summary.
- Staging, committing, and pushing the feature branch upon final user authorization.

---

# Week 2 — Day 3: API Skeleton and MVC Architecture (Day 9)

## 1. Implementation Prompt
SupportDesk Day 9 — Phase 2: API Implementation:
Implement API Skeleton and MVC Architecture with Express 5, Prisma 7, PostgreSQL 17, and TypeScript strict mode. Establish standard `{ data, error, meta }` response envelope, Zod validation, request logging, layered separation (Routes → Controllers → Services → Repositories), automated tests, and graceful shutdown without mutating Day 8 seed records.

## 2. Implementation Summary
- **Branch Setup:** Created feature branch `feat/day-9-api-skeleton` from `feat/day-8-prisma-database`.
- **Database Startup & Health:** Started PostgreSQL 17 Docker container (`supportdesk-postgres` on port 5433). Validated migration status (`Database schema is up to date!`) and confirmed 50 tickets, 7 users, 75 comments intact.
- **Dependencies Installed:** Added `express@^5.3.0`, `cors@^2.8.6`, `zod@^4.6.7` to runtime dependencies; added `@types/express`, `@types/cors`, `supertest`, `@types/supertest` to devDependencies.
- **Config & Core Foundation:**
  - `src/config/env.ts`: Validates `NODE_ENV`, `PORT`, `DATABASE_URL` via Zod before server starts.
  - `src/config/database.ts`: Single shared database connection module using `@prisma/adapter-pg` and `pg.Pool`, exporting `prisma` for repositories only.
  - `src/utils/response.ts`: Standard API envelope builders (`successResponse`, `errorResponse`) enforcing `{ data, error, meta }`.
  - `src/errors/appError.ts`: Domain error hierarchy (`AppError`, `NotFoundError`, `ValidationError`, `BadRequestError`).
  - `src/middleware/requestLogger.ts`: Logs HTTP method, URL, status code, and duration without logging headers, credentials, or request bodies.
  - `src/middleware/validateRequest.ts`: Zod request validation middleware validating `params`, `query`, and `body`.
  - `src/middleware/errorHandler.ts`: Global error handler mapping domain errors, Zod validation errors, and malformed JSON into the standard envelope while masking raw database errors and stack traces.
  - `src/middleware/notFound.ts`: Fallback 404 handler with standard error envelope.
  - `src/routes/health.routes.ts`: `GET /health` endpoint returning system status and uptime without exposing secrets.
- **MVC Layer for Tickets:**
  - `src/schemas/ticket.schema.ts`: Request validation schemas for ID params, pagination/filter queries, create body, and update body.
  - `src/repositories/tickets.repository.ts`: Strictly encapsulates all Prisma operations (`findMany`, `findById`, `create`, `update`, `delete`, `countRelations`).
  - `src/services/tickets.service.ts`: Implements business orchestration, pagination calculation, existence verification, and relationship safety checks.
  - `src/controllers/tickets.controller.ts`: Handles HTTP request/response mapping and invokes service methods.
  - `src/routes/tickets.routes.ts`: Pure route declarations attaching validation middleware to controller actions.
  - `src/routes/index.ts`: Central v1 API router mounting `/tickets`.
  - `src/app.ts`: Express application setup with CORS, JSON parsing, logging, and error pipelines.
  - `src/server.ts`: Starts HTTP listener on configured port with signal traps for graceful shutdown (`SIGINT`, `SIGTERM`).
  - `src/index.ts`: Re-exports application and server.

## 3. Files Created and Modified
### Created:
- `apps/api/src/config/env.ts`
- `apps/api/src/config/database.ts`
- `apps/api/src/utils/response.ts`
- `apps/api/src/errors/appError.ts`
- `apps/api/src/middleware/requestLogger.ts`
- `apps/api/src/middleware/validateRequest.ts`
- `apps/api/src/middleware/errorHandler.ts`
- `apps/api/src/middleware/notFound.ts`
- `apps/api/src/schemas/ticket.schema.ts`
- `apps/api/src/repositories/tickets.repository.ts`
- `apps/api/src/services/tickets.service.ts`
- `apps/api/src/controllers/tickets.controller.ts`
- `apps/api/src/routes/health.routes.ts`
- `apps/api/src/routes/tickets.routes.ts`
- `apps/api/src/routes/index.ts`
- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/tests/api.test.ts`

### Modified:
- `apps/api/package.json` (added dependencies and `"test"` script)
- `apps/api/package-lock.json`
- `apps/api/src/index.ts` (re-exports `app` and `server`)
- `docs/prompt-journal.md` (appended Day 9 entry)

## 4. Problems Encountered and Solutions
- **Express 5 Read-Only `req.query` and `req.params`:** In Express 5, `req.query` is a getter on `IncomingMessage` and direct assignment (`req.query = parsed`) throws a TypeError. Solved by using `Object.defineProperty(req, "query", { value: parsedQuery, writable: true, configurable: true })` in the validation middleware.
- **Strict RFC 4122 UUID Validation vs. Seed UUIDs:** Zod's default `.uuid()` validator strictly enforces RFC 4122 version and variant bits. Day 8's deterministic database seeds (e.g. `00000002-0000-0000-0000-000000000002`) failed this check despite being valid PostgreSQL UUIDs. Solved by defining a canonical 32-hex UUID regex (`/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/`), ensuring compatibility with both standard UUIDv4 and deterministic seed records.
- **Test Isolation and Seed Preservation:** Tests were designed to find existing tickets for read tests and isolate create/update tests with dedicated cleanup in an `after` hook. Verified that the database record count remained exactly 50 tickets after all test runs.
- **Database Teardown Encapsulation:** Decoupled `server.ts` from direct Prisma and pg dependencies by introducing `disconnectDatabase(): Promise<void>` in `src/config/database.ts` with error traps.

## 5. Tests Executed & Actual Output
Test runner: Node.js native test runner (`tsx --test tests/**/*.test.ts`) using `node:test`, `node:assert/strict`, and `supertest`.

```
▶ SupportDesk Day 9 — API Skeleton & MVC Architecture Tests
  ▶ 1. GET /health
    ✔ returns 200 with status ok and standard response envelope
  ▶ 2. GET /api/v1/tickets (List & Filtering)
    ✔ returns 200 with paginated ticket list and meta
    ✔ filters tickets by status
    ✔ filters tickets by priority
  ▶ 3. Pagination Parameter Validation
    ✔ rejects negative page parameter with 400 VALIDATION_ERROR
    ✔ rejects non-numeric page parameter with 400 VALIDATION_ERROR
    ✔ rejects limit exceeding maximum 100 with 400 VALIDATION_ERROR
  ▶ 4. Query Enum Filter Validation
    ✔ rejects invalid status filter with 400 VALIDATION_ERROR
    ✔ rejects invalid priority filter with 400 VALIDATION_ERROR
  ▶ 5. GET /api/v1/tickets/:id (Fetch existing ticket)
    ✔ returns 200 with ticket detail and relations
  ▶ 6. GET /api/v1/tickets/:id (Fetch nonexistent ticket)
    ✔ returns 404 with NOT_FOUND error code
  ▶ 7. GET /api/v1/tickets/:id (Invalid UUID format)
    ✔ returns 400 with VALIDATION_ERROR
  ▶ 8. POST /api/v1/tickets (Create valid ticket)
    ✔ returns 201 with newly created ticket
  ▶ 9. POST /api/v1/tickets (Create invalid ticket)
    ✔ returns 400 when fields fail validation constraints
  ▶ 10. PATCH /api/v1/tickets/:id (Update existing ticket)
    ✔ returns 200 with updated fields
  ▶ 11. PATCH /api/v1/tickets/:id (Update nonexistent ticket)
    ✔ returns 404 when updating non-existent UUID
  ▶ 12. Standard Response Envelope Contract
    ✔ enforces { data, error, meta } on success
    ✔ enforces { data: null, error: { code, message }, meta } on 404 error
  ▶ 13. Safe Error Handling
    ✔ returns 400 for malformed JSON request body
    ✔ returns 404 with standard envelope for unmapped endpoint
    ✔ safely handles unexpected 500 error without exposing stack or raw details
  ▶ 14. Environment Configuration Validation (Unit)
    ✔ rejects configuration when DATABASE_URL is missing
    ✔ rejects configuration when PORT is negative
    ✔ rejects configuration when PORT is non-numeric
    ✔ successfully parses valid configuration and coerces string port to number
✔ SupportDesk Day 9 — API Skeleton & MVC Architecture Tests (201ms)
ℹ tests 25
ℹ suites 15
ℹ pass 25
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

---

## Entry 13 — Frontend Foundations: React, Vite, Tailwind CSS & Authentication

**Date:** 12 November 2026  
**Week:** 3  
**Day:** 13 (Week 3 Day 1)  

### 1. Task / Context
Implement the frontend foundations for SupportDesk in `apps/web` using React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, React Hook Form, and React Router DOM. Deliver a production-grade, accessible login experience, authentication state management, centralized API client, protected application shell, and ticket feature scaffolding.

### 2. Exact Prompts Used

**Primary Task Prompt:**
> "Act as a Senior Full-Stack Engineer and Frontend Architect working on my existing SupportDesk project. Your task is to implement Week 3 — Day 1 (Day 13): Frontend Foundations with AI. Technology stack: React, Vite, TypeScript, Tailwind CSS, TanStack Query, React Hook Form, existing Node.js + Express backend, PostgreSQL + Prisma. Preserve all existing backend functionality and follow established repository conventions."

**Refinement & Decision Prompt:**
> "Review your previously generated SupportDesk Day 13 implementation plan. Before implementation, correct the following issues:
> 1. TOKEN STORAGE: Do not assume localStorage is the approved JWT storage mechanism. Identify security implications.
> 2. PASSWORD VALIDATION: Inspected backend login schema requires a non-empty password. Do not invent an eight-character minimum for login.
> 3. API BASE URL: Remove hardcoded localhost fallback. Require VITE_API_BASE_URL and provide a clear configuration error if missing.
> 4. DEPENDENCIES: Provide final proposed dependency list with exact compatible versions.
> 5. LOGOUT: Backend has no logout endpoint. Document client-side logout limitations."
>
> "The project owner has authorized me to make technical decisions independently. Proceed with:
> 1. JWT storage: sessionStorage.
> 2. Logout: Client-side logout only. Clear sessionStorage, auth context, and TanStack Query cache.
> 3. API client: Native Fetch API with centralized configuration and typed errors.
> 4. API base URL: Required VITE_API_BASE_URL.
> 5. Routing: React Router DOM.
> 6. Server-state: TanStack Query.
> 7. Forms: React Hook Form.
> 8. Styling: Tailwind CSS 3.4.
> 9. Testing: Vitest and React Testing Library.
> 10. Icons: Lucide React."

### 3. Summary of AI Response & Implementation Plan
1. **Frontend Architecture Setup (`apps/web`):**
   - Initialized Vite + React + TypeScript application with Tailwind CSS 3.4.
   - Configured path aliases, PostCSS, and strict TypeScript configurations.
2. **Centralized Native Fetch API Client (`src/lib/api-client.ts`):**
   - Enforced runtime requirement for `VITE_API_BASE_URL` with descriptive startup error.
   - Created typed custom error class `ApiError` mapping backend `{ data, error: { code, message, details }, meta }`.
   - Automatic Bearer token extraction from `sessionStorage` and injection into request headers.
   - Global 401 session expiration event listener decoupling API client from UI layer.
   - Typed helper functions (`request`, `loginUser`).
3. **Authentication Context & State (`src/lib/auth.tsx`):**
   - React Context provider (`AuthProvider`) and consumer hook (`useAuth`).
   - Token and user session persistence using `sessionStorage`.
   - In-memory reactive state synchronized with storage and session restoration on initial mount.
   - Full client-side logout: clears `sessionStorage`, resets auth state, and wipes TanStack Query cache.
   - Custom event listener for API client 401 interceptor triggering automatic logout.
4. **Accessible Login Experience (`src/pages/LoginPage.tsx`):**
   - React Hook Form validation with email format check and non-empty password matching backend contract (`loginBodySchema`).
   - Password visibility toggle with accessible ARIA labeling.
   - Dynamic error banners distinguishing invalid credentials (401), rate limits (429), and network errors.
   - Loading indicator and disabled submit state during pending requests.
5. **App Layout & Protected Routing (`src/components/layout/`, `src/App.tsx`):**
   - `Header`: User profile display, role badge (`CUSTOMER`, `AGENT`, `ADMIN`), and logout button.
   - `Sidebar`: Navigation links for Dashboard and Tickets with active state indicators.
   - `AppLayout`: Responsive container with sidebar and header wrapping child routes via `<Outlet />`.
   - `ProtectedRoute`: Route guard checking authentication state and redirecting unauthenticated users to `/login`.
   - `DashboardPage`: Welcome banner and key platform metric placeholder cards.
6. **Feature Scaffolding:**
   - Scaffolded `src/features/tickets/api/`, `hooks/`, and `components/` with `.gitkeep` files without premature business logic.
7. **Automated Testing Suite:**
   - Configured Vitest + React Testing Library + jsdom.
   - 23 unit and integration tests across API client, auth context, login page, and protected routing.

### 4. Key Architectural & Security Decisions
- **Token Storage Decision (`sessionStorage` vs `localStorage` vs HttpOnly Cookies):**
  - Evaluated: `localStorage` persists across browser sessions and tabs, increasing exposure to long-term XSS harvesting. `HttpOnly` SameSite cookies prevent client-side JavaScript access entirely, but require backend cookie handling and CORS credentials not currently implemented in the stateless Bearer token API.
  - Selected: `sessionStorage`. Chosen as a pragmatic initial storage choice that requires no backend alterations, with the following documented security characteristics:
    - `sessionStorage` is strictly scoped to a browser tab's specific page session and prevents token leakage across disparate tabs.
    - It remains accessible to any JavaScript executing in the same origin and is **vulnerable to XSS**.
    - Browser session restoration mechanisms (such as "Reopen Closed Tab" or crash recovery) may preserve `sessionStorage` state across tab restarts; tokens are not immediately or universally destroyed.
    - It is a pragmatic initial storage choice, not an XSS-proof security solution.
- **Client-Side Logout Boundary:**
  - Because the existing backend is a stateless JWT architecture with no token denylist or revocation endpoint (`/api/v1/auth/logout`), logout is enforced strictly on the client.
  - Logout clears `sessionStorage`, resets in-memory React state, and cancels/clears all cached queries in TanStack Query (`queryClient.clear()`).
  - Documented limitation: issued JWT tokens remain cryptographically valid server-side until expiration (`1d`).
- **Contract Fidelity (No Assumed Validations):**
  - Backend `loginBodySchema` validates: `email` (valid email) and `password` (`min(1)`).
  - The login form strictly validates non-empty password rather than assuming an 8-character minimum, preventing client-side rejection of valid legacy accounts.
- **Strict Environment Validation:**
  - `VITE_API_BASE_URL` is validated on client startup. If omitted, it immediately throws `Configuration Error: VITE_API_BASE_URL is not defined` rather than silently defaulting to `localhost`.

### 5. Files Created and Modified
#### Created:
- `apps/web/package.json`
- `apps/web/package-lock.json`
- `apps/web/tsconfig.json`
- `apps/web/tsconfig.node.json`
- `apps/web/vite.config.ts`
- `apps/web/tailwind.config.js`
- `apps/web/postcss.config.js`
- `apps/web/index.html`
- `apps/web/.env.example`
- `apps/web/.env` (gitignored)
- `apps/web/src/vite-env.d.ts`
- `apps/web/src/index.css`
- `apps/web/src/lib/utils.ts`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/lib/auth.tsx`
- `apps/web/src/components/ui/Button.tsx`
- `apps/web/src/components/ui/Input.tsx`
- `apps/web/src/components/ui/Card.tsx`
- `apps/web/src/components/ui/Alert.tsx`
- `apps/web/src/components/layout/Header.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/layout/AppLayout.tsx`
- `apps/web/src/pages/LoginPage.tsx`
- `apps/web/src/pages/DashboardPage.tsx`
- `apps/web/src/pages/TicketsPlaceholderPage.tsx`
- `apps/web/src/features/tickets/api/.gitkeep`
- `apps/web/src/features/tickets/hooks/.gitkeep`
- `apps/web/src/features/tickets/components/.gitkeep`
- `apps/web/src/App.tsx`
- `apps/web/src/main.tsx`
- `apps/web/tests/setup.ts`
- `apps/web/tests/api-client.test.ts`
- `apps/web/tests/auth.test.tsx`
- `apps/web/tests/LoginPage.test.tsx`
- `apps/web/tests/ProtectedRoute.test.tsx`

#### Modified:
- `docs/prompt-journal.md` (appended Day 13 entry)

### 6. Problems Encountered and Solutions
1. **TypeScript Global Types for `import.meta.env`:**
   - *Problem:* `Property 'VITE_API_BASE_URL' does not exist on type 'ImportMetaEnv' (TS2339)`.
   - *Solution:* Created `apps/web/src/vite-env.d.ts` extending `ImportMetaEnv` with typed `VITE_API_BASE_URL: string`.
2. **Vitest / esbuild JSX Parsing:**
   - *Problem:* Running Vitest on `tests/auth.test.ts` failed with syntax error because esbuild expects JSX in `.tsx` files.
   - *Solution:* Renamed test file to `tests/auth.test.tsx`.
3. **React Testing Library Ambiguous Text Queries:**
   - *Problem:* `getByText("CUSTOMER")` matched both user profile role badge in Header and role banner in Dashboard.
   - *Solution:* Switched to `getAllByText("CUSTOMER")` and verified presence in DOM.
4. **Local Port 5000 AirPlay Conflict:**
   - *Problem:* macOS ControlCenter AirTunes occupies port 5000 by default.
   - *Solution:* Backend API was configured to run on port 5001, and frontend `.env` set `VITE_API_BASE_URL=http://localhost:5001/api/v1`.
5. **Sandbox Loopback EPERM for Integration Tests:**
   - *Problem:* Node `supertest` / `fetch` commands connecting to loopback ports require elevated permissions in the sandbox.
   - *Solution:* Successfully verified tests with sandbox bypass for network connections; 100% of unit tests pass in isolated sandboxed mode.

### 7. Tests Executed & Actual Output
**Frontend Vitest Suite (`npm test -- --run` in `apps/web`):**
```
 ✓ tests/api-client.test.ts (9 tests)
 ✓ tests/auth.test.tsx (4 tests)
 ✓ tests/ProtectedRoute.test.tsx (2 tests)
 ✓ tests/LoginPage.test.tsx (8 tests)

 Test Files  4 passed (4)
      Tests  23 passed (23)
   Start at  10:26:28
   Duration  1.80s
```

**Frontend Typecheck & Build:**
```
$ npm run typecheck
tsc --noEmit -> 0 errors

$ npm run build
tsc -b && vite build -> 1653 modules transformed, dist/ generated in 1.05s
```

**Backend Regression Test Suite (`npm test` in `apps/api`):**
```
Test Suites: 7 passed, 7 total
Tests:       119 passed, 119 total
Snapshots:   0 total
Time:        2.082 s
Ran all test suites.
```

**Live Backend Authentication Verification:**
```
Register status: 201 Created -> { data: { user, accessToken }, error: null, meta: {} }
Login status: 200 OK -> { data: { user, accessToken }, error: null, meta: {} }
Protected GET /api/v1/tickets with Bearer token: 200 OK -> data count: 0
Protected GET /api/v1/tickets without token: 401 UNAUTHORIZED -> "Authorization header is missing"
Invalid credentials login: 401 UNAUTHORIZED -> "Invalid email or password"
```

---

## Entry 14 — Day 14 Stage 1: Shared Zod Schema and Centralized Ticket API Foundation

**Date:** 13 November 2026  
**Week:** 3  
**Day:** 14 (Stage 1)  

### 1. Task / Context
Implement the shared Zod schema integration between frontend and backend, comprehensive TypeScript contracts for tickets and comments, and centralized ticket API service functions in `apps/web/src/features/tickets/`. Enforce zero schema duplication, verify query parameter serialization, and author dedicated automated Vitest tests without modifying backend source code.

### 2. Exact Prompts Used

**Stage 1 Prompt:**
> "Implement only the shared Zod schema integration, ticket/comment types, and centralized ticket API functions.
> Git requirements:
> - Repository: SupportDesk
> - Create branch: feat/web-tickets-screen
> - Base branch: feat/web-login-foundation
> - Preserve all existing uncommitted and untracked files.
> - Do not modify or stage supportdesk_messy_express_demo.js.
> - Do not merge any PR.
> Implementation tasks:
> 1. Shared Zod integration: Use the exact backend createTicketBodySchema. Do not duplicate or rewrite the schema. Configure Vite and TypeScript path resolution safely for the shared backend schema.
> 2. Ticket and comment types: Create apps/web/src/features/tickets/types.ts defining Ticket, TicketStatus, TicketPriority, Comment, ListTicketsQuery, Pagination metadata, and input types.
> 3. Ticket API functions: Create apps/web/src/features/tickets/api/tickets.api.ts implementing listTickets, getTicketById, createTicket, updateTicket, listComments, createComment using api-client.ts.
> 4. Tests: Add focused Vitest tests for shared schema import, query parameter serialization, API responses, error propagation, and endpoints."

### 3. Summary of Implementation & Architecture
1. **Shared Zod Schema Integration:**
   - Instead of duplicating `createTicketBodySchema`, `apps/web` directly imports the exact schema from `apps/api/src/schemas/ticket.schema.ts`.
   - Configured Vite path alias `@supportdesk/schemas` in `apps/web/vite.config.ts`.
   - Configured TypeScript paths mapping `@supportdesk/schemas/*` and updated `"include"` in `apps/web/tsconfig.json`.
   - Installed matching `zod` (`4.6.7`) and `@hookform/resolvers` in `apps/web/package.json`.
2. **Contracts & Domain Types (`apps/web/src/features/tickets/types.ts`):**
   - Re-exported inferred schema types `CreateTicketInput`, `UpdateTicketInput`, `ListTicketsQuery` directly from backend schema.
   - Defined `ListTicketsParams` as `z.input<typeof listTicketsQuerySchema>` to allow flexible client-side filter queries before server-side defaults apply.
   - Defined complete domain models: `Ticket`, `TicketStatus`, `TicketPriority`, `Comment`, `UserSummary`, `PaginationMeta`, `PaginatedTicketsResponse`, `CreateCommentInput`.
3. **Centralized Ticket API Service (`apps/web/src/features/tickets/api/tickets.api.ts`):**
   - Extended `apps/web/src/lib/api-client.ts` with `apiRequestWithMeta<T>` to preserve backend response metadata (`pagination: { page, limit, total, totalPages }`).
   - Implemented `buildQueryString` supporting `page`, `limit`, `status`, `priority`, `category`, `search`, `sortBy`, `sortOrder`, and `assigneeId`, stripping empty/whitespace values.
   - Implemented `listTickets`, `getTicketById`, `createTicket`, `updateTicket`, `listComments`, and `createComment`.
   - Guaranteed security and contract fidelity: authentication tokens are attached automatically by the centralized client via `sessionStorage`, and internal comments are controlled strictly by backend RBAC rather than client filtering.
4. **Focused Vitest Test Suite (`apps/web/tests/tickets.api.test.ts`):**
   - 17 new automated tests covering:
     - Shared schema import and validation (valid payload, title min 3, description min 5, update rejection of empty payloads).
     - Query string serialization (empty, pagination, compound filters, whitespace trimming, sorting).
     - Full mock API lifecycle for all 6 operations (`GET`, `POST`, `PATCH`).
     - Error handling and propagation (`ApiError` with status codes 404, 403, 400).

### 4. Files Created and Modified
#### Created:
- `apps/web/src/features/tickets/types.ts`
- `apps/web/src/features/tickets/api/tickets.api.ts`
- `apps/web/tests/tickets.api.test.ts`

#### Modified:
- `apps/web/package.json` (added `zod` 4.6.7 and `@hookform/resolvers`)
- `apps/web/package-lock.json`
- `apps/web/vite.config.ts` (added `@supportdesk/schemas` path alias)
- `apps/web/tsconfig.json` (added `@supportdesk/schemas/*` path mapping and include)
- `apps/web/src/lib/api-client.ts` (added `apiRequestWithMeta<T>`)
- `docs/prompt-journal.md` (appended Day 14 Stage 1 entry)

### 5. Problems Encountered and Solutions
1. **Zod Output vs. Input Query Types (`TS2345`):**
   - *Problem:* `listTicketsQuerySchema` defines `.default(...)` for `page`, `limit`, `sortBy`, and `sortOrder`. In Zod, `z.infer` evaluates to the parsed output type (where defaulted fields are required). Passing partial filter objects (e.g. `{ status: "OPEN" }`) caused a TypeScript type error.
   - *Solution:* Defined `ListTicketsParams = z.input<typeof listTicketsQuerySchema>`, accurately typing client-side query parameters before backend parsing applies defaults.
2. **Accessing Pagination Metadata from Envelope:**
   - *Problem:* `apiRequest<T>` unwrapped only `payload.data`, dropping `payload.meta.pagination`.
   - *Solution:* Added `apiRequestWithMeta<T>` in `api-client.ts`, refactoring the core request logic into `executeRequest` without breaking backward compatibility for any existing Day 13 endpoints or tests.

### 6. Tests Executed & Actual Output
```
$ npm run typecheck
tsc --noEmit -> 0 errors

$ npm run build
tsc -b && vite build -> 1653 modules transformed, dist/ generated in 1.22s

$ npm test -- --run
 ✓ tests/api-client.test.ts (9 tests)
 ✓ tests/auth.test.tsx (4 tests)
 ✓ tests/tickets.api.test.ts (17 tests)
 ✓ tests/ProtectedRoute.test.tsx (2 tests)
 ✓ tests/LoginPage.test.tsx (8 tests)

 Test Files  5 passed (5)
      Tests  40 passed (40)
   Duration  2.01s
```

---

## Entry 15 — Day 14 Stage 2: TanStack Query Hooks for Tickets & Comments

**Date:** 13 November 2026  
**Week:** 3  
**Day:** 14 (Stage 2)  

### 1. Task / Context
Implement TanStack Query v5 custom hooks for ticket querying, detail fetching, ticket mutations, comment listing, and comment creation. Establish a centralized query key factory with filter/pagination encapsulation, cache invalidation strategies, and authentication session isolation.

### 2. Exact Prompts Used

**Stage 2 Prompt:**
> "Implement the TanStack Query hooks for tickets and comments using the Stage 1 API functions.
> Requirements:
> 1. Query key architecture: Create a centralized query key factory. Ticket list keys must include all relevant filters and pagination parameters. Ticket detail keys must include ticket ID. Comment keys must include ticket ID.
> 2. Implement hooks under apps/web/src/features/tickets/hooks/:
>    - useTickets.ts: Fetch paginated tickets using listTickets.
>    - useTicket.ts: Fetch ticket by ID with disabled state when ID is missing.
>    - useTicketMutations.ts: useCreateTicket (invalidates lists) and useUpdateTicket (updates detail cache and invalidates lists).
>    - useComments.ts: useComments query and useCreateComment mutation (invalidates comments).
> 3. Tests: Add focused hook tests covering list success/error, key isolation, detail success/disabled, mutation invalidations, and cache isolation across logout."

### 3. Query Key Architecture & Cache Invalidation
- **Query Key Factory (`queryKeys.ts`):**
  - `ticketKeys.all`: `["tickets"]`
  - `ticketKeys.lists()`: `["tickets", "list"]`
  - `ticketKeys.list(params)`: `["tickets", "list", params ?? {}]`
  - `ticketKeys.details()`: `["tickets", "detail"]`
  - `ticketKeys.detail(id)`: `["tickets", "detail", id]`
  - `commentKeys.all`: `["comments"]`
  - `commentKeys.lists()`: `["comments", "list"]`
  - `commentKeys.list(ticketId)`: `["comments", "list", ticketId]`
- **Cache Invalidation Strategy:**
  - `useCreateTicket`: On success, calls `queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })` ensuring newly created tickets appear in all ticket list views.
  - `useUpdateTicket`: On success, calls `queryClient.setQueryData(ticketKeys.detail(id), updatedTicket)`, updates the single ticket detail in cache, and calls `queryClient.invalidateQueries` on `ticketKeys.detail(id)` and `ticketKeys.lists()`.
  - `useCreateComment`: On success, calls `queryClient.invalidateQueries({ queryKey: commentKeys.list(ticketId) })`, automatically refetching the chronological comment thread.
- **Authentication Session & Cache Isolation:**
  - In `apps/web/src/lib/auth.tsx`, the `logout()` callback explicitly executes `queryClient.clear()`.
  - This completely purges all in-memory query caches when a user signs out, preventing cross-account leakage (e.g. customer data lingering in cache when switching to an agent account). Verified through automated testing.

### 4. Zod Resolver Compatibility Finding
- Inspected installed `@hookform/resolvers` (`^4.1.3`) with `zod` (`4.6.7`).
- Verified execution: `zodResolver(schema)` correctly parses and validates schemas under Zod 4, producing expected `{ errors }` on invalid payloads and `{ values }` on valid data without warnings or runtime breaks.

### 5. Files Created and Modified
#### Created:
- `apps/web/src/features/tickets/hooks/queryKeys.ts`
- `apps/web/src/features/tickets/hooks/useTickets.ts`
- `apps/web/src/features/tickets/hooks/useTicket.ts`
- `apps/web/src/features/tickets/hooks/useTicketMutations.ts`
- `apps/web/src/features/tickets/hooks/useComments.ts`
- `apps/web/src/features/tickets/hooks/index.ts`
- `apps/web/tests/ticket.hooks.test.tsx`

#### Modified:
- `docs/prompt-journal.md` (appended Day 14 Stage 2 entry)

### 6. Tests Executed & Actual Output
```
$ npm run typecheck
tsc --noEmit -> 0 errors

$ npm run build
tsc -b && vite build -> 1653 modules transformed, dist/ generated in 1.15s

$ npm test -- --run
 ✓ tests/api-client.test.ts (9 tests)
 ✓ tests/auth.test.tsx (4 tests)
 ✓ tests/tickets.api.test.ts (17 tests)
 ✓ tests/ticket.hooks.test.tsx (10 tests)
 ✓ tests/ProtectedRoute.test.tsx (2 tests)
 ✓ tests/LoginPage.test.tsx (8 tests)

 Test Files  6 passed (6)
      Tests  50 passed (50)
   Duration  2.39s
```

---

## Entry 16 — Day 14 Stage 3: Reusable & Accessible UI Component Suite

**Date:** 13 November 2026  
**Week:** 3  
**Day:** 14 (Stage 3)  

### 1. Task / Context
Implement accessible, reusable UI atoms and ticket badges for SupportDesk ticket screens (Badge, Select, Textarea, Modal, StatusBadge, PriorityBadge) following the design conventions of the existing dashboard. Ensure full keyboard accessibility, ARIA associations, responsive styles, and author comprehensive Vitest component tests.

### 2. Exact Prompts Used

**Stage 3 Prompt:**
> "Build reusable, accessible UI components required for the Ticket List, Ticket Detail, Create Ticket, and Comment screens.
> Create:
> - Badge.tsx (neutral, success, warning, danger, brand variants)
> - Select.tsx (label, options, placeholder, disabled, error, accessible attributes)
> - Textarea.tsx (label, placeholder, rows, disabled, error, optional character counter)
> - Modal.tsx (accessible dialog, close button, escape key listener, backdrop click, focus management, body scroll lock)
> - StatusBadge.tsx (OPEN, IN_PROGRESS, WAITING_ON_CUSTOMER, RESOLVED, CLOSED)
> - PriorityBadge.tsx (P1, P2, P3, P4)
> Design requirements: Follow existing SupportDesk dashboard design, consistent spacing, readable contrast, focus indicators.
> Tests: Add tests covering badge variants, 5 statuses, 4 priorities, select label/error/disabled, textarea label/error/counter, modal open/close, escape-key, modal accessibility."

### 3. Summary of Implementation & Components Created
1. **`Badge.tsx` (`src/components/ui/Badge.tsx`):**
   - Lightweight, accessible pill component supporting 5 visual variants: `neutral`, `success`, `warning`, `danger`, and `brand` with sizes `sm` and `md`.
2. **`Select.tsx` (`src/components/ui/Select.tsx`):**
   - Accessible form dropdown supporting options array or native `<option>` children.
   - Chevron icon indicator, `aria-invalid`, `aria-describedby` linking to error or helper text, and disabled states matching `Input.tsx`.
3. **`Textarea.tsx` (`src/components/ui/Textarea.tsx`):**
   - Multi-line input with forwardRef, responsive resize, dynamic character counter (`showCount` + `maxLength`), and accessible error alerts.
4. **`Modal.tsx` (`src/components/ui/Modal.tsx`):**
   - Pure React accessible dialog (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`).
   - Backdrop overlay with blur, ESC-key keyboard listener, backdrop click dismiss, body scroll lock/unlock on mount/unmount, and header close button. Zero external library bloat.
5. **`StatusBadge.tsx` (`src/features/tickets/components/StatusBadge.tsx`):**
   - Color-coded badges with dot indicators for all 5 verified backend statuses:
     - `OPEN`: Brand blue
     - `IN_PROGRESS`: Amber
     - `WAITING_ON_CUSTOMER`: Neutral gray
     - `RESOLVED`: Emerald green
     - `CLOSED`: Neutral slate
6. **`PriorityBadge.tsx` (`src/features/tickets/components/PriorityBadge.tsx`):**
   - Distinct severity styling for all 4 priorities:
     - `P1`: Red ("P1 — Critical")
     - `P2`: Orange ("P2 — High")
     - `P3`: Blue ("P3 — Medium")
     - `P4`: Gray ("P4 — Low")

### 4. Files Created and Modified
#### Created:
- `apps/web/src/components/ui/Badge.tsx`
- `apps/web/src/components/ui/Select.tsx`
- `apps/web/src/components/ui/Textarea.tsx`
- `apps/web/src/components/ui/Modal.tsx`
- `apps/web/src/features/tickets/components/StatusBadge.tsx`
- `apps/web/src/features/tickets/components/PriorityBadge.tsx`
- `apps/web/tests/components.ui.test.tsx`

#### Modified:
- `docs/prompt-journal.md` (appended Day 14 Stage 3 entry)

### 5. Tests Executed & Actual Output
```
$ npm run typecheck
tsc --noEmit -> 0 errors

$ npm run build
tsc -b && vite build -> 1653 modules transformed, dist/ generated in 1.39s

$ npm test -- --run
 ✓ tests/api-client.test.ts (9 tests)
 ✓ tests/auth.test.tsx (4 tests)
 ✓ tests/tickets.api.test.ts (17 tests)
 ✓ tests/ticket.hooks.test.tsx (10 tests)
 ✓ tests/components.ui.test.tsx (17 tests)
 ✓ tests/ProtectedRoute.test.tsx (2 tests)
 ✓ tests/LoginPage.test.tsx (8 tests)

 Test Files  7 passed (7)
      Tests  67 passed (67)
   Duration  1.93s
```


---

## Entry 17 — Day 14 Stage 3: Modal Accessibility Verification & Focus Trapping

**Date:** 13 November 2026  
**Week:** 3  
**Day:** 14 (Stage 3 Verification)  

### 1. Task / Context
Perform an accessibility audit and verification on `apps/web/src/components/ui/Modal.tsx` prior to Stage 4 screen implementation. Address verified accessibility gaps regarding focus management, focus trapping, focus restoration upon closing, background interaction containment, and dismissal controls without introducing third-party modal dependencies or redesigning the component.

### 2. Exact Prompts Used

**Accessibility Verification Prompt:**
> "Before starting Stage 4, audit the existing Modal.tsx implementation.
> Important: Do not redesign or rewrite the entire component. Preserve the existing UI and functionality.
> Verify these behaviours:
> 1. When the modal opens, focus moves inside it.
> 2. Pressing Tab and Shift+Tab keeps focus inside the modal.
> 3. When the modal closes, focus returns to the element that opened it.
> 4. Background content cannot be interacted with while the modal is open.
> 5. Escape closes the modal when dismissal is enabled.
> 6. Event listeners and body styles are cleaned up correctly when the modal closes or unmounts.
> Implementation rules:
> - Make only the changes necessary to address verified gaps.
> - Preserve existing component props and API unless a change is essential.
> - Avoid introducing a new dependency unless genuinely required.
> - Do not modify ticket API functions, hooks, backend code, or unrelated components.
> Tests:
> Add or update tests for focus trapping, focus restoration, and background isolation."

### 3. Identified Accessibility Gaps & Implementation Details
1. **Focus Initialization:**
   - *Previous Gap:* The modal only focused the outer container element (`modalRef.current?.focus()`).
   - *Fix:* When the modal opens, it queries for interactive elements (`a[href]`, `button`, `input`, `select`, `textarea`, `[tabindex]`). It prioritizes elements marked with `[autofocus]` or `[data-autofocus]`, then falls back to the first interactive element (such as the Close button), and finally to the container itself if no interactive elements exist.
2. **Focus Trapping (`Tab` & `Shift+Tab`):**
   - *Previous Gap:* Tab and Shift+Tab keys bled out of the modal into background DOM elements.
   - *Fix:* Added keyboard event handler for `Tab`:
     - Pressing `Tab` on the last focusable element wraps focus back to the first focusable element.
     - Pressing `Shift+Tab` on the first focusable element wraps focus back to the last focusable element.
     - Pressing `Tab` or `Shift+Tab` when focus is outside the modal immediately pulls focus back inside the modal dialog.
3. **Focus Restoration on Close/Unmount:**
   - *Previous Gap:* Closing the modal left focus stranded at `document.body`.
   - *Fix:* Captured `triggerElementRef.current = document.activeElement` when the modal opens. On unmount or when `isOpen` transitions to `false`, the cleanup hook safely restores focus to `triggerElementRef.current?.focus()`.
4. **Background Isolation:**
   - *Previous Gap:* Background DOM elements could still receive focus if clicked or navigated to externally.
   - *Fix:* Added a global `focusin` listener that intercepts any external focus events while the modal is open and immediately bounces focus back into the modal dialog. In conjunction with `aria-modal="true"`, full-viewport backdrop click interception, and `overflow: hidden`, background content cannot be interacted with.
5. **Dismissal Controls & Cleanup:**
   - Added optional `closeOnEscape?: boolean` (default `true`) and `closeOnBackdropClick?: boolean` (default `true`) to allow controllable dismissal.
   - Verified that all event listeners (`keydown`, `focusin`) and body style overrides (`document.body.style.overflow`) are cleanly removed and restored upon closing or unmounting.

### 4. Files Modified
- `apps/web/src/components/ui/Modal.tsx`
- `apps/web/tests/components.ui.test.tsx`
- `docs/prompt-journal.md`

### 5. Tests Executed & Actual Output
```
$ npm run typecheck
tsc --noEmit -> 0 errors

$ npm run build
tsc -b && vite build -> 1653 modules transformed, dist/ generated in 1.18s

$ npm test -- --run
 ✓ tests/api-client.test.ts (9 tests)
 ✓ tests/auth.test.tsx (4 tests)
 ✓ tests/tickets.api.test.ts (17 tests)
 ✓ tests/ticket.hooks.test.tsx (10 tests)
 ✓ tests/components.ui.test.tsx (24 tests)
 ✓ tests/ProtectedRoute.test.tsx (2 tests)
 ✓ tests/LoginPage.test.tsx (8 tests)

 Test Files  7 passed (7)
      Tests  74 passed (74)
   Duration  1.66s
```


---

## Entry 18 — Day 14 Stage 4A: Ticket List Screen

**Date:** 13 November 2026  
**Week:** 3  
**Day:** 14 (Stage 4A)  

### 1. Task / Context
Implement the production-grade Ticket List Screen using the existing SupportDesk frontend architecture, TanStack Query hooks, and reusable UI components. Deliver a responsive table and card view, server-side pagination with backend metadata, live search, status and priority filtering, filter clearing, empty/no-results/error/loading states, and detail route navigation without inventing unsupported backend endpoints or doing insecure client-side filtering.

### 2. Exact Prompts Used

**Stage 4A Prompt:**
> "Implement the Ticket List Screen using the existing frontend architecture.
> Requirements:
> 1. Fetch tickets through the existing useTickets hook.
> 2. Render a responsive ticket list/table.
> 3. Display: Ticket title, Ticket status, Priority, Category (when available), Creation date, Assignee (only when supported by actual API response).
> 4. Use existing StatusBadge and PriorityBadge components.
> 5. Add server-side pagination using the backend pagination metadata.
> 6. Add search using the existing supported search filter.
> 7. Add status and priority filters using only supported backend values.
> 8. Ensure changing filters resets pagination to page 1.
> 9. Ensure pagination changes fetch the correct server page.
> 10. Add a clear-filters action.
> 11. Clicking a ticket should navigate to its detail route, using existing routing conventions.
> Step 3: Handle UI states (initial loading, background refetch, empty state, no-results state, error state with retry, pagination disabled states).
> Step 4: Role and security considerations (CUSTOMER sees only their tickets via backend scoping; AGENT/ADMIN see workspace tickets; no client-side security filtering; no invented agent assignment dropdown).
> Step 5: Tests (rendering, loading, empty, error, badges, search, filters, pagination, page resets, navigation, query hook usage)."

### 3. Summary of Implementation & Features

1. **Core Ticket List Screen (`apps/web/src/features/tickets/components/TicketList.tsx`):**
   - Utilizes `useTickets({ page, limit: pageSize, status, priority, search })` with deep query key reactivity.
   - Dual responsive layout:
     - **Desktop Table View (`hidden md:block`):** Full tabular display featuring ticket details (title and description preview), status badge, priority badge, category badge, assignee indicator with avatar initial, formatted creation date, and interactive action link.
     - **Mobile Card View (`divide-y md:hidden`):** Touch-friendly card listing retaining full information density and tap targets.
   - Safe data rendering:
     - Category displays as a subtle neutral badge when populated or em-dash (`—`) when null.
     - Assignee displays the assigned agent's name (`ticket.assignee.name || ticket.assignee.email`) or an italicized "Unassigned" indicator when null. No fake assignment dropdowns invented.
     - Creation date formatted cleanly with standard US English formatting (`Nov 12, 2026`).

2. **Search, Filtering, and Resetting:**
   - Search bar with clear button (`X`), submit trigger, and Enter key support.
   - Status dropdown with backend enum values (`OPEN`, `IN_PROGRESS`, `WAITING_ON_CUSTOMER`, `RESOLVED`, `CLOSED`).
   - Priority dropdown with backend enum values (`P1`, `P2`, `P3`, `P4`).
   - Any change to search, status, or priority automatically resets pagination to page 1.
   - Dedicated "Clear filters" action button visible whenever any filter is active, immediately resetting state and fetching default page 1 results.

3. **Server-Side Pagination:**
   - Powered by backend pagination metadata (`total`, `totalPages`, `page`, `limit`).
   - Displays exact range (`Showing X to Y of Z tickets`) and page indicator (`Page X of Y`).
   - "Previous" disabled on page 1 or during fetching.
   - "Next" disabled on final page or during fetching.
   - Navigating pages triggers server-side queries for the targeted page.

4. **Robust UI States:**
   - **Loading State:** Centered card with animated spinner and `role="status"` live region.
   - **Background Refetch Indicator:** Subtle animated "Refreshing..." chip in the toolbar when background queries re-validate without flickering the table.
   - **Empty State:** Distinct card view when zero tickets exist for the user/system.
   - **No Results State:** Filter-specific empty view with an integrated "Clear all filters" CTA.
   - **Error State:** Accessible error `Alert` showing the server error message with an interactive "Try again" retry button.

5. **Routing Integration:**
   - Created `apps/web/src/pages/TicketsPage.tsx` and updated `apps/web/src/App.tsx` routing `/tickets` directly to `TicketsPage`.
   - Cleaned up obsolete `TicketsPlaceholderPage.tsx` from Day 13.
   - Ticket titles, cards, and row action links navigate to `/tickets/${ticket.id}`.

### 4. Files Created, Modified, and Deleted
#### Created:
- `apps/web/src/features/tickets/components/TicketList.tsx`
- `apps/web/src/features/tickets/components/index.ts`
- `apps/web/src/pages/TicketsPage.tsx`
- `apps/web/tests/TicketList.test.tsx`

#### Modified:
- `apps/web/src/App.tsx` (switched `/tickets` route to `TicketsPage`)
- `apps/web/src/components/layout/Sidebar.tsx` (typed navigation items)
- `docs/prompt-journal.md` (appended Day 14 Stage 4A entry)

#### Deleted:
- `apps/web/src/pages/TicketsPlaceholderPage.tsx` (superseded by `TicketsPage`)

### 5. Automated Tests Added & Verification Results
Added `apps/web/tests/TicketList.test.tsx` containing 11 tests:
1. `renders accessible loading indicator while fetching tickets`
2. `renders tickets with title, status, priority, category, assignee, and dates`
3. `renders empty state when no tickets are present and no filters active`
4. `renders no-results state with clear-filters action when active filters return empty`
5. `renders error state when API fails and allows retrying`
6. `applies search query and resets pagination to page 1`
7. `applies status and priority dropdown filters`
8. `handles pagination navigation and disables boundary buttons`
9. `resets page to 1 when status filter changes from page 2`
10. `resets all active filters and restores page 1 when clear-filters is clicked`
11. `navigates to /tickets/:id when clicking on ticket title or row`

```
$ npm run typecheck
tsc --noEmit -> 0 errors

$ npm test -- --run
 ✓ tests/tickets.api.test.ts (17 tests)
 ✓ tests/auth.test.tsx (4 tests)
 ✓ tests/ticket.hooks.test.tsx (10 tests)
 ✓ tests/api-client.test.ts (9 tests)
 ✓ tests/components.ui.test.tsx (24 tests)
 ✓ tests/ProtectedRoute.test.tsx (2 tests)
 ✓ tests/TicketList.test.tsx (11 tests)
 ✓ tests/LoginPage.test.tsx (8 tests)

 Test Files  8 passed (8)
      Tests  85 passed (85)
   Duration  1.77s

$ npm run build
tsc -b && vite build -> 1661 modules transformed, dist/ generated in 1.09s
```
