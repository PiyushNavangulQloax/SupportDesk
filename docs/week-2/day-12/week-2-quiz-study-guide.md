# Week 2 Knowledge Quiz Study Guide
**SupportDesk — Week 2 Day 6 (Day 12)**

---

## Notice
> **Status:** Study & Preparation Guide  
> This document is designed for self-study and review preparation. It covers all 20 technical questions from the Week 2 curriculum with clear explanations, technical deep-dives, practical SupportDesk code references, and concise interview-ready answers.

---

### Question 1: What is the difference between a route and a controller?

1. **Simple Beginner-Friendly Explanation:**  
   Think of a **route** as a signpost or receptionist that points a visitor to the right room. A **controller** is the person in that room who takes the visitor's request, checks the paperwork, asks the staff (service) to do the work, and hands back the result.
2. **Technical Explanation:**  
   In Express, a **route** maps an HTTP verb (`GET`, `POST`, `PATCH`, `DELETE`) and path to middleware functions (such as request schema validation and authentication). A **controller** acts as the transport layer adapter: it extracts parameters from `req` (`params`, `query`, `body`), passes them to the domain service, catches unhandled exceptions, and formats the standardized HTTP response (`res.status().json()`).
3. **SupportDesk Practical Example:**  
   When a client requests `POST /api/v1/tickets`, the route ensures the request has a valid Bearer token and that the request body matches `createTicketBodySchema`. The controller receives the parsed body, invokes `ticketsService.createTicket()`, and packages the created ticket into a `201 Created` envelope.
4. **Relevant Code Location:**  
   - Route: `apps/api/src/routes/tickets.routes.ts` (lines 14–26)  
   - Controller: `apps/api/src/controllers/tickets.controller.ts` (lines 18–35)
5. **Short Interview-Style Answer:**  
   *"A route defines the HTTP endpoint path, method, and middleware chain, whereas a controller receives the HTTP request, invokes the appropriate domain service, and returns the HTTP status and response payload."*

---

### Question 2: Why should business logic live in a service?

1. **Simple Beginner-Friendly Explanation:**  
   If your rules (like *"customers can only see their own tickets"*) are written inside the web controller, you cannot reuse those rules if you later build a mobile app API, a background job, or a command-line script. Putting rules in a dedicated service keeps them in one place.
2. **Technical Explanation:**  
   Encapsulating business logic in a domain service enforces the Single Responsibility Principle and Separation of Concerns. Services are decoupled from HTTP transport artifacts (`Request`, `Response`). This allows domain workflows, permission rules, and state validations to be reused across different entry points (REST, GraphQL, CLI, queue consumers) and makes them unit-testable without spinning up an HTTP server.
3. **SupportDesk Practical Example:**  
   `CommentsService.createComment` enforces the rule that customers cannot mark comments as internal (`isInternal: true`) and can only comment on tickets they own. The controller knows nothing about these domain rules.
4. **Relevant Code Location:**  
   - `apps/api/src/services/comments.service.ts` (lines 28–50)
5. **Short Interview-Style Answer:**  
   *"Business logic lives in services to decouple domain rules from HTTP transport details, enabling code reusability across interfaces and allowing fast, isolated unit testing with mocked repositories."*

---

### Question 3: Why should Prisma/database calls be isolated in repositories?

1. **Simple Beginner-Friendly Explanation:**  
   If you scatter database queries everywhere in your code, changing your database library or query structure requires changing dozens of files. A repository acts as a dedicated storage cabinet that handles all database reads and writes.
2. **Technical Explanation:**  
   The Repository Pattern isolates data access mechanisms from domain business logic. Repositories translate domain requests into ORM queries (Prisma `findMany`, `create`, `update`, `delete`) or SQL statements. If the underlying data store, table structure, or query optimization strategy changes, only the repository changes, leaving service business logic untouched. Furthermore, repositories can be easily substituted with mock objects in unit tests.
3. **SupportDesk Practical Example:**  
   `TicketsRepository.findMany()` builds the complex Prisma `where` clause with case-insensitive search and dynamic sorting. `TicketsService` simply calls `this.ticketsRepo.findMany(queryFilters)`.
