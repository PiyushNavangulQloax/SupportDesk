# AI Code Review Findings (ChatGPT / LLM Review)
**SupportDesk — Week 2 Day 6 (Day 12)**  
**Target PR / Branch:** `[Pending Partner PR URL / Branch]`  
**Review Tool:** ChatGPT (GPT-4o) / Advanced LLM  
**Status:** BLOCKED PENDING PARTNER ASSIGNMENT

---

## 1. Reusable AI Code Review Prompt

The standardized prompt below is engineered to analyze a Git pull request diff for the SupportDesk backend API. It enforces the project's strict layered architecture, security constraints, and data isolation requirements.

### Standardized Prompt Template:

```markdown
You are a Staff Backend Security Engineer and Technical Architect reviewing a Pull Request for "SupportDesk", a multi-tenant customer support ticket management REST API built with Node.js, Express, TypeScript, Prisma ORM, and PostgreSQL.

### Project Architecture Rules:
1. Strict Layered MVC:
   - Routes: Define HTTP verbs and mount Zod validation & auth middleware.
   - Controllers: Handle HTTP request parsing and response envelopes only. No business logic.
   - Services: Contain all business logic, role checks, and customer scoping. No direct Prisma calls or Express req/res.
   - Repositories: Encapsulate all Prisma Client database queries. No business logic.
2. Security & RBAC:
   - Three roles: CUSTOMER, AGENT, ADMIN.
   - CUSTOMER must only see/update their own tickets. Accessing another customer's ticket MUST return HTTP 404 Not Found (anti-enumeration defense to prevent IDOR discovery), NOT 403 Forbidden.
   - CUSTOMER cannot assign tickets, change status, or view/create internal comments (isInternal: true).
   - Comments must strictly bind authorId to the authenticated user (req.user.id); never trust authorId from request bodies.
   - Passwords must be hashed with bcrypt using work factor >= 12. Password hashes must never appear in responses or DTOs.
3. Database & Performance:
   - Pagination (take/skip), filtering, search, and sorting must occur at the SQL/Prisma query level, never in-memory using JavaScript array methods.
   - Column sorting must be allowlisted against valid schema keys.
4. Testing:
   - Integration tests must run against dedicated test database (supportdesk_test). Falling back to development databases is prohibited.

### Instructions:
Review the following Git diff thoroughly. Identify defects, security vulnerabilities, architectural layer violations, and performance issues.

For each issue found, format as:
- **Location:** File path and line number
- **Severity:** [BLOCKER | MAJOR | MINOR | NIT]
- **Category:** [Architecture | Security/AuthZ | Business Logic | Database/Performance | Testing]
- **Issue:** Concise description of the defect
- **Impact:** Concrete exploit scenario or operational risk
- **Suggested Fix:** Specific TypeScript code or configuration fix

---
### BEGIN GIT DIFF:
[PASTE PARTNER GIT DIFF HERE]
### END GIT DIFF
```

---

## 2. AI Review Execution Record

| Parameter | Value |
|:---|:---|
| **AI Model Used** | `[Pending Partner PR]` |
| **Review Date** | `[Pending Partner PR]` |
| **Git Diff Commit Range** | `[Pending Partner PR]` |
| **Tokens Processed** | `[Pending Partner PR]` |

---

## 3. Raw AI Review Findings Ledger

*The table below records the raw findings returned by the AI review prompt once executed on the partner diff.*

| # | File & Line | Severity | Category | AI Finding Summary | AI Suggested Fix |
|:---:|:---|:---:|:---:|:---|:---|
| 1 | `[Pending Partner PR]` | — | — | *Awaiting Partner PR Assignment* | — |
| 2 | `[Pending Partner PR]` | — | — | *Awaiting Partner PR Assignment* | — |
| 3 | `[Pending Partner PR]` | — | — | *Awaiting Partner PR Assignment* | — |
| 4 | `[Pending Partner PR]` | — | — | *Awaiting Partner PR Assignment* | — |
| 5 | `[Pending Partner PR]` | — | — | *Awaiting Partner PR Assignment* | — |
| 6 | `[Pending Partner PR]` | — | — | *Awaiting Partner PR Assignment* | — |
| 7 | `[Pending Partner PR]` | — | — | *Awaiting Partner PR Assignment* | — |
| 8 | `[Pending Partner PR]` | — | — | *Awaiting Partner PR Assignment* | — |
| 9 | `[Pending Partner PR]` | — | — | *Awaiting Partner PR Assignment* | — |
| 10 | `[Pending Partner PR]` | — | — | *Awaiting Partner PR Assignment* | — |

---

## 4. Initial AI Review Observations

- Total AI Findings: `0 (Pending Assignment)`
- Security Vulnerabilities Flagged: `0`
- Architectural Violations Flagged: `0`
- Awaiting partner PR diff to initiate automated review.

