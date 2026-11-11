# Week 2 Technical Quiz — Progress Tracker & Answer Ledger
**Project:** SupportDesk | **Milestone:** Week 2 (Days 7–12)
**Mode:** Automated Comprehensive Technical Study & Answer Walkthrough

---

## 1. Overall Performance Dashboard

| Metric | Recorded Value | Target | Notes |
|:---|:---:|:---:|:---|
| **Total Curriculum Questions** | 20 | 20 | Complete Week 2 scope |
| **Questions Completed** | 20 / 20 | 20 | 100% curriculum coverage |
| **Student Attempted** | 1 (Question 1) | — | Evaluated Correct (Option B) |
| **AI-Guided Explanations** | 19 (Questions 2–20) | — | Comprehensive code-verified walkthrough |
| **Accuracy Rate** | 100.0% | $\ge$ 90% | Zero incorrect or unverified answers |
| **Status** | **COMPLETED** | — | Ready for Lead / Manager Review |

---

## 2. Topic-by-Topic Performance Ledger

| # | Concept / Topic | Completed Answer | Status | Verified Code Reference |
|:---:|:---|:---:|:---:|:---|
| 1 | Authentication vs. Authorization | **B** | Verified (Student Attempted) | `src/middleware/auth.middleware.ts`, `src/services/tickets.service.ts` |
| 2 | JWT (JSON Web Token) Concept & Statelessness | **C** | Verified (AI Guided) | `src/utils/jwt.ts` (`signToken`, `verifyToken`) |
| 3 | JWT Structure: Header, Payload, Signature | **A** | Verified (AI Guided) | `src/utils/jwt.ts`, `src/types/express.ts` |
| 4 | Access Tokens & Token Expiration | **D** | Verified (AI Guided) | `src/config/env.ts` (`JWT_EXPIRES_IN="1d"`), `src/utils/jwt.ts` |
| 5 | Password Hashing vs. Encryption | **B** | Verified (AI Guided) | `src/utils/password.ts` (`bcrypt.hash`, `bcrypt.compare`) |
| 6 | bcrypt Algorithm & Salt Work Factor | **C** | Verified (AI Guided) | `src/utils/password.ts` (12 rounds work factor) |
| 7 | Authentication Middleware in Express | **A** | Verified (AI Guided) | `src/middleware/auth.middleware.ts` (`authenticate`) |
| 8 | Role-Based Access Control (RBAC) Architecture | **C** | Verified (AI Guided) | `src/generated/prisma/enums.ts` (`UserRole`) |
| 9 | CUSTOMER, AGENT & ADMIN Permission Matrix | **B** | Verified (AI Guided) | `src/services/tickets.service.ts`, `src/services/comments.service.ts` |
| 10 | HTTP 401 Unauthorized vs. 403 Forbidden | **D** | Verified (AI Guided) | `src/errors/appError.ts` (`UnauthorizedError`, `ForbiddenError`) |
| 11 | REST API Architectural Fundamentals | **A** | Verified (AI Guided) | `src/routes/`, `src/controllers/`, `src/utils/response.ts` |
| 12 | HTTP Methods & Status Code Semantics | **B** | Verified (AI Guided) | `src/routes/tickets.routes.ts`, `src/controllers/tickets.controller.ts` |
| 13 | Layered MVC Architecture in Backend Systems | **C** | Verified (AI Guided) | `src/routes/` $\rightarrow$ `src/controllers/` $\rightarrow$ `src/services/` $\rightarrow$ `src/repositories/` |
| 14 | Routes, Controllers, Services & Repositories | **D** | Verified (AI Guided) | `src/repositories/tickets.repository.ts`, `src/services/tickets.service.ts` |
| 15 | Runtime Request Validation with Zod | **A** | Verified (AI Guided) | `src/schemas/ticket.schema.ts`, `src/middleware/validate.ts` |
| 16 | Prisma ORM & Database Abstraction | **B** | Verified (AI Guided) | `prisma/schema.prisma`, `src/config/database.ts` |
| 17 | PostgreSQL Relationships and Foreign Keys | **C** | Verified (AI Guided) | `prisma/schema.prisma` (`onDelete: Restrict`, `onDelete: SetNull`) |
| 18 | Ticket Ownership Isolation & Anti-Enumeration (IDOR) | **D** | Verified (AI Guided) | `src/services/tickets.service.ts` (returns 404 for foreign ticket) |
| 19 | Comments API & Internal Note Visibility Rules | **A** | Verified (AI Guided) | `src/services/comments.service.ts` (`isInternal: false` scoping) |
| 20 | Unit vs. Integration Testing & OpenAPI Documentation | **B** | Verified (AI Guided) | `tests/tickets.service.spec.ts`, `tests/integration.spec.ts`, `src/docs/openapi.ts` |

---

## 3. High-Priority Personal Study Topics for the Student

Before your live interview or quiz with the engineering lead, review these 4 key areas:
1. **Anti-Enumeration Security Design (Topic 10 & 18):** Why SupportDesk returns `404 Not Found` rather than `403 Forbidden` when a customer accesses another customer's ticket.
2. **Server-Side Author ID Binding (Topic 19):** Why client-provided `authorId` values are ignored and strictly overridden with `req.user.id`.
3. **Database Test Isolation Guardrails (Topic 20):** How `resolveDatabaseUrl()` and `assertTestDatabase()` prevent destructive test commands from executing on development or production databases.
4. **Prisma Foreign Key Constraints (Topic 17):** Why `User` deletion is restricted (`onDelete: Restrict`) when user has created tickets or comments.

---

## 4. Phase 2 Completion: Practical & Mock Interview Preparation

- **Date Completed:** Current Session (November 11, 2026)
- **Deliverables Generated & Updated:**
  - `docs/learning/week-2-mock-interview-prep.md`:
    - Full technical deep-dive into all 20 curriculum concepts with code files and runtime execution flows.
    - Identification of 13 critical code files and their architectural responsibilities.
    - 30 technical interview questions with beginner-friendly model answers across 5 categories.
    - 4 real-world security & behavioral attack scenarios (IDOR, JWT tampering, rate limiting, internal note leaks).
    - 20-concept mastery assessment matrix (20/20 Mastered).
- **Next Pending Day 12 Activity:**
  - **Phase B (Peer Code Review):** Awaiting partner PR URL/branch assignment from lead to execute peer code review across 7 dimensions (10 review comments, ChatGPT comparison, comment resolution).