4. **Relevant Code Location:**  
   - `apps/api/src/repositories/tickets.repository.ts` (lines 20–75)
5. **Short Interview-Style Answer:**  
   *"Isolating Prisma calls in repositories abstracts data persistence details from domain services, prevents leaky abstractions, and enables seamless repository mocking during unit testing."*

---

### Question 4: What is a database migration, and why should it be committed?

1. **Simple Beginner-Friendly Explanation:**  
   A migration is like a Git commit for your database structure. It records the exact changes (like adding a `Comment` table) in a readable SQL file so that everyone on your team has the exact same database setup.
2. **Technical Explanation:**  
   A migration is a version-controlled, deterministic script that transitions a database schema between states. Committing migrations ensures that local development databases, test runners, CI/CD pipelines, and production environments can be brought to the identical schema version in a predictable, auditable sequence.
3. **SupportDesk Practical Example:**  
   When the `Comment` model was introduced with foreign keys to `Ticket` and `User`, a Prisma migration recorded `CREATE TABLE "comments" (...)` with its foreign key constraints.
4. **Relevant Code Location:**  
   - `apps/api/prisma/schema.prisma` (lines 85–98)  
   - `apps/api/prisma/migrations/`
5. **Short Interview-Style Answer:**  
   *"A migration is a versioned script that modifies the database schema deterministically. It must be committed to Git so that all environments, from local dev to production, maintain an identical schema."*

---

### Question 5: What is the purpose of an index? Can too many indexes be harmful?

1. **Simple Beginner-Friendly Explanation:**  
   An index is like the index at the back of a book. Instead of reading every page to find a topic, you jump directly to the right page. Too many indexes are harmful because every time you add a new page (or record), you have to update every single index, which slows everything down.
2. **Technical Explanation:**  
   An index is an auxiliary data structure (typically a B-Tree) that allows the database engine to locate matching rows in $O(\log N)$ time rather than performing a sequential full table scan ($O(N)$). However, excessive indexes increase disk and memory usage, and they degrade write throughput (`INSERT`, `UPDATE`, `DELETE`) because every index must be modified whenever data changes.
3. **SupportDesk Practical Example:**  
   The `Ticket` model defines an index on `createdById` (`@@index([createdById])`), which accelerates queries when customers fetch their own tickets (`WHERE "createdById" = $1`).
4. **Relevant Code Location:**  
   - `apps/api/prisma/schema.prisma` (lines 79–82)
5. **Short Interview-Style Answer:**  
   *"Indexes accelerate query read performance by avoiding full table scans, but having too many indexes degrades write performance and increases memory consumption because every index must be maintained on every write."*

---

### Question 6: What is the difference between authentication and authorization?

1. **Simple Beginner-Friendly Explanation:**  
   **Authentication** is showing your passport to prove *who you are*. **Authorization** is checking whether your ticket allows you into the first-class lounge or only coach (*what you are allowed to do*).
2. **Technical Explanation:**  
   **Authentication (AuthN)** is the process of verifying a client's identity (e.g., verifying user credentials or validating a JWT signature). **Authorization (AuthZ)** determines whether the authenticated identity has sufficient permissions or roles to execute an operation on a target resource.
3. **SupportDesk Practical Example:**  
   `authenticate` middleware checks the JWT in the `Authorization: Bearer <token>` header to set `req.user` (Authentication). In `TicketsService.createTicket()`, the code checks `if (user.role === UserRole.CUSTOMER && input.assigneeId)` to throw `ForbiddenError` (Authorization).
4. **Relevant Code Location:**  
   - AuthN: `apps/api/src/middleware/auth.middleware.ts` (lines 13–55)  
   - AuthZ: `apps/api/src/services/tickets.service.ts` (lines 95–110)
5. **Short Interview-Style Answer:**  
   *"Authentication verifies the identity of the user, whereas authorization determines what actions that authenticated user is permitted to perform based on permissions or roles."*

---

### Question 7: What is the difference between HTTP 401 and 403?

1. **Simple Beginner-Friendly Explanation:**  
   **401 Unauthorized** means *"I don't know who you are; please log in."* **403 Forbidden** means *"I know who you are, but you do not have permission to access this."*
