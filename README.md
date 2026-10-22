# SupportDesk

> **Product:** SupportDesk — Customer Support Ticketing System  
> **Document:** Project README, Product Requirements, Architecture & Development Guide  
> **Version:** 0.2 (proposed baseline)  
> **Status:** Draft — confirm with project owner/mentor before treating this as the approved specification  
> **Last updated:** 22 October 2026

> [!IMPORTANT]
> This README proposes a complete starting architecture for SupportDesk. The actual repository implementation, official PRD, required framework versions, hosting provider, and team conventions have not been verified here. Treat the technology choices and file tree as **proposals**, not as existing files or confirmed company decisions. Update this document once the mentor/product owner confirms the stack and requirements.

---

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Problem Statement](#2-problem-statement)
- [3. Goals](#3-goals)
- [4. Proposed MVP Scope](#4-proposed-mvp-scope)
- [5. User Roles](#5-user-roles)
- [6. Proposed Technology Stack](#6-proposed-technology-stack)
- [7. High-Level Architecture](#7-high-level-architecture)
- [8. Proposed Repository Structure](#8-proposed-repository-structure)
- [9. What Each Layer Does](#9-what-each-layer-does)
- [10. File-to-File Connection Map](#10-file-to-file-connection-map)
- [11. Main Request Flow](#11-main-request-flow)
- [12. Proposed Data Model](#12-proposed-data-model)
- [13. API Design](#13-api-design)
- [14. User Stories and Acceptance Criteria](#14-user-stories-and-acceptance-criteria)
- [15. Ticket Lifecycle and Business Rules](#15-ticket-lifecycle-and-business-rules)
- [16. Security and Privacy](#16-security-and-privacy)
- [17. Validation, Errors and Logging](#17-validation-errors-and-logging)
- [18. Testing Strategy](#18-testing-strategy)
- [19. Local Development Setup](#19-local-development-setup)
- [20. Environment Variables](#20-environment-variables)
- [21. Git and GitHub Workflow](#21-git-and-github-workflow)
- [22. Branching and Pull Requests](#22-branching-and-pull-requests)
- [23. Definition of Ready and Definition of Done](#23-definition-of-ready-and-definition-of-done)
- [24. MoSCoW Prioritisation](#24-moscow-prioritisation)
- [25. Suggested Implementation Plan](#25-suggested-implementation-plan)
- [26. Deployment and Release](#26-deployment-and-release)
- [27. Risks and Open Questions](#27-risks-and-open-questions)
- [28. Glossary](#28-glossary)
- [29. Change History](#29-change-history)

---

## 1. Project Overview

SupportDesk is proposed as a web-based customer-support ticketing system. It provides a central place for eligible users to submit support requests and for support staff to review, assign, communicate about, and resolve those requests.

The system should make ticket ownership and status clear, preserve relevant conversation/activity history, prevent unauthorised access, and provide a foundation for reporting support performance.

### One-sentence summary

**SupportDesk helps customers raise support requests and helps support teams track each request from creation through resolution.**

## 2. Problem Statement

Support requests can become difficult to manage when information is scattered across messages, spreadsheets, or disconnected tools. Teams may lose context, duplicate work, miss follow-ups, or be unable to see who owns a request.

SupportDesk aims to centralise ticket information, clarify responsibility, support consistent workflows, and make ticket progress visible to authorised users.

## 3. Goals

- Allow eligible users to create support tickets.
- Let users view only the tickets they are permitted to access.
- Provide a clear ticket detail page and current status.
- Allow authorised staff to assign tickets and update permitted statuses.
- Support replies or conversation history, subject to agreed visibility rules.
- Provide search/filtering to help staff find tickets.
- Record important events where activity history is in scope.
- Protect private customer and ticket information.
- Keep the codebase testable, maintainable, and understandable for contributors.

### Non-goals for the first release unless explicitly approved

- AI-based ticket resolution or automatic reply generation.
- Native iOS/Android apps.
- Live chat, voice, or social-media support.
- Complex SLA escalation engines.
- Advanced analytics and custom report builders.
- CRM, billing, sales, or inventory functionality.

## 4. Proposed MVP Scope

| Capability | MVP proposal | Notes to confirm |
|---|---|---|
| Ticket creation | Yes | Required fields and guest/authenticated flow need approval. |
| Ticket list | Yes | Customer and agent views may differ. |
| Ticket detail | Yes | Define which fields each role may see. |
| Assignment | Yes for staff workflow | Confirm which roles may assign/reassign. |
| Status updates | Yes | Approve status list and allowed transitions. |
| Replies | Yes, if required | Confirm whether internal notes are supported. |
| Search/filter | Basic, if time permits | Agree supported search fields and filters. |
| Activity history | Basic, if required | Agree which events are stored and shown. |
| Notifications | Not assumed | Confirm event types and delivery channel. |
| Attachments | Not assumed | If required, define limits, storage, and malware checks. |
| Dashboard/reporting | Not assumed | Confirm metrics and permissions. |

## 5. User Roles

| Role | Primary needs | Example permissions (must be confirmed) |
|---|---|---|
| Customer / requester | Submit a request, track its status, communicate about it. | Create tickets; view own permitted tickets; reply if enabled. |
| Support agent | Review assigned/available work, communicate, update tickets. | View permitted tickets; reply; update allowed fields/statuses. |
| Support lead | Manage workload and ownership. | View team queue; assign/reassign; manage priority where allowed. |
| Administrator | Configure users and access. | Manage roles and system settings. |
| Product/operations stakeholder | Validate workflows and review metrics. | Access approved reports and UAT evidence. |

Apply **least privilege**: each role receives only the access it needs.

---

## 6. Proposed Technology Stack

The following is a practical proposal for a web application. **It is not confirmed to be the team's mandated stack. Ask your mentor before installing dependencies or generating the application.**

| Layer | Proposed choice | Why |
|---|---|---|
| Frontend language | TypeScript | Catches many type errors before runtime and improves maintainability. |
| Frontend framework | React + Vite | Component-based UI with a straightforward development server/build process. |
| Styling | CSS Modules or a team-approved CSS system | Keeps component styles maintainable; choose one approach with the team. |
| Routing | React Router | Handles page navigation such as login, ticket list, and ticket detail. |
| API client | Native `fetch` wrapped in a shared client module | Centralises API base URL, headers, and error handling. |
| Backend language | TypeScript on Node.js | Allows frontend/backend teams to share types and language knowledge. |
| Backend framework | Express | Lightweight HTTP routing and middleware. |
| Database | PostgreSQL | Relational data model for users, tickets, assignments, and messages. |
| Database access | A team-approved ORM/query layer (Prisma is one option) | Schema management, migrations, and typed database access. |
| Validation | Zod or another team-approved schema validator | Validates request bodies and environment variables. |
| Authentication | Team-approved session/JWT/identity provider | Must be chosen based on security and deployment requirements. |
| API documentation | OpenAPI/Swagger, if required | Makes endpoint contracts discoverable and testable. |
| Unit/integration tests | Vitest or the team's standard test runner | Tests business logic and API behaviour. |
| UI tests | React Testing Library | Tests components through user-visible behaviour. |
| End-to-end tests | Playwright, if approved | Tests complete browser workflows. |
| Version control | Git + GitHub | Tracks changes and reviews. |
| API exploration | Postman or an equivalent client | Manually tests API requests. |
| Local services | Docker Compose, if the team uses Docker | Can run local database and dependent services consistently. |
| CI | GitHub Actions or team CI | Runs lint, type-check, tests, and build on changes. |

### Important stack rule

Do not mix several tools that solve the same problem without a reason. For example, choose one main backend framework, one database access strategy, one validation approach, and the test tools approved by the team.

---

## 7. High-Level Architecture

```mermaid
flowchart TD
    U[Customer / Support Agent / Lead] --> UI[React + TypeScript Web UI]
    UI --> ROUTER[Frontend Router and Pages]
    ROUTER --> CLIENT[Shared API Client]
    CLIENT --> API[Express + TypeScript API]
    API --> AUTH[Authentication and Authorization Middleware]
    AUTH --> VALID[Request Validation]
    VALID --> CTRL[Route Controllers]
    CTRL --> SERVICE[Business Services]
    SERVICE --> REPO[Data Access Layer / ORM]
    REPO --> DB[(PostgreSQL Database)]
    SERVICE --> LOG[Structured Logs and Audit Events]
```

### Architecture responsibilities

- **Web UI:** Displays pages and collects user input.
- **Frontend router:** Chooses the page/component for the current URL.
- **API client:** Sends HTTP requests and handles common response/error behaviour.
- **API server:** Exposes endpoints and applies middleware.
- **Authentication/authorization:** Identifies the caller and checks permissions.
- **Validation:** Rejects malformed or incomplete input before business logic runs.
- **Controllers:** Translate HTTP requests into service calls and HTTP responses.
- **Services:** Implement business rules such as assignment and status transitions.
- **Data access layer:** Reads/writes database records.
- **Database:** Persists users, tickets, replies, and activity events.
- **Logs/audit events:** Help diagnose errors and understand important actions without logging secrets.

---

## 8. Proposed Repository Structure

> This is a **recommended target structure**, not a claim that these folders already exist in the repository. Start by inspecting the existing repository and follow the mentor's conventions before creating or moving files.

```text
SupportDesk/
├── README.md
├── .gitignore
├── .editorconfig
├── .nvmrc                         # Optional: Node version agreed by team
├── package.json                   # Optional root scripts for a monorepo
├── package-lock.json              # If npm workspaces/root package is used
├── .github/
│   ├── pull_request_template.md
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── user_story.md
│   └── workflows/
│       └── ci.yml                 # Lint, type-check, tests, build
├── docs/
│   ├── PRD.md                     # Approved product requirements
│   ├── ARCHITECTURE.md            # System design and component boundaries
│   ├── API.md                     # API contract and examples
│   ├── DATA_MODEL.md              # Tables, relationships, and constraints
│   ├── TEST_PLAN.md               # Test coverage and UAT scenarios
│   └── DECISIONS.md               # Architecture/product decisions
├── apps/
│   ├── web/                       # Frontend application
│   │   ├── package.json
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── public/
│   │   └── src/
│   │       ├── main.tsx           # Browser entry point
│   │       ├── App.tsx             # Root application and route setup
│   │       ├── routes/
│   │       │   ├── AppRoutes.tsx
│   │       │   └── ProtectedRoute.tsx
│   │       ├── pages/
│   │       │   ├── LoginPage.tsx
│   │       │   ├── TicketListPage.tsx
│   │       │   ├── CreateTicketPage.tsx
│   │       │   ├── TicketDetailPage.tsx
│   │       │   └── NotFoundPage.tsx
│   │       ├── components/
│   │       │   ├── layout/
│   │       │   │   ├── AppLayout.tsx
│   │       │   │   ├── Header.tsx
│   │       │   │   └── Sidebar.tsx
│   │       │   ├── tickets/
│   │       │   │   ├── TicketForm.tsx
│   │       │   │   ├── TicketList.tsx
│   │       │   │   ├── TicketCard.tsx
│   │       │   │   ├── TicketStatusBadge.tsx
│   │       │   │   ├── TicketFilters.tsx
│   │       │   │   ├── AssignmentControl.tsx
│   │       │   │   ├── TicketConversation.tsx
│   │       │   │   └── ActivityTimeline.tsx
│   │       │   └── common/
│   │       │       ├── Button.tsx
│   │       │       ├── Input.tsx
│   │       │       ├── Select.tsx
│   │       │       ├── Spinner.tsx
│   │       │       ├── EmptyState.tsx
│   │       │       └── ErrorMessage.tsx
│   │       ├── features/
│   │       │   ├── auth/
│   │       │   └── tickets/
│   │       ├── services/
│   │       │   ├── apiClient.ts    # Shared HTTP client
│   │       │   ├── authApi.ts
│   │       │   └── ticketsApi.ts
│   │       ├── hooks/
│   │       │   ├── useAuth.ts
│   │       │   └── useTickets.ts
│   │       ├── types/
│   │       │   ├── auth.ts
│   │       │   └── ticket.ts
│   │       ├── utils/
│   │       │   ├── date.ts
│   │       │   └── formatters.ts
│   │       └── styles/
│   │           └── global.css
│   └── api/                       # Backend application
│       ├── package.json
│       ├── tsconfig.json
│       ├── .env.example
│       └── src/
│           ├── server.ts           # Starts listening on configured port
│           ├── app.ts              # Creates Express app and middleware
│           ├── config/
│           │   ├── env.ts
│           │   └── database.ts
│           ├── routes/
│           │   ├── index.ts
│           │   ├── health.routes.ts
│           │   ├── auth.routes.ts
│           │   └── tickets.routes.ts
│           ├── controllers/
│           │   ├── auth.controller.ts
│           │   └── tickets.controller.ts
│           ├── services/
│           │   ├── auth.service.ts
│           │   ├── tickets.service.ts
│           │   ├── assignment.service.ts
│           │   └── activity.service.ts
│           ├── repositories/
│           │   ├── users.repository.ts
│           │   ├── tickets.repository.ts
│           │   └── messages.repository.ts
│           ├── middleware/
│           │   ├── authenticate.ts
│           │   ├── authorize.ts
│           │   ├── validateRequest.ts
│           │   ├── notFound.ts
│           │   └── errorHandler.ts
│           ├── schemas/
│           │   ├── auth.schema.ts
│           │   └── ticket.schema.ts
│           ├── domain/
│           │   ├── ticketStatus.ts
│           │   ├── permissions.ts
│           │   └── errors.ts
│           ├── db/
│           │   ├── schema.prisma    # Only if Prisma is selected
│           │   ├── migrations/
│           │   └── seed.ts
│           ├── utils/
│           │   ├── logger.ts
│           │   └── asyncHandler.ts
│           └── tests/
│               ├── unit/
│               ├── integration/
│               └── fixtures/
├── packages/
│   └── shared/                    # Optional shared types/schemas
│       ├── package.json
│       └── src/
│           ├── ticket.ts
│           └── api.ts
└── tests/
    └── e2e/                       # Optional end-to-end tests
```

### Structure notes

- If the project is small, a simpler `frontend/` and `backend/` layout may be better than a monorepo.
- `packages/shared/` is optional. Do not introduce it unless the frontend and backend genuinely need shared types or schemas.
- `schema.prisma` and `db/migrations/` are relevant only if Prisma is selected. If the team chooses another database tool, use its conventions.
- Do not create empty folders just to match this tree. Add files when a real requirement needs them.
- Do not replace existing code or restructure a working repository without reviewing it and agreeing with the mentor.

---

## 9. What Each Layer Does

### Frontend

| File / folder | Responsibility | Connects to |
|---|---|---|
| `main.tsx` | Mounts the React app into the HTML page. | `index.html`, `App.tsx` |
| `App.tsx` | Root component and top-level providers/routes. | `AppRoutes.tsx`, shared layout |
| `routes/AppRoutes.tsx` | Maps URL paths to page components. | `pages/*` |
| `routes/ProtectedRoute.tsx` | Client-side navigation guard for signed-in users. | Auth state/hooks; server still enforces access. |
| `pages/TicketListPage.tsx` | Page for viewing/searching tickets. | `TicketList`, `TicketFilters`, `ticketsApi.ts` |
| `pages/CreateTicketPage.tsx` | Page for submitting a ticket. | `TicketForm`, `ticketsApi.ts` |
| `pages/TicketDetailPage.tsx` | Page for ticket detail and permitted actions. | `ticketsApi.ts`, conversation/status/activity components |
| `components/tickets/TicketForm.tsx` | Form UI and client-side input feedback. | `ticketsApi.ts` via page/hook |
| `components/tickets/TicketList.tsx` | Renders a list of ticket records. | Receives typed ticket data from page/hook |
| `components/tickets/TicketStatusBadge.tsx` | Displays status consistently. | `types/ticket.ts` |
| `components/tickets/TicketConversation.tsx` | Shows messages and reply form if allowed. | Ticket API and ticket detail page |
| `services/apiClient.ts` | Shared HTTP request logic and error handling. | Backend base URL |
| `services/ticketsApi.ts` | Functions such as list/create/get/update/assign tickets. | `apiClient.ts`, backend ticket endpoints |
| `types/ticket.ts` | Frontend TypeScript shapes for ticket data. | Pages, components, API service |
| `hooks/useTickets.ts` | Reusable state/loading/error behaviour for ticket data. | `ticketsApi.ts` |

### Backend

| File / folder | Responsibility | Connects to |
|---|---|---|
| `server.ts` | Starts the HTTP server. | `app.ts`, environment config |
| `app.ts` | Creates Express app, installs middleware, mounts routes. | `routes/index.ts`, middleware |
| `routes/tickets.routes.ts` | Declares HTTP paths and middleware for ticket operations. | Ticket controller |
| `controllers/tickets.controller.ts` | Reads request parameters/body and returns HTTP responses. | Validation middleware, `tickets.service.ts` |
| `services/tickets.service.ts` | Implements ticket business rules. | Repositories, activity service |
| `services/assignment.service.ts` | Implements assignment/reassignment rules. | Ticket/user repositories, permission rules |
| `services/activity.service.ts` | Records permitted activity events. | Ticket actions, activity repository/table |
| `repositories/tickets.repository.ts` | Database reads/writes for tickets. | Database client/ORM |
| `middleware/authenticate.ts` | Verifies the chosen authentication mechanism. | Auth provider/session/token |
| `middleware/authorize.ts` | Checks role/resource permissions. | Authenticated user context, permission rules |
| `middleware/validateRequest.ts` | Rejects invalid request payloads. | Request schemas |
| `middleware/errorHandler.ts` | Converts known/unexpected errors to safe HTTP responses. | Express error pipeline, logger |
| `schemas/ticket.schema.ts` | Defines allowed request fields and constraints. | Validation middleware, ticket routes |
| `domain/ticketStatus.ts` | Defines allowed status values/transitions. | Ticket service, tests |
| `config/database.ts` | Creates database connection/client. | Database provider |
| `db/schema.prisma` | Database schema if Prisma is used. | ORM-generated client, migrations |
| `utils/logger.ts` | Structured logging without secrets/private content. | Server, middleware, services |

---

## 10. File-to-File Connection Map

### Example: Create a ticket

```mermaid
flowchart TD
    A[CreateTicketPage.tsx] --> B[TicketForm.tsx]
    B --> C[ticketsApi.ts]
    C --> D[apiClient.ts]
    D --> E[POST /api/v1/tickets]
    E --> F[tickets.routes.ts]
    F --> G[validateRequest middleware]
    G --> H[authenticate / authorize middleware]
    H --> I[tickets.controller.ts]
    I --> J[tickets.service.ts]
    J --> K[tickets.repository.ts]
    K --> L[(PostgreSQL)]
    J --> M[activity.service.ts]
    I --> N[HTTP response with ticket data]
    N --> C
    C --> A
```

### Example: View ticket details

1. User opens `/tickets/:ticketId`.
2. `AppRoutes.tsx` selects `TicketDetailPage.tsx`.
3. The page calls a hook or `ticketsApi.ts`.
4. `ticketsApi.ts` uses `apiClient.ts` to send `GET /api/v1/tickets/:ticketId`.
5. Backend route middleware authenticates the request, validates the identifier, and checks access.
6. The controller calls the ticket service.
7. The service loads the ticket and permitted related data from repositories.
8. The API returns only fields the user is allowed to see.
9. The page renders ticket details, status, and available conversation/activity components.

### Example: Update ticket status

1. Agent selects a new status in the ticket detail UI.
2. UI sends `PATCH /api/v1/tickets/:ticketId/status`.
3. Backend verifies identity and permission.
4. Ticket service validates the status transition.
5. Repository saves the new status in the database.
6. Activity service records the status change if activity tracking is enabled.
7. API returns the updated ticket.
8. UI updates its state and displays success or a clear error.

### Key rule

**The frontend is not the security boundary.** Hiding a button in React is not enough; the backend must independently verify permissions for every protected operation.

---

## 11. Main Request Flow

A typical API request should follow this order:

1. Browser action triggers a page, hook, or service function.
2. Shared API client sends an HTTP request.
3. Express middleware applies request IDs/logging and parses the body.
4. Authentication identifies the caller.
5. Authorization checks the caller's permission for the requested resource/action.
6. Validation checks path parameters, query parameters, and body.
7. Controller delegates to a service.
8. Service applies business rules and calls repositories.
9. Database performs the operation.
10. Service returns a result or raises a known domain error.
11. Error/response middleware sends a safe response.
12. Frontend handles success, loading, empty, and error states.

Exact middleware order must be chosen carefully. Authentication may need to run before resource-level authorization; validation should happen before business logic; unexpected errors must not expose stack traces to users.

---

## 12. Proposed Data Model

This is a conceptual starting point. Confirm the fields and relationships before implementing migrations.

### `users`

| Field | Purpose |
|---|---|
| `id` | Unique user identifier |
| `name` | Display name |
| `email` | Login/contact identifier, subject to auth design |
| `role` | Role or role reference |
| `created_at` | Creation timestamp |
| `updated_at` | Last update timestamp |

### `tickets`

| Field | Purpose |
|---|---|
| `id` | Unique ticket identifier |
| `ticket_number` | Human-friendly ticket reference if required |
| `subject` | Short issue title |
| `description` | Issue details |
| `status` | Current lifecycle status |
| `priority` | Priority value |
| `requester_id` | User who submitted the ticket |
| `assignee_id` | Assigned agent; nullable if unassigned |
| `created_at` | Creation timestamp |
| `updated_at` | Last update timestamp |
| `resolved_at` | Resolution timestamp, nullable |

### `ticket_messages`

| Field | Purpose |
|---|---|
| `id` | Unique message identifier |
| `ticket_id` | Parent ticket |
| `author_id` | User who wrote the message |
| `body` | Message text |
| `visibility` | Customer-visible/internal, only if internal notes are approved |
| `created_at` | Message timestamp |

### `ticket_activity` (optional)

| Field | Purpose |
|---|---|
| `id` | Unique event identifier |
| `ticket_id` | Parent ticket |
| `actor_id` | User who performed the action, where known |
| `event_type` | Assignment/status/reply/etc. |
| `metadata` | Limited structured event details; avoid sensitive data |
| `created_at` | Event timestamp |

### Relationships

```mermaid
erDiagram
    USERS ||--o{ TICKETS : requests
    USERS o|--o{ TICKETS : assigned_to
    TICKETS ||--o{ TICKET_MESSAGES : contains
    USERS ||--o{ TICKET_MESSAGES : writes
    TICKETS ||--o{ TICKET_ACTIVITY : records
```

### Data integrity and security

- Use foreign keys for relationships.
- Define which fields may be null.
- Add indexes for common list/filter queries after considering query patterns.
- Enforce authorisation in backend queries/services.
- Never rely on a ticket ID being hard to guess as an access control method.
- Define deletion, retention, and export rules with the product owner.
- Do not put passwords, access tokens, or unnecessary sensitive content in ticket logs.

---

## 13. API Design

> The routes below are proposed examples, not confirmed existing endpoints. Confirm naming, versioning, authentication, and response formats with the team.

Base path proposal: `/api/v1`

| Method | Endpoint | Purpose | Example permission |
|---|---|---|---|
| `GET` | `/health` | Health check | Public or environment-restricted |
| `GET` | `/api/v1/tickets` | List tickets visible to the caller | Authenticated; visibility filtered |
| `POST` | `/api/v1/tickets` | Create a ticket | Eligible requester |
| `GET` | `/api/v1/tickets/:ticketId` | Get ticket detail | Ticket-level access required |
| `PATCH` | `/api/v1/tickets/:ticketId` | Update allowed ticket fields | Permission required |
| `PATCH` | `/api/v1/tickets/:ticketId/status` | Change status | Permission and valid transition required |
| `PATCH` | `/api/v1/tickets/:ticketId/assignee` | Assign/reassign ticket | Lead or authorised role |
| `GET` | `/api/v1/tickets/:ticketId/messages` | List permitted messages | Ticket-level access required |
| `POST` | `/api/v1/tickets/:ticketId/messages` | Add a reply | Reply permission required |
| `GET` | `/api/v1/tickets/:ticketId/activity` | View activity history | Ticket-level access required |

### API conventions

- Use consistent JSON response shapes.
- Return appropriate HTTP status codes (`200`, `201`, `400`, `401`, `403` or `404` according to the API policy, `409`, `422`, `500`).
- Validate all client-supplied values on the server.
- Avoid revealing whether a private ticket exists if the security policy requires indistinguishable `403`/`404` responses.
- Add pagination for lists.
- Use consistent filtering and sorting parameters.
- Document error codes and examples.
- Never return internal stack traces or secret configuration.

Example create-ticket request (illustrative):

```json
{
  "subject": "Unable to sign in",
  "description": "I receive an error when I try to sign in."
}
```

The actual required fields depend on the approved product rules.

---

## 14. User Stories and Acceptance Criteria

> These are provisional examples. Check them against the approved PRD before considering them final backlog commitments.

### US-01 — Create a Support Ticket

**Story:** As a customer, I want to create a support ticket so that I can report an issue and receive assistance.

**Acceptance criteria:**

- **Given** the customer has entered all required fields with valid information, **when** they submit the form, **then** the system creates a ticket and displays confirmation.
- **Given** a required field is missing or invalid, **when** the customer submits the form, **then** validation errors are displayed and no ticket is created.

**Proposed MoSCoW:** Must Have

### US-02 — View My Tickets

**Story:** As a customer, I want to view my submitted tickets so that I can track their progress.

**Acceptance criteria:**

- **Given** the customer is authenticated, **when** they open their ticket list, **then** only tickets they are authorised to access are shown.
- **Given** another customer's ticket is not accessible to the current customer, **when** they view the list, **then** its private details are not disclosed.

**Proposed MoSCoW:** Must Have

### US-03 — View Ticket Details

**Story:** As an authorised user, I want to view ticket details so that I can understand the issue and its current status.

**Acceptance criteria:**

- **Given** the user is authorised to view a ticket, **when** they open it, **then** the permitted details and current status are displayed.
- **Given** the user is not authorised, **when** they request the ticket, **then** access is denied without exposing private details.

**Proposed MoSCoW:** Must Have

### US-04 — Assign a Ticket to a Support Agent

**Story:** As a support lead, I want to assign a ticket to a support agent so that responsibility for resolving the issue is clear.

**Acceptance criteria:**

- **Given** the lead has assignment permission and the selected agent is eligible, **when** the assignment is saved, **then** the ticket displays the selected assignee.
- **Given** the user does not have assignment permission, **when** they attempt to assign a ticket, **then** the system rejects the action.

**Proposed MoSCoW:** Must Have

### US-05 — Update Ticket Status

**Story:** As a support agent, I want to update a ticket's status so that the team can track its progress.

**Acceptance criteria:**

- **Given** the agent is authorised and the transition is permitted, **when** they update the status, **then** the new status is saved and displayed.
- **Given** the requested transition is not permitted, **when** the agent attempts the change, **then** the system rejects it and preserves the current status.

**Proposed MoSCoW:** Must Have

### US-06 — Reply to a Support Ticket

**Story:** As an authorised participant, I want to reply to a support ticket so that I can communicate about the reported issue.

**Acceptance criteria:**

- **Given** the participant is authorised and enters a valid message, **when** they submit the reply, **then** the message is saved and displayed to the intended audience.
- **Given** the message is empty or whitespace only, **when** it is submitted, **then** validation is displayed and no empty reply is saved.

**Proposed MoSCoW:** Must Have

### US-07 — Search and Filter Tickets

**Story:** As a support agent, I want to search and filter tickets so that I can quickly find relevant requests.

**Acceptance criteria:**

- **Given** the agent can access the ticket list, **when** they search using a supported term, **then** only accessible matching tickets are returned.
- **Given** the agent applies a supported status filter, **when** results are displayed, **then** each result matches that status.

**Proposed MoSCoW:** Should Have

### US-08 — View Ticket Activity History

**Story:** As an authorised support agent, I want to view ticket activity history so that I can understand important changes over time.

**Acceptance criteria:**

- **Given** the agent is authorised to view the ticket, **when** they open its activity history, **then** recorded events are shown in the agreed order.
- **Given** the agent is not authorised to access the ticket, **when** they request its activity history, **then** access is denied.

**Proposed MoSCoW:** Could Have

---

## 15. Ticket Lifecycle and Business Rules

Proposed lifecycle:

`New → Open / In Progress → Pending → Resolved → Closed`

This is only an example. The product owner must confirm the real statuses and allowed transitions.

Questions to resolve:

- Are `Open` and `In Progress` separate statuses?
- Can customers create tickets without signing in?
- Can a customer reopen a resolved/closed ticket?
- Does `Pending` require a reason?
- Who can set or change priority?
- Are replies always public, or are internal notes supported?
- Can tickets be deleted, or should they be archived?
- How are unassigned tickets handled?
- Are notifications required on creation, assignment, reply, or status change?
- Are attachments allowed and, if so, what restrictions apply?

Do not hard-code unapproved rules into the UI or backend.

---

## 16. Security and Privacy

Security requirements apply to every layer.

- Authenticate protected requests using the method approved by the team.
- Check permissions on the server for every protected read and write.
- Enforce ticket-level access, not just broad role checks.
- Validate and normalise inputs server-side.
- Use parameterised database operations/ORM-safe query methods.
- Store secrets only in environment configuration or an approved secret manager.
- Never commit `.env` files, API keys, passwords, tokens, or production data.
- Keep `.env.example` free of real secrets.
- Use secure cookies/token storage appropriate to the selected authentication design.
- Configure CORS narrowly for known frontend origins.
- Apply rate limiting where appropriate, particularly to authentication and public endpoints.
- Avoid leaking private ticket details in logs or error messages.
- Define data retention and deletion rules.
- If file uploads are introduced, validate size/type and use approved storage and malware scanning.
- Test both permitted and forbidden access paths.

---

## 17. Validation, Errors and Logging

### Validation

- Validate required fields and formats in the frontend for user feedback.
- Repeat validation in the backend; client-side validation is not a security control.
- Reject unexpected fields when the API contract requires a strict schema.
- Use clear messages that tell the user how to correct the problem.

### Error handling

The UI should support:

- Loading state.
- Empty state.
- Validation errors.
- Permission-denied state.
- Not-found state.
- Network/server failure state.
- Success confirmation.
- Retry where safe.

The backend should:

- Use a central error handler.
- Return consistent safe error responses.
- Log diagnostic context with a request ID.
- Avoid exposing stack traces in production responses.
- Distinguish expected business errors from unexpected server failures.

### Logging

Log operational events such as request failures and service errors. Do not log passwords, tokens, session cookies, or unnecessary sensitive ticket content.

---

## 18. Testing Strategy

| Test level | Purpose | Example |
|---|---|---|
| Unit | Test an isolated function/business rule. | Reject an invalid ticket status transition. |
| Integration | Test multiple backend layers together. | Creating a ticket persists the expected record. |
| API | Validate endpoint contract, status codes, and permissions. | Customer cannot retrieve another customer's ticket. |
| Component | Test frontend behaviour. | Required fields display validation messages. |
| End-to-end | Test a complete user journey in a browser. | Create ticket → open ticket → view confirmation. |
| Regression | Ensure existing features continue working. | Ticket list still works after status changes. |
| Security/authorisation | Verify allowed and forbidden actions. | Agent without assignment permission cannot reassign a ticket. |
| UAT | Confirm workflows satisfy business needs. | Stakeholder checks the agreed ticket creation and response journey. |

### Minimum acceptance checks for a ticket story

- Happy path works.
- Invalid input is handled.
- Loading and failure states are handled.
- Permission boundaries are tested.
- Data persists correctly.
- Acceptance criteria are checked manually or automatically.
- No unrelated functionality is broken.

---

## 19. Local Development Setup

> The commands below assume a Node.js/TypeScript monorepo using npm. They will only work after the matching `package.json` files and scripts have been created. Follow the actual repository instructions if they differ.

### Prerequisites

- Git.
- Node.js version approved by the team.
- npm (usually installed with Node.js).
- VS Code or the team's approved editor.
- Access to the repository.
- PostgreSQL locally or through an approved development environment if PostgreSQL is selected.
- Docker Desktop only if the team uses Docker for local services.
- Postman or another API client for API testing.

### Clone the repository

```bash
git clone <approved-repository-url>
cd SupportDesk
```

Replace the placeholder with the actual repository URL. Do not paste credentials or tokens into the URL.

### Install dependencies

If the repository uses npm workspaces at the root:

```bash
npm install
```

If frontend and backend are separate independent projects, install dependencies in each app directory instead:

```bash
cd apps/web
npm install

cd ../api
npm install
```

Use one installation approach based on the actual repository layout; do not run both blindly.

### Run the applications

Possible root scripts (only if configured):

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Check `package.json` for the real script names before running these commands.

### Suggested local URLs

These are examples only; actual ports come from configuration.

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health check: `http://localhost:3000/health`

---

## 20. Environment Variables

Use `.env.example` to document required variable names without secrets. Each developer should create their own local `.env` file if the project uses one; `.env` must be ignored by Git.

Example backend `.env.example` (placeholders only):

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/supportdesk
FRONTEND_ORIGIN=http://localhost:5173
# Add authentication/provider variables only after the team selects an approach.
```

Example frontend `.env.example` for Vite:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Rules:

- Never commit real credentials or production secrets.
- Never use real customer data in local development without explicit approval.
- Validate required environment variables on startup.
- Document where each variable is used and how to obtain its value securely.
- Do not invent authentication keys or copy secrets into this README.

---

## 21. Git and GitHub Workflow

### Issues

Each user story or bug should normally be a separate GitHub Issue. Include:

- Clear title.
- User story (`As a..., I want..., so that...`).
- Description/context.
- Testable acceptance criteria.
- Priority agreed by the team.
- Labels/assignee/milestone only where the team's workflow requires them.

### Project board

Use GitHub Projects to track workflow status, for example:

`Backlog → To Do → In Progress → In Review → Done`

Do not treat the status written inside an issue description as the source of truth if the project board has a Status field. Track the current status in the board.

### Branching

Create a branch for a task when the team workflow expects it. Example naming:

```text
feature/issue-2-create-ticket
feature/issue-3-view-my-tickets
fix/issue-12-ticket-validation
docs/update-supportdesk-readme
```

Follow the team's agreed base branch and naming convention. Do not assume `main`, `develop`, or `beta` without checking the repository instructions.

### Commits

Use meaningful commit messages, for example:

```text
feat: add ticket creation form
test: cover ticket input validation
docs: update SupportDesk setup instructions
fix: reject invalid ticket status transition
```

### Pull requests

- Link the issue using the repository's supported issue-closing syntax when appropriate (for example, `Closes #2`).
- Describe what changed and why.
- List tests performed.
- Include screenshots for meaningful UI changes.
- Request review from the required reviewer.
- Address feedback and wait for required checks/approval before merging.
- Do not commit `.env`, generated secrets, or unapproved real data.

---

## 22. Branching and Pull Requests

Suggested sequence for an issue:

1. Read the issue and acceptance criteria.
2. Confirm unclear requirements before coding.
3. Create a task branch from the team's approved base branch.
4. Implement the smallest complete change.
5. Add/update tests.
6. Run lint, type-check, tests, and build as configured.
7. Review the diff and remove debugging code/secrets.
8. Open a pull request and link the issue.
9. Request review and resolve comments.
10. Merge only after required approval and CI checks.

If a merge conflict occurs, inspect both versions and preserve the intended behaviour. Do not blindly accept one side of a conflict.

---

## 23. Definition of Ready and Definition of Done

### Definition of Ready

A story is ready to start when:

- [ ] The user outcome and business value are clear.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and permissions are identified.
- [ ] Required designs/API decisions are available or agreed.
- [ ] Priority is agreed by the product owner/mentor.
- [ ] The team understands the scope and can estimate it if estimation is used.

### Definition of Done

A story is done when:

- [ ] All acceptance criteria pass.
- [ ] Code follows team conventions.
- [ ] Relevant automated tests are added/updated and pass.
- [ ] Lint/type-check/build pass where configured.
- [ ] Access control and error cases are considered.
- [ ] Documentation is updated if behaviour or setup changed.
- [ ] A reviewer has approved the pull request where required.
- [ ] Changes are merged using the approved workflow.
- [ ] The issue/project status is updated accurately.

---

## 24. MoSCoW Prioritisation

| Priority | Meaning | Proposed examples |
|---|---|---|
| **Must Have** | Essential to the agreed minimum viable release. | Create tickets, access control, view ticket details, basic assignment/status and validation. |
| **Should Have** | Important but a viable release may be possible without it. | Search/filter and useful activity history, depending on scope. |
| **Could Have** | Desirable enhancement if time permits. | Advanced dashboards, richer analytics, configurable workflows. |
| **Won't Have this time** | Explicitly excluded from the current release. | AI automation or complex integrations unless approved. |

These are proposed starting priorities, not official commitments. The product owner/mentor must approve them. If the GitHub Project uses numeric priorities such as P0/P1/P2/P3, ask the team what those labels mean before mapping them to MoSCoW.

---

## 25. Suggested Implementation Plan

This is a dependency-aware example, not a committed timeline.

### Phase 1 — Confirm requirements and repository conventions

- Obtain the approved PRD and confirm the MVP.
- Inspect the existing repository before changing structure.
- Confirm the stack, authentication approach, database, coding standards, and branch workflow.
- Review user stories and acceptance criteria with the mentor.

### Phase 2 — Project foundation

- Set up frontend/backend structure based on the approved architecture.
- Configure environment variables safely.
- Configure database and migrations if applicable.
- Add health endpoint, error handling, lint/type-check, and test scripts.
- Add CI checks if required.

### Phase 3 — Ticket creation and viewing

- Implement ticket form and server validation.
- Persist tickets.
- Implement ticket list and detail endpoints/pages.
- Test invalid input and ticket-level access control.

### Phase 4 — Staff workflow

- Implement assignment and permitted status transitions.
- Add business-rule tests.
- Confirm role permissions and audit requirements.

### Phase 5 — Communication and discovery

- Implement replies and visibility rules if in scope.
- Add search/filter if in scope.
- Add activity history or notifications only if approved.

### Phase 6 — QA, UAT, and release

- Complete regression and end-to-end checks.
- Run UAT with stakeholders.
- Resolve release-blocking defects.
- Prepare deployment, rollback, monitoring, and release notes.
- Obtain the required approval before release.

---

## 26. Deployment and Release

The deployment provider and environments have not been confirmed.

Before choosing or configuring hosting, decide:

- Where frontend and backend will be hosted.
- Where the database will run and how backups are handled.
- How environment secrets are managed.
- How database migrations run safely.
- Which origins/domains are permitted by CORS.
- How logs, errors, and availability are monitored.
- What rollback procedure exists.
- Who approves a release and responds to production issues.

Never put production secrets in GitHub source files or in frontend environment variables that are bundled into browser code.

---

## 27. Risks and Open Questions

### Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Requirements are unconfirmed | Rework or incorrect scope. | Review the official PRD with the mentor and mark assumptions. |
| Permissions are ambiguous | Data leakage or blocked workflows. | Approve a role/permission matrix and test allowed/denied cases. |
| Status workflow is unclear | Tickets become stuck or inconsistent. | Approve a transition matrix and test it. |
| Public/internal messages are confused | Private notes may be disclosed. | Define visibility and enforce it on the server. |
| Technology stack is chosen prematurely | Rework and dependency conflicts. | Confirm stack before scaffolding. |
| No test plan | Regressions and missed requirements. | Define acceptance tests and CI checks. |
| Secrets are committed | Security incident. | Use ignored local env files and an approved secret manager. |

### Questions to confirm with the mentor

1. Is the proposed TypeScript + React + Express + PostgreSQL stack approved?
2. Is this repository expected to be a monorepo or separate frontend/backend repositories?
3. Which authentication method/provider should be used?
4. What are the exact ticket fields and required validations?
5. Which roles and permissions are required?
6. What are the official status values and allowed transitions?
7. Are replies, internal notes, attachments, notifications, and activity history in scope?
8. Are numeric priorities such as P0/P1/P2/P3 already defined by the team?
9. Which branch is the base branch, and what are the pull request rules?
10. Which hosting, CI, and database environments are approved?
11. What are the official coding style, test coverage, and definition-of-done requirements?
12. Where is the approved PRD and which board is the source of truth?

---

## 28. Glossary

| Term | Meaning |
|---|---|
| PRD | Product Requirements Document; describes the problem, goals, scope, and requirements. |
| User story | A concise description of a user outcome and its value. |
| Acceptance criteria | Conditions that must be satisfied for a story to be accepted. |
| Epic | A larger capability containing related stories. |
| Task | A specific activity that helps deliver a story. |
| API | Application Programming Interface; a contract for communication between software components. |
| REST | A common style for HTTP APIs using resources and methods. |
| ORM | Object-relational mapper; a tool that maps application objects to relational database operations. |
| Middleware | Code that runs during request processing, such as authentication or validation. |
| Authentication | Establishing who a user or caller is. |
| Authorization | Deciding what that user or caller may do. |
| Migration | A versioned change to the database schema. |
| CI | Continuous Integration; automated checks run on code changes. |
| UAT | User Acceptance Testing; stakeholders verify that workflows meet their needs. |
| MoSCoW | Prioritisation method: Must, Should, Could, Won't have this time. |

---

## 29. Change History

| Version | Date | Change | Status |
|---|---|---|---|
| 0.1 | 22 October 2026 | Initial proposed PRD draft. | Draft |
| 0.2 | 22 October 2026 | Expanded README with proposed architecture, project structure, file responsibilities, connection flows, stack, API, data model, testing, setup, and workflow guidance. | Draft — requires review |

---

## Final Note

This README is intended to be a comprehensive starting point for discussion and planning. It does **not** prove that the described architecture, folders, endpoints, or technology stack already exist in the repository. Inspect the current codebase and confirm the official requirements with the mentor before adding files or beginning implementation.
