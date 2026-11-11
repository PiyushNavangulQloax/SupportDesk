# Week 2 Technical Mock Interview Preparation Guide
**SupportDesk Backend Engineering — Architecture, Security, Testing & System Design**

---

## 1. Deep-Dive Review of All 20 Core Concepts: Implementations & Execution Flows

Below is the definitive walkthrough of every Week 2 curriculum concept, demonstrating exactly how each is engineered in the SupportDesk codebase and tracing its precise runtime execution flow.

---

### Concept 1: Authentication vs. Authorization
- **SupportDesk Implementation:**
  - *Authentication (AuthN):* Handled centrally in [`src/middleware/auth.middleware.ts`](../../apps/api/src/middleware/auth.middleware.ts) via the `authenticate` middleware.
  - *Authorization (AuthZ):* Handled in domain services, primarily [`src/services/tickets.service.ts`](../../apps/api/src/services/tickets.service.ts) and [`src/services/comments.service.ts`](../../apps/api/src/services/comments.service.ts).
- **Execution Flow:**
  1. Client sends `PATCH /api/v1/tickets/:id` with `Authorization: Bearer <jwt>`.
  2. `authenticate` middleware intercepts request, verifies token signature using `JWT_SECRET`, decodes payload `{ id, email, role }`, and attaches `req.user`. (AuthN succeeds: identity established).
  3. Request passes to `TicketsController.updateTicket`, which forwards `req.params.id`, `req.body`, and `req.user` to `TicketsService.updateTicket`.
  4. `TicketsService` inspects `user.role`: if `user.role === UserRole.CUSTOMER` and `req.body.status` or `req.body.assigneeId` is provided, it throws `ForbiddenError("Customers cannot update ticket status or assignee")`. (AuthZ fails: role lacks permission).
  5. Global error handler converts `ForbiddenError` to HTTP `403 Forbidden`.

---

### Concept 2: JWT (JSON Web Token) Concept & Statelessness
- **SupportDesk Implementation:**
  - Token minting and verification in [`src/utils/jwt.ts`](../../apps/api/src/utils/jwt.ts).
- **Execution Flow:**
  1. Client calls `POST /api/v1/auth/login` with email and password.
  2. `AuthService.login()` validates password with bcrypt.
  3. `signToken({ id: user.id, email: user.email, role: user.role })` signs the payload using `jsonwebtoken` with `HS256` and `JWT_EXPIRES_IN="1d"`.
  4. Server sends the token string back to client in JSON response envelope.
  5. *Statelessness:* The server writes zero rows to a database session table. On subsequent requests, any server worker with `JWT_SECRET` verifies the cryptographic signature directly.

---

### Concept 3: JWT Structure: Header, Payload, Signature
- **SupportDesk Implementation:**
  - [`src/utils/jwt.ts`](../../apps/api/src/utils/jwt.ts) lines 10–35.
- **Execution Flow:**
  1. Standard JWT consists of `base64url(header) + "." + base64url(payload) + "." + signature`.
  2. `Header`: `{"alg": "HS256", "typ": "JWT"}`.
  3. `Payload`: `{"id": "...", "email": "...", "role": "CUSTOMER", "iat": 1773220000, "exp": 1773306400}`.
  4. `Signature`: `HMACSHA256(base64url(header) + "." + base64url(payload), JWT_SECRET)`.
  5. If an attacker tampers with the payload (e.g. changing `"role": "CUSTOMER"` to `"ADMIN"`), the server recalculates the signature using `JWT_SECRET`; the mismatch causes `jwt.verify()` to throw `JsonWebTokenError`, resulting in `401 Unauthorized`.

---