2. **Technical Explanation:**  
   **401 Unauthorized** indicates that the request lacks valid authentication credentials. **403 Forbidden** indicates that the server understands the authenticated client's identity, but refuses authorization because the client lacks the necessary privileges.
3. **SupportDesk Practical Example:**  
   Sending a request to `GET /api/v1/tickets` without a Bearer token returns `401 Unauthorized`. Sending a request as a `CUSTOMER` to `DELETE /api/v1/tickets/:id` returns `403 Forbidden`.
4. **Relevant Code Location:**  
   - `apps/api/src/errors/appError.ts` (UnauthorizedError: 401, ForbiddenError: 403)
5. **Short Interview-Style Answer:**  
   *"401 indicates missing or invalid authentication credentials, while 403 indicates that the user is authenticated but lacks permission to access the resource."*

---

### Question 8: Why should passwords be hashed with bcrypt instead of stored as plain text?

1. **Simple Beginner-Friendly Explanation:**  
   If an attacker steals your database, plain text passwords expose every user's secret. Bcrypt converts the password into an irreversible, scrambled string that cannot be turned back into the original password.
2. **Technical Explanation:**  
   Storing plain text or reversibly encrypted passwords exposes credentials during database compromises. Bcrypt is a one-way cryptographic hashing function incorporating a random salt (defending against rainbow table attacks) and an adjustable work factor (cost parameter) that slows down execution, making brute-force dictionary attacks computationally expensive.
3. **SupportDesk Practical Example:**  
   In `apps/api/src/utils/password.ts`, `hashPassword()` hashes passwords with a work factor of 12 rounds (`bcrypt.hash(password, 12)`).
4. **Relevant Code Location:**  
   - `apps/api/src/utils/password.ts` (lines 1–22)
5. **Short Interview-Style Answer:**  
   *"Passwords must be hashed with bcrypt because it provides a one-way, salted cryptographic hash with an adjustable computational work factor that resists rainbow table and brute-force attacks if the database is breached."*

---

### Question 9: What is a JWT, and how does the API verify it?

1. **Simple Beginner-Friendly Explanation:**  
   A JWT (JSON Web Token) is a digital ID badge signed by the server. It contains your user ID and role. When you present it, the server checks the digital signature using its secret key without needing to query the database.
2. **Technical Explanation:**  
   A JWT is a compact, URL-safe token format consisting of three parts separated by dots: Header, Payload, and Signature (`header.payload.signature`). The API verifies the token using the secret key (`JWT_SECRET`) and HMAC-SHA256 algorithm. The server recalculates the signature over the base64-encoded header and payload and compares it to the incoming signature, while verifying the token's expiration timestamp (`exp`).
3. **SupportDesk Practical Example:**  
   `apps/api/src/utils/jwt.ts` generates tokens with `jwt.sign(payload, env.JWT_SECRET, { expiresIn: "1d" })` and verifies them with `jwt.verify(token, env.JWT_SECRET)`.
4. **Relevant Code Location:**  
   - `apps/api/src/utils/jwt.ts` (lines 15–45)
5. **Short Interview-Style Answer:**  
   *"A JWT is a signed token containing user claims. The API verifies it by validating the digital signature using the server's secret key and confirming that the token has not expired."*

---

### Question 10: Why must a public registration endpoint not let users choose an elevated role?

1. **Simple Beginner-Friendly Explanation:**  
   If anyone registering on a website could pick *"Admin"*, any stranger could grant themselves full administrative control over all customer data and system settings.
2. **Technical Explanation:**  
   Allowing client payloads to specify user roles on public endpoints enables Mass Assignment privilege escalation. An attacker could register an account with `role: "ADMIN"` or `role: "AGENT"`. Public registration endpoints must strictly enforce the lowest privilege role at the server layer.
3. **SupportDesk Practical Example:**  
   In `apps/api/src/services/auth.service.ts:register()`, the role is explicitly hardcoded to `role: UserRole.CUSTOMER`. Any role provided in the payload is ignored.
4. **Relevant Code Location:**  
   - `apps/api/src/services/auth.service.ts` (lines 35–48)
