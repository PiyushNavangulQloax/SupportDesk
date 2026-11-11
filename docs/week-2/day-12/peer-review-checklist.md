# Peer Code Review Checklist & Evaluation Framework
**SupportDesk — Week 2 Day 6 (Day 12)**

---

## 1. Overview and Purpose

Code review is a core engineering practice aimed at verifying correctness, maintaining architectural consistency, enforcing security standards, and coaching fellow engineers. This checklist serves as the objective evaluation rubric when reviewing a peer's Week 2 Pull Request (PR) for the SupportDesk backend API.

Review the **actual Git diff**, not merely the final source files. Do not approve a PR simply because the code compiles or tests pass; verify that the implementation adheres to all architectural boundaries, security requirements, and domain rules.

---

## 2. Seven-Dimension Review Checklist

### A. Correctness & Business Logic
- [ ] **Acceptance Criteria:** Does the change satisfy every explicit requirement in the user story or milestone brief?
- [ ] **Input Boundaries:** Are empty strings, null values, undefined fields, negative numbers, and out-of-range inputs handled safely?
- [ ] **Data Validation:** Are all request inputs validated via Zod schemas before reaching controllers or services?
- [ ] **Success & Error Paths:** Do successful operations return the expected data and HTTP status codes (`200 OK`, `201 Created`, `204 No Content`)? Do failure scenarios throw structured application errors (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`)?
- [ ] **Regression Safety:** Does the change preserve existing functionality without breaking preexisting routes or contracts?

### B. Architecture & Layer Separation
- [ ] **Strict MVC Separation:** Are routes, controllers, services, and repositories isolated according to the agreed layered architecture?
- [ ] **Thin Controllers:** Are controllers restricted to HTTP request parameter extraction and standardized response formatting? Is all domain logic kept out of controllers?
- [ ] **Service Isolation:** Does business logic (e.g. role-based visibility, permission checks, pagination calculations) live exclusively in domain services?
- [ ] **Repository Layer Isolation:** Are all Prisma Client and raw SQL database queries encapsulated inside repository classes? Are services free of direct Prisma imports?
- [ ] **Response Envelope Consistency:** Do all endpoints return responses using the unified `{ success, data, error, meta }` response envelope?

### C. Readability, Maintainability & Clean Code
- [ ] **Naming Conventions:** Are variable, function, class, and interface names expressive, descriptive, and consistent with the codebase?
- [ ] **Single Responsibility:** Are functions small, focused, and performing a single cohesive operation?
- [ ] **Code Duplication (DRY):** Is business or query logic duplicated across multiple files where a shared helper or service method should be used?
- [ ] **Hygiene:** Is the diff free of dead code, commented-out blocks, leftover `console.log()` statements, and temporary debugging flags?
- [ ] **Self-Documenting:** Can another engineer understand the logic without requiring external author explanation?

### D. Authentication, Authorization & Security
- [ ] **Perimeter Protection:** Are protected routes wrapped with the `authenticate` middleware?
- [ ] **Role-Based Access Control (RBAC):** Are role permissions (`CUSTOMER`, `AGENT`, `ADMIN`) validated at the route or service layer?
- [ ] **Customer Ownership Isolation:** Can a customer only view, update, or comment on tickets where `createdById === user.id`?
- [ ] **Anti-Enumeration (IDOR Prevention):** Does querying a non-existent or foreign ticket return `404 Not Found` (rather than `403 Forbidden`) to prevent resource scanning?
- [ ] **Author ID Server Binding:** Is the comment/ticket author identity strictly extracted from verified JWT context (`req.user.id`) rather than trusted from client payloads?
- [ ] **Credential Protection:** Are passwords hashed with bcrypt (minimum 12 rounds)? Are password hashes strictly excluded from all API responses and repository outputs?
- [ ] **Secrets Management:** Are `.env` files, API keys, database credentials, and JWT secrets absent from Git commits?

### E. Database, Query Construction & Performance
- [ ] **Pagination at Query Level:** Are pagination parameters (`take`, `skip`) applied in the database query rather than slicing in-memory?
- [ ] **Query Filtering:** Are filters (`status`, `priority`, `assigneeId`, `search`) forwarded to Prisma `where` clauses rather than filtered in JavaScript?
- [ ] **Allowlisted Sorting:** Are `sortBy` fields validated against a strict allowlist to prevent unexpected query behavior or data leakage?
- [ ] **N+1 Query Prevention:** Are related entities retrieved using Prisma `include` or parallel `$transaction` queries rather than executing queries inside loops?
- [ ] **Migration Safety:** Are schema changes accompanied by reproducible Prisma migrations?

### F. Tests, Reliability & Edge Cases
- [ ] **Unit Test Coverage:** Are services unit-tested with mocked repositories covering both happy and error paths?
- [ ] **Access Control Tests:** Are role-based permission boundaries (e.g. customer vs. agent access) explicitly asserted in tests?
- [ ] **Integration Tests:** Are Supertest HTTP integration tests present, verifying real route handling against an isolated test database?
- [ ] **Test Database Safety:** Do integration tests target a dedicated test database (`supportdesk_test`), and is falling back to the development database prevented?
- [ ] **Determinism:** Are tests independent, isolated, and repeatable without depending on execution order?

### G. AI-Assisted Code Hygiene
- [ ] **No Invented APIs:** Does the implementation use real methods from installed library versions (e.g. Express 5, Prisma 7, Zod 4)?
- [ ] **No Incomplete Placeholders:** Is the diff free of comments like `// rest of implementation here` or `/* TODO: add logic */`?
- [ ] **Author Comprehension:** Can the author explain the rationale behind every line and architectural decision introduced?

---

## 3. How to Write Actionable Review Comments

Every constructive review comment must follow this 4-part structure:

1. **Location:** Specific file and line number (or code block).
2. **Problem:** A clear, technical explanation of what is incorrect, insecure, or substandard.
3. **Impact:** The concrete consequence (bug, security vulnerability, performance bottleneck, or maintenance burden).
4. **Suggested Action:** An actionable recommendation or code snippet, along with a regression test scenario.

### Good Review Comment Example:
```text
Issue:
File: src/services/comments.service.ts, Line 38
The service checks if the ticket exists, but does not verify that a CUSTOMER
owns the ticket before allowing comment creation.

Impact:
A customer could post comments on another customer's confidential support ticket
if they guess or discover the ticket UUID (Insecure Direct Object Reference).

Suggested Action:
Add an ownership check:
if (user.role === UserRole.CUSTOMER && ticket.createdById !== user.id) {
  throw new NotFoundError("Ticket not found");
}
Add a unit test in comments.spec.ts asserting that a customer commenting on
another customer's ticket throws NotFoundError.
```

---

## 4. Review Comment Record Template

When conducting the peer review, record each comment using this table:

| Finding ID | File & Line | Category | Severity | Summary of Problem | Suggested Action & Test | Status |
|:---:|:---|:---|:---:|:---|:---|:---:|
| REV-01 | *path:line* | *Category* | *High/Med/Low* | *Concise problem description* | *Actionable fix and regression test* | Pending |
| REV-02 | *path:line* | *Category* | *High/Med/Low* | *Concise problem description* | *Actionable fix and regression test* | Pending |

---

## 5. Review Disposition Definitions

- **Fixed:** The author modified the source code or test suite, and the fix was verified against the test runner.
- **Answered:** No code change was needed; the author provided technical justification and evidence showing the code is correct.
- **Escalated:** The issue requires an architectural decision or clarification from the engineering lead.
- **Open:** The comment is under review and has not yet been addressed.