### Concept 4: Access Tokens & Token Expiration
- **SupportDesk Implementation:**
  - Configured in [`src/config/env.ts`](../../apps/api/src/config/env.ts) (`JWT_EXPIRES_IN="1d"`).
  - Evaluated in [`src/utils/jwt.ts:verifyToken`](../../apps/api/src/utils/jwt.ts#L25-L35).
- **Execution Flow:**
  1. Token includes standard numeric claim `exp` (timestamp in seconds).
  2. When request arrives, `verifyToken` invokes `jwt.verify(token, JWT_SECRET)`.
  3. If current server time $> exp$, the library throws `TokenExpiredError`.
  4. `verifyToken` catches the error and throws `UnauthorizedError("Invalid or expired token")`.
  5. Returned HTTP response is `401 Unauthorized`.

---

### Concept 5: Password Hashing vs. Encryption
- **SupportDesk Implementation:**
  - Implemented in [`src/utils/password.ts`](../../apps/api/src/utils/password.ts) using `bcrypt`.
- **Execution Flow:**
  1. *Hashing is one-way:* Passwords cannot be decrypted or converted back to plaintext, even by system administrators.
  2. When creating/registering a user, `hashPassword(plainText)` generates a random 16-byte salt and hashes the plaintext password.
  3. The resulting modular crypt format string (`$2a$12$...`) is saved to `users.password_hash`.
  4. During login, `comparePassword(plainText, hash)` extracts the salt and work factor from the stored hash, computes the bcrypt hash of the candidate password, and performs a constant-time comparison.

---

### Concept 6: bcrypt Algorithm & Salt Work Factor
- **SupportDesk Implementation:**
  - Constant `BCRYPT_ROUNDS = 12` in [`src/utils/password.ts`](../../apps/api/src/utils/password.ts#L4).
- **Execution Flow:**
  1. `bcrypt.hash(password, 12)` executes $2^{12} = 4,096$ iterations of the blowfish key-expansion algorithm.
  2. Each hash takes ~250ms of CPU time on modern hardware.
  3. *Security Impact:* Attackers with leaked database dumps cannot use high-speed GPU hash cracking (which crack billions of unsalted MD5/SHA-256 hashes per second). At 12 rounds, cracking speeds drop to only a few hundred guesses per second per GPU.
  4. Unique salt per user prevents rainbow table attacks.

---

### Concept 7: Authentication Middleware in Express
- **SupportDesk Implementation:**
  - Middleware function `authenticate` in [`src/middleware/auth.middleware.ts`](../../apps/api/src/middleware/auth.middleware.ts).
- **Execution Flow:**
  1. Reads `req.headers.authorization`.
  2. Validates format: must start with `Bearer ` and contain non-empty token string. (Throws `UnauthorizedError("Authentication token required")` if missing).
  3. Calls `verifyToken(token)`. If signature or expiry fails, throws `UnauthorizedError("Invalid or expired token")`.
  4. Sets `req.user = payload` (typed via TypeScript declaration merging in `src/types/express.ts`).
  5. Calls `next()` to hand execution to route handler.

---

### Concept 8: Role-Based Access Control (RBAC) Architecture
- **SupportDesk Implementation:**
  - Enum `UserRole` in [`prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) (`CUSTOMER`, `AGENT`, `ADMIN`).
  - Helper middleware `requireRole` in [`src/middleware/auth.middleware.ts`](../../apps/api/src/middleware/auth.middleware.ts) and domain guards in service methods.
- **Execution Flow:**
  1. Instead of assigning permissions per individual user, permissions are grouped by role.
  2. `requireRole(UserRole.ADMIN)` acts as an entry guard on admin-only routes.
  3. Fine-grained operations (e.g. updating ticket status or creating internal notes) check `user.role` inside the service layer.

---

### Concept 9: CUSTOMER, AGENT & ADMIN Permission Matrix
- **SupportDesk Implementation:**
  - Enforced in [`src/services/tickets.service.ts`](../../apps/api/src/services/tickets.service.ts) and [`src/services/comments.service.ts`](../../apps/api/src/services/comments.service.ts).
- **Execution Flow:**
  - `CUSTOMER`: Can create tickets, list only their own tickets, view their own tickets, add public comments to their own tickets. Cannot assign tickets, change status, or view/create internal comments.
  - `AGENT`: Can view all tickets, update ticket status, reassign tickets to other agents, view all comments (including internal notes), post internal notes.
  - `ADMIN`: Full superset of Agent capabilities, plus system configuration and user management.

---

### Concept 10: HTTP 401 Unauthorized vs. 403 Forbidden
- **SupportDesk Implementation:**
  - Defined in [`src/errors/appError.ts`](../../apps/api/src/errors/appError.ts).
- **Execution Flow:**
  - `401 Unauthorized` (`UnauthorizedError`): "Who are you?" Triggered when Authorization header is missing, malformed, or token has an invalid signature/expired.
  - `403 Forbidden` (`ForbiddenError`): "I know who you are, but you cannot do this." Triggered when a valid customer token attempts an agent-only action (e.g. assigning a ticket or posting an internal note).

---

### Concept 11: REST API Architectural Fundamentals
- **SupportDesk Implementation:**
  - Nouns for resources (`/api/v1/tickets`, `/api/v1/tickets/:ticketId/comments`).
  - Standardized JSON responses via [`src/utils/response.ts`](../../apps/api/src/utils/response.ts).
- **Execution Flow:**
  1. Client sends request to plural noun URI.
  2. All responses return consistent JSON envelope: `{ success: true, data: ..., meta?: ... }` or `{ success: false, error: { code, message, details? } }`.
  3. Stateless communication: each HTTP request contains full credentials.

---

### Concept 12: HTTP Methods & Status Code Semantics
- **SupportDesk Implementation:**
  - `POST` $\rightarrow$ `201 Created` (`TicketsController.createTicket`)
  - `GET` $\rightarrow$ `200 OK` (`TicketsController.listTickets`, `getTicketById`)
  - `PATCH` $\rightarrow$ `200 OK` (`TicketsController.updateTicket` - partial updates)
  - `DELETE` $\rightarrow$ `204 No Content` or `200 OK`
  - Input Validation Failures $\rightarrow$ `400 Bad Request`
  - Authentication Missing $\rightarrow$ `401 Unauthorized`
  - Permission Denied $\rightarrow$ `403 Forbidden`
  - Missing Resource or IDOR Shield $\rightarrow$ `404 Not Found`
  - Rate Limit Exceeded $\rightarrow$ `429 Too Many Requests`
  - Unhandled Server Exception $\rightarrow$ `500 Internal Server Error`

---

### Concept 13: Layered MVC Architecture in Backend Systems
- **SupportDesk Implementation:**
  - Request Direction: `Routes` $\rightarrow$ `Middleware` $\rightarrow$ `Controllers` $\rightarrow$ `Services` $\rightarrow$ `Repositories` $\rightarrow$ `Prisma / PostgreSQL`.
- **Execution Flow:**
  1. **Route Layer:** Defines HTTP verb, URL path, and binds middleware chain.
  2. **Controller Layer:** Reads HTTP request (params, query, body), passes pure JavaScript arguments to service, receives domain model, formats HTTP response.
  3. **Service Layer:** Business rules, permissions, validation calculations. No Express `req`/`res` objects here!
  4. **Repository Layer:** Direct database operations via Prisma Client. No business logic here!

---

### Concept 14: Routes, Controllers, Services & Repositories
- **SupportDesk Implementation:**
  - Look at tickets: [`tickets.routes.ts`](../../apps/api/src/routes/tickets.routes.ts), [`tickets.controller.ts`](../../apps/api/src/controllers/tickets.controller.ts), [`tickets.service.ts`](../../apps/api/src/services/tickets.service.ts), [`tickets.repository.ts`](../../apps/api/src/repositories/tickets.repository.ts).
- **Execution Flow:**
  - Separation of Concerns: The Service can be tested in complete isolation using Jest unit tests by mocking the repository. If PostgreSQL is replaced with MongoDB, only the Repository layer changes; Controllers and Services remain untouched.

---

### Concept 15: Runtime Request Validation with Zod
- **SupportDesk Implementation:**
  - Schemas in [`src/schemas/ticket.schema.ts`](../../apps/api/src/schemas/ticket.schema.ts), middleware in [`src/middleware/validate.ts`](../../apps/api/src/middleware/validate.ts).
- **Execution Flow:**
  1. `validateRequest({ body: createTicketSchema })` runs before controller.
  2. Zod parses `req.body` at runtime.
  3. If payload contains missing `title` or empty string, Zod throws a `ZodError`.
  4. Middleware intercepts `ZodError` and responds with `400 Bad Request` and structured field-level errors: `{ field: "title", message: "Title is required" }`.
  5. Controller receives guaranteed sanitized and strongly-typed data.

---

### Concept 16: Prisma ORM & Database Abstraction
- **SupportDesk Implementation:**
  - Schema in [`prisma/schema.prisma`](../../apps/api/prisma/schema.prisma), client instantiated in [`src/config/database.ts`](../../apps/api/src/config/database.ts).
- **Execution Flow:**
  1. Developers define relational entities, column types, enums, and foreign keys declaratively.
  2. `prisma migrate dev` generates versioned SQL migration scripts and executes them against PostgreSQL.
  3. Prisma generates TypeScript definitions matching the database schema exactly, providing compile-time type safety for all database queries.

---

### Concept 17: PostgreSQL Relationships & Foreign Keys
- **SupportDesk Implementation:**
  - Defined in [`prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) lines 70–95.
- **Execution Flow:**
  - `createdBy User @relation("TicketCreator", fields: [createdById], references: [id], onDelete: Restrict)`
    - If someone attempts `DELETE FROM users WHERE id = 'user-123'`, PostgreSQL enforces referential integrity: it throws a foreign key constraint violation because `onDelete: Restrict` prevents deleting a user who owns historical tickets.
  - `assignee User? @relation("TicketAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)`
    - If an assigned agent's user account is removed, `onDelete: SetNull` cleanly sets `assigneeId = NULL` without deleting the ticket.

---

### Concept 18: Ticket Ownership Isolation & Anti-Enumeration (IDOR)
- **SupportDesk Implementation:**
  - Enforced in [`src/services/tickets.service.ts:getTicketById`](../../apps/api/src/services/tickets.service.ts#L68-L80).
- **Execution Flow:**
  1. Customer A sends `GET /api/v1/tickets/:customerB_TicketId`.
  2. Service retrieves ticket from repository: `ticket.createdById === "customer-B"`.
  3. Service checks: `user.role === UserRole.CUSTOMER && ticket.createdById !== user.id`.
  4. Service throws `new NotFoundError("Ticket not found")` (HTTP 404), NOT 403.
  5. *Anti-Enumeration Rationale:* If the server returned `403 Forbidden`, the attacker would confirm that the UUID exists. Returning `404 Not Found` makes existing foreign tickets indistinguishable from non-existent UUIDs.

---

### Concept 19: Comments API & Internal Note Visibility Rules
- **SupportDesk Implementation:**
  - Enforced in [`src/services/comments.service.ts`](../../apps/api/src/services/comments.service.ts).
- **Execution Flow:**
  1. *Author Binding:* When creating a comment, the service forces `authorId = user.id`. Any `authorId` supplied in the request body is discarded.
  2. *Internal Note Creation:* If `user.role === UserRole.CUSTOMER` and `input.isInternal === true`, service rejects with `ForbiddenError`.
  3. *Comment Listing Scoping:* When listing comments, `CommentsService` sets `includeInternal = (user.role === AGENT || user.role === ADMIN)`.
  4. For Customers, the Prisma query in repository executes `where: { ticketId, isInternal: false }`. Internal comments never leave the database, preventing accidental leakage.

---

### Concept 20: Unit vs. Integration Testing & OpenAPI Documentation
- **SupportDesk Implementation:**
  - Unit tests: [`tests/tickets.service.spec.ts`](../../apps/api/tests/tickets.service.spec.ts) (86 unit tests).
  - Integration tests: [`tests/integration.spec.ts`](../../apps/api/tests/integration.spec.ts) (29 Supertest tests).
  - OpenAPI Spec: [`src/docs/openapi.ts`](../../apps/api/src/docs/openapi.ts) served at `/docs`.
- **Execution Flow:**
  - *Unit Tests:* Test business edge cases in milliseconds using Jest mocks for repositories.
  - *Integration Tests:* Supertest makes real HTTP requests against an Express instance backed by a dedicated PostgreSQL test database (`supportdesk_test`).
  - *Safety Guard:* [`tests/helpers/testDb.ts`](../../apps/api/tests/helpers/testDb.ts) validates that the database name ends with `_test` before truncating tables, protecting development and production data.
  - *OpenAPI:* Swagger UI serves interactive documentation verified against running endpoints.

---

## 2. Core Code Files & Architectural Responsibilities

| File Path | Architectural Layer | Key Responsibilities |
|:---|:---|:---|
| [`src/app.ts`](../../apps/api/src/app.ts) | Application Entry / Express Setup | Configures global middleware (`helmet`, `cors`, `express.json`), mounts route trees under `/api/v1`, mounts Swagger UI at `/docs`, and registers global error handlers. |
| [`src/config/database.ts`](../../apps/api/src/config/database.ts) | Infrastructure / Database Config | Initializes Prisma Client singleton. Contains `resolveDatabaseUrl()` which prohibits test runs without `TEST_DATABASE_URL` and prevents accidental test execution on development databases. |
| [`src/middleware/auth.middleware.ts`](../../apps/api/src/middleware/auth.middleware.ts) | HTTP Middleware / Security Perimeter | Parses Bearer tokens from `Authorization` header, verifies JWT signatures, and attaches typed `req.user`. Exports `requireRole()` helper. |
| [`src/middleware/rateLimiter.ts`](../../apps/api/src/middleware/rateLimiter.ts) | HTTP Middleware / Throttling | Limits brute-force login attempts using `express-rate-limit` (5 requests per 15 minutes per IP on `/auth/login`). |
| [`src/middleware/validate.ts`](../../apps/api/src/middleware/validate.ts) | HTTP Middleware / Data Sanitization | Executes Zod schema parsing on `req.body`, `req.query`, and `req.params`. Converts Zod validation failures into standard `400 Bad Request` responses. |
| [`src/routes/tickets.routes.ts`](../../apps/api/src/routes/tickets.routes.ts) | Routing Layer | Maps HTTP endpoints (`GET /`, `POST /`, `GET /:id`, `PATCH /:id`) to `TicketsController` methods with authentication and validation middleware. |
| [`src/controllers/tickets.controller.ts`](../../apps/api/src/controllers/tickets.controller.ts) | Controller Layer | Extracts parameters and body from Express request, calls `TicketsService`, and formats responses using `successResponse()` with status codes `200` and `201`. |
| [`src/services/tickets.service.ts`](../../apps/api/src/services/tickets.service.ts) | Domain Service Layer | Core business logic: customer scoping, role permission enforcement, status transitions, pagination calculations, and anti-enumeration 404 shielding. |
| [`src/repositories/tickets.repository.ts`](../../apps/api/src/repositories/tickets.repository.ts) | Data Access Layer | Executes type-safe queries against PostgreSQL using Prisma Client. Handles title search (`contains` with `mode: insensitive`) and allowlisted column sorting. |
| [`src/services/comments.service.ts`](../../apps/api/src/services/comments.service.ts) | Domain Service Layer | Enforces comment business rules: customer ownership verification, internal comment confidentiality, and strict server-side author binding. |
| [`src/utils/jwt.ts`](../../apps/api/src/utils/jwt.ts) | Security Utilities | Wraps `jsonwebtoken` library. Signs and verifies tokens using `JWT_SECRET` and algorithm `HS256`. |
| [`src/utils/password.ts`](../../apps/api/src/utils/password.ts) | Security Utilities | Password hashing and comparison using `bcrypt` with work factor 12. |
| [`tests/helpers/testDb.ts`](../../apps/api/tests/helpers/testDb.ts) | Testing Infrastructure | `assertTestDatabase()` and `cleanTestDatabase()` guard against accidental data truncation on non-test environments. |

---

## 3. 30 Technical Interview Questions & Model Answers

### Part 1: Architecture & Request Lifecycle (Questions 1–6)

#### Q1: "Explain what happens from the moment an HTTP request reaches Express until a response is returned in SupportDesk."
- **Model Answer:**
  "When an incoming HTTP request hits our Express server in `src/app.ts`, it first passes through global security middleware: `helmet` sets secure HTTP response headers, `cors` validates the origin, and `express.json` parses JSON request bodies. The request is then matched by Express router in `src/routes/tickets.routes.ts`. 
  
  If the route is protected, it passes through `authenticate` middleware, which parses the Bearer JWT, verifies the HMAC-SHA256 signature, and attaches the decoded user payload to `req.user`. Next, `validateRequest` parses query parameters or request bodies against a Zod schema. If valid, the request reaches the controller (`TicketsController`), which unpacks the sanitized inputs and calls `TicketsService`.
  
  The service layer executes domain business rules, verifies user roles, and invokes `TicketsRepository`. The repository uses Prisma Client to query PostgreSQL. The returned database models flow back through the service and controller, which wraps the result in a standardized `{ success: true, data: ... }` envelope and returns an appropriate HTTP status code (e.g. 200 or 201)."

#### Q2: "Why did you separate Controllers from Services instead of putting business logic in Controllers?"
- **Model Answer:**
  "Controllers are concerned strictly with the HTTP protocol: reading request headers, route parameters, and query strings, and returning HTTP response codes and JSON bodies. If business logic is in controllers, you cannot test domain rules without mocking the entire HTTP request/response cycle.
  
  By extracting business logic into Services, our domain rules (such as customer ticket scoping and internal comment restrictions) are plain TypeScript classes. They can be unit-tested in complete isolation in milliseconds using mock repositories. Furthermore, if we expose the same business logic via a CLI tool, WebSocket, or message queue in the future, the service can be reused without touching Express."

#### Q3: "What is the purpose of the Repository layer, and what problem does it solve?"
- **Model Answer:**
  "The Repository layer encapsulates all direct database access queries (Prisma Client in our case). Services never write raw SQL or directly invoke Prisma methods. This provides two key advantages:
  1. *Decoupling & Testability:* When unit-testing `TicketsService`, we pass a mock repository implementing `TicketsRepository`. We can simulate database failures or record returns without a running PostgreSQL instance.
  2. *Centralized Data Access Logic:* Complex queries, like multi-condition search, pagination calculations, and allowlisted column sorting, are isolated in one place rather than duplicated across multiple services."

#### Q4: "How does SupportDesk ensure consistent API responses across both success and error scenarios?"
- **Model Answer:**
  "We use a standardized JSend-inspired response envelope defined in `src/utils/response.ts`. Every successful response follows `{ success: true, data: T, meta?: ... }`. Every error response follows `{ success: false, error: { code: string, message: string, details?: ... } }`.
  
  For errors, our centralized error-handling middleware catches all thrown exceptions. If the error inherits from `AppError` (like `NotFoundError`, `ForbiddenError`, or `ValidationError`), it maps to its designated HTTP status and code. Unhandled errors log internally and return a generic 500 status with `{ code: 'INTERNAL_SERVER_ERROR' }`, ensuring sensitive stack traces are never leaked to clients."

#### Q5: "What is the difference between synchronous and asynchronous middleware in Express, and how do you handle errors in async middleware?"
- **Model Answer:**
  "Synchronous middleware executes sequentially on the main thread and can pass errors using `next(err)` or by throwing in Express 5. Asynchronous middleware returns a Promise (e.g. database lookups or password hashing). If an unhandled promise rejection occurs inside an async handler without a try/catch, earlier Express versions would hang or crash. In SupportDesk, our controllers and middleware use async/await with try/catch blocks that pass errors to `next(err)`, routing them safely to our centralized error handler."

#### Q6: "Why is OpenAPI (Swagger) documentation important, and how did you verify that your `/docs` specification matches runtime code?"
- **Model Answer:**
  "OpenAPI 3.0 provides a single machine-readable contract between backend and frontend teams. It allows frontend developers to understand route schemas, authentication schemes, and expected status codes without reading backend source code. 
  
  To verify accuracy in SupportDesk, we created automated tests in `tests/docs.spec.ts` that fetch `/docs/openapi.json` and assert that every registered route, path parameter, and response code matches our actual Express router and Zod validation schemas."

---

### Part 2: Authentication, Password Hashing & JWT Security (Questions 7–12)

#### Q7: "Why is a JSON Web Token described as signed rather than encrypted?"
- **Model Answer:**
  "A standard JWT consists of three base64url-encoded parts. The Header and Payload are simply encoded JSON text, not encrypted ciphertext. Anyone who intercepts the token can decode and view the payload claims (`id`, `email`, `role`). 
  
  The Signature is generated by hashing the header and payload using a secret key. This guarantees **integrity** and **authenticity** (the token cannot be modified without invalidating the signature), but NOT confidentiality. Therefore, sensitive information such as passwords, API keys, or personal credit card numbers must never be placed in a JWT payload."

#### Q8: "What would happen if an attacker modifies the role claim in their JWT from CUSTOMER to ADMIN?"
- **Model Answer:**
  "The attacker would base64url-decode the payload, change `"role": "CUSTOMER"` to `"role": "ADMIN"`, and re-encode it. However, when the altered token arrives at our `authenticate` middleware, `verifyToken` recalculates the HMAC-SHA256 signature using our server's `JWT_SECRET`.
  
  Because the attacker does not possess `JWT_SECRET`, their modified token will fail the cryptographic signature check. `jwt.verify` throws a `JsonWebTokenError`, and the middleware immediately halts the request, returning HTTP `401 Unauthorized`."

#### Q9: "Why is an expiration time (`exp`) required in JWTs, and how should token revocation be handled in a production architecture?"
- **Model Answer:**
  "Because JWTs are stateless, the backend does not check a database session table on every request. If a token had no expiration and was intercepted by an attacker, the attacker would have permanent access. The `exp` claim limits the vulnerability window (1 day in SupportDesk).
  
  For immediate revocation in production (e.g. user logout, password reset, or account compromise), standard architectures use a distributed in-memory cache like Redis as a token blocklist or use short-lived access tokens (15 minutes) paired with revocable refresh tokens stored in the database."

#### Q10: "Why did SupportDesk choose bcrypt over SHA-256 or MD5 for password storage?"
- **Model Answer:**
  "SHA-256 and MD5 are general-purpose cryptographic hash functions optimized for speed. Modern hardware (GPUs and ASICs) can compute tens of billions of SHA-256 hashes per second, allowing attackers to crack password databases via brute-force or precomputed rainbow tables in minutes.
  
  Bcrypt is specifically designed for password hashing. It incorporates two critical defenses:
  1. *Automatic Salting:* Generates a unique 16-byte random salt for every password, ensuring identical passwords yield completely different hashes and defeating rainbow tables.
  2. *Adaptive Work Factor:* We configure 12 rounds ($2^{12} = 4,096$ iterations), introducing deliberate computational cost (~250ms per check), which makes brute-force attacks computationally and financially infeasible."

#### Q11: "Explain how `bcrypt.compare` works without decrypting the stored password hash."
- **Model Answer:**
  "The stored bcrypt hash string includes the algorithm identifier, work factor, and salt (e.g., `$2a$12$e8I7a...`). When a user logs in, `bcrypt.compare` extracts the salt and work factor directly from the stored hash, hashes the newly provided plaintext password using those identical parameters, and performs a timing-safe comparison between the freshly computed hash and the stored hash. If they match, the password is correct."

#### Q12: "How does SupportDesk protect against brute-force login attacks?"
- **Model Answer:**
  "We implement IP-based rate limiting on the `/api/v1/auth/login` endpoint using `express-rate-limit` in `src/middleware/rateLimiter.ts`. It restricts clients to a maximum of 5 login attempts per 15-minute window per IP. If a client exceeds this threshold, the middleware immediately rejects subsequent requests with HTTP `429 Too Many Requests` and standard `RateLimit-*` headers before executing bcrypt or database queries."

---

### Part 3: Authorization, RBAC & Ownership Isolation (Questions 13–18)

#### Q13: "What is the difference between 401 Unauthorized and 403 Forbidden in SupportDesk?"
- **Model Answer:**
  "HTTP 401 indicates missing or invalid authentication: the caller has not provided valid proof of identity (e.g. missing Authorization header, malformed token, invalid signature, or expired token).
  
  HTTP 403 indicates insufficient authorization: the caller's identity is verified, but their role lacks permission to perform the requested operation (e.g. an authenticated customer attempting to reassign a ticket or post an internal staff comment)."

#### Q14: "Explain the concept of Insecure Direct Object References (IDOR) and how SupportDesk mitigates it."
- **Model Answer:**
  "An IDOR vulnerability occurs when an application exposes a direct reference to an internal database object (such as a ticket UUID in the URL) and fails to verify that the requesting user owns that object. An attacker could simply change the UUID in the URL to view other customers' tickets.
  
  In SupportDesk, `TicketsService.getTicketById` and `CommentsService.createComment` inspect the authenticated user's role. If the user is a `CUSTOMER`, the service verifies that `ticket.createdById === user.id`. If it does not match, the service throws `NotFoundError`."

#### Q15: "Why does SupportDesk return HTTP 404 instead of HTTP 403 when a customer accesses another customer's ticket?"
- **Model Answer:**
  "This is an **anti-enumeration** security defense. If the API returned `403 Forbidden`, it would confirm to an attacker that the ticket UUID actually exists in the database. Attackers could scan UUID sequences or harvested IDs to discover valid customer tickets. By returning `404 Not Found`, the response for a foreign ticket is identical to the response for a non-existent UUID, giving an attacker zero information."

#### Q16: "How does SupportDesk prevent customers from viewing internal staff notes on tickets?"
- **Model Answer:**
  "Internal comment confidentiality is enforced at the database query layer in `CommentsService.listComments`. The service checks the user's role: if `user.role === UserRole.CUSTOMER`, it instructs the repository to filter records with `where: { isInternal: false }`. 
  
  Because internal notes are filtered out at the SQL query level in PostgreSQL, internal comments are never fetched into Node.js memory or serialized into the HTTP response for customers."

#### Q17: "How does SupportDesk prevent comment author spoofing?"
- **Model Answer:**
  "In `CommentsService.createComment`, the `authorId` is explicitly set to `user.id`, which is derived from the verified JWT in `req.user`. Even if a malicious client sends `{ "authorId": "admin-uuid", "body": "Hello" }` in the JSON request body, the service completely ignores any client-supplied `authorId` and binds the comment strictly to the authenticated user's identity."

#### Q18: "Can a customer assign a ticket to a support agent during ticket creation or update?"
- **Model Answer:**
  "No. In `TicketsService.createTicket`, if `user.role === UserRole.CUSTOMER` and `input.assigneeId` is provided, the service throws `ForbiddenError("Customers are not permitted to assign tickets to agents")`. In `TicketsService.updateTicket`, if a customer attempts to supply `assigneeId` or `status`, the service throws `ForbiddenError("Customers cannot update ticket status or assignee")`."

---

### Part 4: API Design, Zod Validation, Pagination & Error Handling (Questions 19–24)

#### Q19: "Why do we use Zod schemas when TypeScript already provides compile-time types?"
- **Model Answer:**
  "TypeScript types are purely compile-time constructs that are erased during the build process (`tsc`). At runtime, JavaScript cannot inspect TypeScript interfaces to validate incoming HTTP requests. 
  
  An attacker can send empty strings, SQL injection payloads, or missing fields. Zod runs at runtime in Express middleware, validating request bodies and query strings against strict schemas before our controller code executes. Furthermore, Zod schemas infer TypeScript types (`z.infer<typeof schema>`), keeping runtime validation and compile-time types perfectly synchronized."

#### Q20: "How does SupportDesk implement pagination in ticket listings, and why is in-memory pagination dangerous?"
- **Model Answer:**
  "SupportDesk implements offset-based pagination at the database level in `TicketsRepository.findMany`. The Zod query schema validates `page` (default 1) and `limit` (default 20, max 100). The service computes `skip = (page - 1) * limit` and passes `skip` and `take: limit` to Prisma Client.
  
  In-memory pagination (fetching all records from PostgreSQL and using `.slice()` in Node.js) is an anti-pattern. If the database has 500,000 tickets, fetching all rows would saturate network bandwidth, consume gigabytes of Node.js heap memory, and eventually cause an Out-Of-Memory (OOM) crash."

#### Q21: "How does title search work in `TicketsRepository`, and how is SQL injection prevented?"
- **Model Answer:**
  "Title search is implemented in `TicketsRepository.findMany` using Prisma's query filter: `where: { title: { contains: search, mode: 'insensitive' } }`. Prisma automatically parameterizes the search string into a SQL `$1` parameter in the prepared statement, preventing SQL injection vulnerabilities. In addition, `mode: 'insensitive'` enables case-insensitive matching in PostgreSQL."

#### Q22: "How does SupportDesk prevent SQL injection or sorting crashes when clients pass `sortBy` query parameters?"
- **Model Answer:**
  "In `src/schemas/ticket.schema.ts`, the `sortBy` parameter is validated using a strict Zod enum allowlist: `z.enum(['createdAt', 'updatedAt', 'priority', 'status', 'title'])`. If a client passes an arbitrary column name or SQL snippet (e.g. `sortBy=password_hash;DROP TABLE users--`), Zod immediately rejects the request with `400 Bad Request`. In the repository, Prisma only accepts strongly-typed object keys for the `orderBy` clause."

#### Q23: "What HTTP status code and response structure is returned when input validation fails?"
- **Model Answer:**
  "HTTP `400 Bad Request`. Our validation middleware catches `ZodError` and returns:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Validation failed",
      "details": [
        { "field": "title", "message": "Title is required and cannot be empty" }
      ]
    }
  }
  ```
  This gives frontend clients precise field-level feedback."

#### Q24: "What happens when an unhandled runtime exception occurs in a service method?"
- **Model Answer:**
  "The exception bubbles up to our global error handling middleware in `src/app.ts`. The error handler checks if the error is an instance of `AppError`. Because it is unhandled, it logs the stack trace internally for developers and returns a safe HTTP `500 Internal Server Error` response with `{ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected internal error occurred' } }`. This prevents leaking internal paths, SQL queries, or database credentials to the client."

---

### Part 5: PostgreSQL, Prisma, Testing Isolation & Security Scenarios (Questions 25–30)

#### Q25: "Explain the difference between `onDelete: Restrict` and `onDelete: SetNull` in Prisma schema."
- **Model Answer:**
  "`onDelete: Restrict` instructs PostgreSQL to abort and reject the deletion of a parent record if any child records reference it. We use this on `createdBy` in tickets and comments to guarantee that audit histories are preserved.
  
  `onDelete: SetNull` instructs PostgreSQL to automatically set the foreign key column in child records to `NULL` if the referenced parent record is deleted. We use this on `assigneeId` so that if a support agent's account is removed, existing tickets remain intact and become unassigned."

#### Q26: "How do your integration tests guarantee that the development database is never accidentally truncated?"
- **Model Answer:**
  "We employ a two-layer guardrail:
  1. *Configuration Guard:* In `src/config/database.ts`, `resolveDatabaseUrl()` checks `NODE_ENV === 'test'`. It mandates `TEST_DATABASE_URL` and throws an error if it is missing, prohibiting any silent fallback to `DATABASE_URL`.
  2. *Runtime Assertion Guard:* In `tests/helpers/testDb.ts`, `assertTestDatabase()` inspects the active connection string. If the database name does not strictly match `supportdesk_test`, it throws an exception before executing any `TRUNCATE TABLE` statement."

#### Q27: "What is the difference between unit tests in `tickets.service.spec.ts` and integration tests in `tests/integration.spec.ts`?"
- **Model Answer:**
  "Unit tests test domain business logic in memory in complete isolation. We mock `TicketsRepository` methods using Jest, allowing us to test edge cases (such as role permissions, validation boundaries, and 404 error throwing) in milliseconds without database latency.
  
  Integration tests use Supertest to spin up the actual Express application and make real HTTP network calls against our dedicated PostgreSQL test database (`supportdesk_test`). They verify that route definitions, middleware authentication, Zod schemas, Prisma queries, and database constraints all work together seamlessly."

#### Q28: "How does SupportDesk ensure password hashes are never exposed in user API responses?"
- **Model Answer:**
  "In Prisma queries across `AuthRepository` and `UsersRepository`, user records are mapped to safe DTOs (Data Transfer Objects) that explicitly omit `password_hash`. The TypeScript interface `UserRecord` excludes the password hash field. Even during registration or login, the API response envelope only includes `id`, `email`, `name`, `role`, and `createdAt`."

#### Q29: "Why does the test database use `TRUNCATE TABLE ... CASCADE` instead of `prisma migrate reset` between test runs?"
- **Model Answer:**
  "`prisma migrate reset` drops the entire database schema and re-executes all migrations from scratch, taking 3 to 10 seconds per test run. 
  
  By using `TRUNCATE TABLE users, tickets, comments, categories CASCADE`, the database schema, tables, indices, and foreign key definitions remain intact, while all rows are purged in ~10 milliseconds. This ensures fast, independent, and idempotent test execution."

#### Q30: "Why is CORS configured, and how does Helmet improve API security?"
- **Model Answer:**
  "CORS (Cross-Origin Resource Sharing) controls which client origins (e.g. `http://localhost:3000`) are permitted to read responses from our API in web browsers, blocking unauthorized third-party domains from making authenticated requests using stolen browser credentials.
  
  Helmet sets essential HTTP security headers, including `X-Content-Type-Options: nosniff` (prevents MIME-type sniffing), `X-Frame-Options: SAMEORIGIN` (mitigates clickjacking attacks), and Content Security Policy (CSP) directives."

---

## 4. Real-World Security Scenarios & System Behavior

### Scenario A: The Malicious IDOR UUID Probe
- **Context:** An authenticated customer Alice obtains a valid JWT. She notices ticket IDs are standard UUIDs. She writes a script that generates 1,000 UUIDs and sends `GET /api/v1/tickets/:uuid`.
- **System Behavior:**
  1. For non-existent UUIDs, `TicketsRepository.findById` returns `null`. `TicketsService` throws `NotFoundError("Ticket not found")` $\rightarrow$ HTTP 404.
  2. For UUIDs belonging to Customer Bob, `TicketsService` detects `ticket.createdById !== alice.id`. It throws `NotFoundError("Ticket not found")` $\rightarrow$ HTTP 404.
  3. Alice receives 1,000 identical HTTP 404 responses. She cannot distinguish existing tickets from non-existent tickets, completely eliminating resource enumeration.

### Scenario B: The `alg: none` JWT Forgery Attack
- **Context:** An attacker sends a forged JWT with header `{"alg": "none", "typ": "JWT"}` and payload `{"id": "admin-1", "role": "ADMIN"}`, omitting the signature.
- **System Behavior:**
  1. In `src/utils/jwt.ts`, `verifyToken` strictly specifies `algorithms: ["HS256"]`.
  2. `jsonwebtoken` rejects any token specifying `none` or unexpected algorithms, throwing `JsonWebTokenError`.
  3. `authenticate` middleware catches the error and returns `401 Unauthorized`.

### Scenario C: Login Brute-Force Flooding
- **Context:** A botnet targets `POST /api/v1/auth/login` with thousands of password guesses against `admin@supportdesk.com`.
- **System Behavior:**
  1. `loginRateLimiter` tracks requests by client IP address in a 15-minute sliding window.
  2. On the 6th attempt within 15 minutes from that IP, Express immediately returns `429 Too Many Requests`.
  3. No bcrypt operations or database queries are executed for subsequent attempts, protecting CPU and database resources from exhaustion.

### Scenario D: Internal Staff Note Exfiltration Attempt
- **Context:** Customer Alice knows ticket `ticket-123` has internal staff discussions. She sends `GET /api/v1/tickets/ticket-123/comments` attempting to view agent notes.
- **System Behavior:**
  1. Request passes authentication; `req.user` has `role: "CUSTOMER"`.
  2. `CommentsService.listComments` checks `user.role`. Because the role is not `AGENT` or `ADMIN`, `includeInternal` is evaluated to `false`.
  3. The repository query executes `where: { ticketId, isInternal: false }`.
  4. Only public comments are returned in `data`. Internal notes are physically excluded at the SQL level.

---

## 5. 20-Concept Mastery Assessment Matrix

| # | Curriculum Concept | SupportDesk Code Anchor | Verification Status |
|:---:|:---|:---|:---:|
| 1 | Authentication vs. Authorization | `auth.middleware.ts` & `tickets.service.ts` | **Mastered** |
| 2 | JWT Stateless Architecture | `src/utils/jwt.ts` | **Mastered** |
| 3 | JWT Structure (Header, Payload, Signature) | `src/utils/jwt.ts` (`HS256`) | **Mastered** |
| 4 | Token Expiration (`exp`) Handling | `src/config/env.ts` (`JWT_EXPIRES_IN="1d"`) | **Mastered** |
| 5 | Password Hashing vs Encryption | `src/utils/password.ts` | **Mastered** |
| 6 | bcrypt Algorithm & Work Factor 12 | `src/utils/password.ts` (`BCRYPT_ROUNDS = 12`) | **Mastered** |
| 7 | Express Auth Middleware & Context Binding | `src/middleware/auth.middleware.ts` | **Mastered** |
| 8 | Role-Based Access Control (RBAC) | `prisma/schema.prisma` (`UserRole`) | **Mastered** |
| 9 | CUSTOMER vs AGENT vs ADMIN Matrix | `tickets.service.ts` & `comments.service.ts` | **Mastered** |
| 10 | HTTP 401 vs. 403 Status Semantics | `src/errors/appError.ts` | **Mastered** |
| 11 | REST API Design Conventions | Plural nouns, JSend envelope | **Mastered** |
| 12 | HTTP Method & Status Code Semantics | GET (200), POST (201), PATCH (200), 400, 404 | **Mastered** |
| 13 | Layered MVC Architecture | Routes $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Repos | **Mastered** |
| 14 | Separation of Concerns (Services vs. Repos) | Isolated business logic & Prisma access | **Mastered** |
| 15 | Runtime Zod Schema Validation | `src/schemas/` & `validate.ts` | **Mastered** |
| 16 | Prisma ORM & Database Migrations | `prisma/schema.prisma` | **Mastered** |
| 17 | Relational Integrity & Foreign Keys | `onDelete: Restrict` & `onDelete: SetNull` | **Mastered** |
| 18 | IDOR Mitigation & Anti-Enumeration (404) | `TicketsService.getTicketById` | **Mastered** |
| 19 | Comments API & Internal Note Scoping | `CommentsService.listComments` (`isInternal`) | **Mastered** |
| 20 | Unit vs Integration Tests & OpenAPI | Jest mocks, Supertest (`supportdesk_test`), Swagger | **Mastered** |