5. **Short Interview-Style Answer:**  
   *"Public registration endpoints must strictly assign the default CUSTOMER role on the server to prevent privilege escalation attacks where malicious actors assign themselves ADMIN or AGENT roles."*

---

### Question 11: Why is customer ticket ownership enforced in backend queries instead of only in the UI?

1. **Simple Beginner-Friendly Explanation:**  
   A clever user can press F12 in their browser or use Postman to bypass whatever buttons or screens the UI hides. The backend must enforce the rule so the database never sends data that does not belong to them.
2. **Technical Explanation:**  
   Client-side controls can be easily bypassed by inspecting network traffic and sending handcrafted HTTP requests via tools like curl or Postman. Enforcing ownership in the backend repository/service query ensures that data isolation is guaranteed at the database query level, preventing Insecure Direct Object Reference (IDOR) vulnerabilities.
3. **SupportDesk Practical Example:**  
   In `apps/api/src/services/tickets.service.ts:listTickets()`, if `user.role === UserRole.CUSTOMER`, the service overrides any requested creator filter with `filters.createdById = user.id`.
4. **Relevant Code Location:**  
   - `apps/api/src/services/tickets.service.ts` (lines 35–45)
5. **Short Interview-Style Answer:**  
   *"Frontend controls are easily bypassed by direct API calls; enforcing ownership in backend queries guarantees data isolation at the database layer and prevents IDOR vulnerabilities."*

---

### Question 12: What are Helmet, CORS and rate limiting used for?

1. **Simple Beginner-Friendly Explanation:**  
   - **Helmet:** Adds safety locks (security headers) to your website responses.  
   - **CORS:** Decides which other websites are allowed to talk to your API.  
   - **Rate Limiting:** Prevents someone from spamming your login page a thousand times per second.
2. **Technical Explanation:**  
   - **Helmet:** Sets security-related HTTP headers (such as `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`) to protect against common web vulnerabilities like XSS, clickjacking, and MIME sniffing.  
   - **CORS (Cross-Origin Resource Sharing):** Controls which browser origins can access the API, preventing unauthorized cross-origin requests.  
   - **Rate Limiting:** Caps the number of requests an IP address can make in a given time window to protect against brute-force and Denial-of-Service (DoS) attacks.
3. **SupportDesk Practical Example:**  
   `app.use(helmet())`, `app.use(cors(corsOptions))`, and `apps/api/src/middleware/rateLimiter.ts` limits login attempts to 5 per 15 minutes per IP.
4. **Relevant Code Location:**  
   - `apps/api/src/app.ts` (lines 20–35)  
   - `apps/api/src/middleware/rateLimiter.ts` (lines 10–30)
5. **Short Interview-Style Answer:**  
   *"Helmet secures HTTP response headers, CORS restricts unauthorized browser origins from accessing resources, and rate limiting protects against brute-force and DoS attacks by throttling requests."*

---

### Question 13: What is pagination, and why is a maximum page size useful?

1. **Simple Beginner-Friendly Explanation:**  
   Pagination splits a massive list of 10,000 tickets into bite-sized pages of 20. A maximum page size prevents someone from requesting all 10,000 tickets at once, which could freeze the server.
2. **Technical Explanation:**  
   Pagination partitions query result sets using `take` (limit) and `skip` (offset) database operations. Enforcing a maximum limit (e.g. `limit <= 100`) prevents malicious or runaway client queries from consuming excessive server memory, saturating network bandwidth, or executing long-running table locks in the database.
3. **SupportDesk Practical Example:**  
   `apps/api/src/schemas/ticket.schema.ts` sets `.max(100)` on the `limit` query parameter.
4. **Relevant Code Location:**  
   - `apps/api/src/schemas/ticket.schema.ts` (lines 45–55)
5. **Short Interview-Style Answer:**  
   *"Pagination breaks large datasets into manageable chunks using take and skip. Capping the maximum page size protects server memory and database performance against resource exhaustion."*

---

### Question 14: What is the difference between filtering, searching and sorting?

