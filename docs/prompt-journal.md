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