1. **Simple Beginner-Friendly Explanation:**  
   - **Filtering:** Show me only tickets that are *"OPEN"*.  
   - **Searching:** Find any ticket where the text says *"printer"*.  
   - **Sorting:** Put the newest tickets at the top.
2. **Technical Explanation:**  
   - **Filtering:** Applies exact-match conditions on discrete column attributes (`WHERE status = 'OPEN'`).  
   - **Searching:** Evaluates pattern matching or substring comparison across text columns (`WHERE title ILIKE '%query%' OR description ILIKE '%query%'`).  
   - **Sorting:** Orders the resulting row set by designated columns in ascending or descending order (`ORDER BY "createdAt" DESC`).
3. **SupportDesk Practical Example:**  
   In `TicketsRepository.findMany()`, `where.status` applies an enum filter, `where.OR` applies a case-insensitive search on title and description, and `orderBy[sortBy] = sortOrder` applies sorting.
4. **Relevant Code Location:**  
   - `apps/api/src/repositories/tickets.repository.ts` (lines 35–65)
5. **Short Interview-Style Answer:**  
   *"Filtering applies exact-match criteria on specific fields, searching matches text patterns across narrative columns, and sorting arranges the returned records in ascending or descending sequence."*

---

### Question 15: What is OpenAPI, and why should /docs match the actual API?

1. **Simple Beginner-Friendly Explanation:**  
   OpenAPI is an instruction manual for your API that can be read by both humans and computers. If the manual does not match the real code, developers building mobile or web apps will use the wrong fields and their code will break.
2. **Technical Explanation:**  
   OpenAPI is a machine-readable specification standard (JSON/YAML) defining API endpoints, request schemas, response codes, headers, and security schemes. The `/docs` endpoint renders interactive Swagger UI documentation. If documentation drifts from actual runtime behavior, client integrations fail, SDK generation breaks, and developer productivity drops.
3. **SupportDesk Practical Example:**  
   `apps/api/src/docs/openapi.ts` defines OpenAPI 3.0.3 paths, and `tests/docs.spec.ts` verifies that documented query parameters match actual Zod schema enums.
4. **Relevant Code Location:**  
   - `apps/api/src/docs/openapi.ts`  
   - `apps/api/tests/docs.spec.ts`
5. **Short Interview-Style Answer:**  
   *"OpenAPI is a standardized contract describing REST APIs. Keeping /docs synchronized with the actual implementation ensures API consumers build against accurate contracts without runtime surprises."*

---

### Question 16: What is the difference between a unit test and an integration test?

1. **Simple Beginner-Friendly Explanation:**  
   A **unit test** tests a single Lego brick in isolation (checking if a calculation or rule works). An **integration test** snaps several bricks together to see if the whole castle holds up when connected to a real database.
2. **Technical Explanation:**  
   A **unit test** verifies an isolated function, method, or class in memory, replacing all external dependencies with test doubles (mocks/stubs) to test pure logic fast. An **integration test** verifies that multiple connected subsystems (HTTP routing, middleware, database ORM, PostgreSQL) work together correctly in an environment mirroring production.
3. **SupportDesk Practical Example:**  
   `tests/tickets.service.spec.ts` unit-tests `TicketsService` with a mocked repository. `tests/integration.spec.ts` sends real Supertest HTTP requests that persist data into `supportdesk_test` PostgreSQL.
4. **Relevant Code Location:**  
   - Unit: `apps/api/tests/tickets.service.spec.ts`  
   - Integration: `apps/api/tests/integration.spec.ts`
5. **Short Interview-Style Answer:**  
   *"A unit test verifies an isolated piece of logic using mocks, while an integration test validates that multiple real components, such as HTTP routes and the database, interact correctly together."*

---

### Question 17: Why are repositories mocked in service unit tests?

1. **Simple Beginner-Friendly Explanation:**  
   If unit tests needed a real database, running 100 tests would take minutes, fail if the internet is down, or break if another test changes the database. Mocking lets tests run in milliseconds without external dependencies.
2. **Technical Explanation:**  
   Mocking repositories isolates domain business logic from database availability, network latency, and test data state. It allows unit tests to execute deterministically in milliseconds, while making it trivial to simulate rare edge conditions (like database connection timeouts, unique constraint collisions, or missing records) without altering database state.
3. **SupportDesk Practical Example:**  
   In `tests/comments.spec.ts`, `mockTicketsRepo.findById.mockResolvedValueOnce(null)` simulates a missing ticket to verify that `CommentsService` throws `NotFoundError`.
4. **Relevant Code Location:**  
   - `apps/api/tests/comments.spec.ts` (lines 170–185)
5. **Short Interview-Style Answer:**  
   *"Repositories are mocked in service unit tests to isolate domain logic from the database, ensure millisecond test execution speed, and allow easy simulation of edge cases without database side effects."*

---

### Question 18: Why must integration tests use a dedicated test database?

1. **Simple Beginner-Friendly Explanation:**  
   Integration tests create, update, and wipe out data. If they ran against your normal development database, they would delete your test tickets and corrupt your local workspace.
2. **Technical Explanation:**  
   Integration tests perform state-mutating operations (`TRUNCATE`, `DELETE`, bulk inserts). Running them against development or production databases causes catastrophic data loss, pollutes seed data, and leads to non-deterministic test results due to preexisting records. A dedicated test database (`supportdesk_test`) guarantees test isolation and safety.
3. **SupportDesk Practical Example:**  
   `apps/api/src/config/database.ts:resolveDatabaseUrl()` requires `TEST_DATABASE_URL` pointing to `supportdesk_test` when `NODE_ENV === "test"`, preventing fallback to `DATABASE_URL`.
4. **Relevant Code Location:**  
   - `apps/api/src/config/database.ts` (lines 6–22)  
   - `apps/api/tests/helpers/testDb.ts` (lines 15–30)
5. **Short Interview-Style Answer:**  
   *"Integration tests must use a dedicated test database to prevent destructive operations like TRUNCATE from wiping development or production data, and to guarantee clean, deterministic test environments."*

---

### Question 19: What does 70% service coverage tell you, and what does it not tell you?

1. **Simple Beginner-Friendly Explanation:**  
   It tells you that 70% of the lines in your service files were touched during test execution. It does **not** tell you whether your tests checked the right things, tested security flaws, or verified edge cases.
2. **Technical Explanation:**  
   70% code coverage measures execution breadth: 70% of statements, branches, or functions were invoked during the test run. It does **not** measure test assertion quality, verification of security boundaries, handling of concurrency race conditions, or validation that the business logic satisfies stakeholder requirements. High coverage with poor assertions provides false confidence.
3. **SupportDesk Practical Example:**  
   A test could call `ticketsService.listTickets()` and achieve 100% line coverage without ever asserting that `createdById` was properly scoped to the customer's ID.
4. **Relevant Code Location:**  
   - `apps/api/src/services/tickets.service.ts`
5. **Short Interview-Style Answer:**  
   *"70% coverage indicates that 70% of code paths were executed during tests, but it does not guarantee assertion quality, edge-case coverage, or absence of security defects."*

---

### Question 20: What does Definition of Done mean, and why is passing tests only one part of it?

1. **Simple Beginner-Friendly Explanation:**  
   Passing tests is like baking a cake that didn't burn. Definition of Done means the cake is also frosted, tasted, boxed, labeled, and ready to be delivered to the customer.
2. **Technical Explanation:**  
   The Definition of Done (DoD) is a formal quality contract between engineering and stakeholders outlining all criteria a feature must fulfill before being marked complete. While passing tests verifies technical functionality, DoD also requires clean TypeScript compilation, peer code review approvals, zero security vulnerabilities (no leaked secrets), updated OpenAPI documentation, and verified integration against real infrastructure.
3. **SupportDesk Practical Example:**  
   For Day 11, the DoD required: passing unit and integration tests, zero TypeScript errors (`npm run typecheck`), OpenAPI documentation at `/docs`, dedicated test database isolation, and peer code review readiness.
4. **Relevant Code Location:**  
   - `docs/week-2/day-12/peer-review-checklist.md`
5. **Short Interview-Style Answer:**  
   *"The Definition of Done is the complete quality checklist required for production readiness. Passing tests only verifies functionality; DoD also encompasses peer review, security audits, type checking, and accurate documentation."*

