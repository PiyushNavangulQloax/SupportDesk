# SupportDesk Day 21 — Redis Integration, Health Checks & Structured Logging

> **Document:** Distributed Rate Limiting, Dependency-Aware Health Probes & Centralized Logging Specification  
> **Date:** Friday, 20 November 2026  
> **Repository:** SupportDesk (Monorepo: `apps/api`, `apps/web`)  
> **Branch:** `feat/day-21-redis-health-logging`  
> **Base Branch:** `feat/day-20-docker-cicd`  
> **Author:** Antigravity Agent  
> **Status:** Production-Ready & Verified  

---

## 1. Executive Summary

Day 21 elevates SupportDesk from a containerized local environment to a resilient, production-ready distributed system. Prior to this milestone, rate limiting was stored in Node.js process memory (vulnerable to horizontal pod scaling and memory leaks), health checks were static without validating backing dependencies, and application logs relied on raw `console.log` statements without correlation IDs or credential redaction.

With Day 21 complete:
1. **Distributed Rate Limiting via Redis:** Implemented Redis-backed storage for perimeter authentication (`rl:login:`, 5 attempts per 15 minutes) and AI guardrails (`rl:ai:`, 10 requests per minute per user) using `ioredis` and `rate-limit-redis`. In production, the system strictly enforces distributed state and fails closed if Redis is unavailable.
2. **Centralized Structured Logging with Correlation:** Integrated `pino` and `pino-http` to generate high-performance JSON logs in production and colorized output in development. Standardized request correlation using `X-Request-Id` across all requests and responses, with deep automatic redaction of sensitive tokens, passwords, authorization headers, and API keys.
3. **Dependency-Aware Health Probes:** Re-architected `/health`, `/health/live`, and `/health/ready` to provide granular Kubernetes and orchestrator observability. Active health checks execute timeout-bounded probes against PostgreSQL (`SELECT 1`) and Redis (`PING`), returning HTTP 200 when all systems are operational and HTTP 503 when dependencies degrade.
4. **Resilient Teardown Lifecycle:** Enhanced graceful shutdown handlers (`SIGTERM` and `SIGINT`) to drain active HTTP requests, disconnect Prisma database pools, and safely close Redis sockets with fallback force-exit timers.

---

## 2. Distributed Architecture & Component Topology

```mermaid
graph TD
    subgraph Clients & Ingress
        Client["Web Client / Browser"]
        Orchestrator["Docker / Kubernetes Probes"]
    end

    subgraph SupportDesk API Gateway
        ReqLog["Request Logger (pino-http)<br/>Injects & Preserves X-Request-Id"]
        AuthRL["Login Rate Limiter<br/>Key: rl:login:&lt;ip&gt;"]
        AIRL["AI Rate Limiter<br/>Key: rl:ai:&lt;userId&gt;"]
        HealthRouter["Health Probes Controller<br/>/health | /health/live | /health/ready"]
        AppLogger["Pino Structured Logger<br/>Automated Field Redaction"]
    end

    subgraph Backing Infrastructure
        RedisDB[("Redis 7 (supportdesk-redis)<br/>Port: 6379<br/>Rate-Limit State & Caching")]
        PostgresDB[("PostgreSQL 16 (supportdesk-db)<br/>Port: 5432 / 5433<br/>Primary Datastore")]
    end

    Client -->|HTTP Request| ReqLog
    ReqLog --> AuthRL
    ReqLog --> AIRL
    AuthRL -->|Distributed Hits| RedisDB
    AIRL -->|Distributed Hits| RedisDB

    Orchestrator -->|GET /health/live| HealthRouter
    Orchestrator -->|GET /health/ready| HealthRouter
    HealthRouter -->|redis.ping()| RedisDB
    HealthRouter -->|prisma.$queryRaw'SELECT 1'| PostgresDB
    AppLogger -.->|JSON Logs + reqId| stdout
```

---

## 3. Distributed Rate Limiting Implementation

### 3.1 Redis Connection Management (`apps/api/src/config/redis.ts`)
The Redis client is managed via a singleton pattern using `ioredis`:
- **Connection Configuration:** Connects to `env.REDIS_URL` (defaulting to `redis://localhost:6379`).
- **Retry Strategy:** Implements exponential backoff with a cap of 2000ms. In unit testing environments, retries are disabled to prevent hanging processes.
- **Credential Sanitization:** Connection URLs containing embedded passwords (e.g., `redis://:secret@host:6379`) are sanitized with `sanitizeRedisUrl()` before logging or error reporting (`redis://:[REDACTED]@host:6379`).
- **Socket Unref in Testing:** Socket streams are marked `.unref()` in test environments, allowing Node.js test runners to exit cleanly without open handle warnings.

### 3.2 Perimeter & AI Rate Limiters
Rate limiting uses `express-rate-limit` combined with `rate-limit-redis`:
- **Login Rate Limiter (`apps/api/src/middleware/rateLimiter.ts`):**
  - **Prefix:** `rl:login:`
  - **Window:** 15 minutes (`15 * 60 * 1000`)
  - **Max Attempts:** 5 attempts per IP address
  - **Response:** HTTP 429 with standard error envelope:
    ```json
    {
      "data": null,
      "error": {
        "code": "TOO_MANY_REQUESTS",
        "message": "Too many login attempts from this IP, please try again after 15 minutes"
      },
      "meta": null
    }
    ```
- **AI Feature Rate Limiter (`apps/api/src/ai/guardrails/rateLimiter.ts`):**
  - **Prefix:** `rl:ai:`
  - **Window:** 1 minute (`60 * 1000`)
  - **Max Attempts:** 10 requests per authenticated user (falls back to client IP)
  - **Response:** HTTP 429 with `RATE_LIMIT_EXCEEDED` code and `retryAfterSeconds` details.

### 3.3 Fail-Closed Production Security Guarantee
To prevent accidental bypass of security controls during cluster partitions:
```typescript
export function createDistributedRateLimitStore(prefix: string): Store | undefined {
  if (env.NODE_ENV === "production" || process.env.ENABLE_REDIS_RATE_LIMIT === "true") {
    const client = getRedisClient();
    return new RedisStore({
      sendCommand: async (...args: string[]) => {
        if (client.status === "wait") {
          await client.connect();
        }
        return (client.call as any)(args[0], ...args.slice(1));
      },
      prefix,
    });
  }

  // Non-production fallback for isolated offline unit tests
  if (redisClient && redisClient.status === "ready") {
    return new RedisStore({
      sendCommand: async (...args: string[]) => {
        return (redisClient!.call as any)(args[0], ...args.slice(1));
      },
      prefix,
    });
  }

  return undefined;
}
```
In production, rate limiting **never** silently falls back to in-memory storage. If Redis is unreachable, requests fail safely and alert monitoring systems rather than allowing unbounded traffic.

---

## 4. Structured Application Logging & Request Correlation

### 4.1 Pino Configuration (`apps/api/src/config/logger.ts`)
Centralized logging provides machine-readable JSON logs for production aggregators (Datadog, CloudWatch, Loki) and colorized console output in development:
- **Timestamping:** ISO 8601 UTC strings (`pino.stdTimeFunctions.isoTime`).
- **Log Levels:** Configurable via `LOG_LEVEL` environment variable (`trace`, `debug`, `info`, `warn`, `error`). In test environments, defaults to `silent` unless explicitly overridden.
- **Deep Redaction Paths:** Comprehensive field redaction prevents leaking credentials into log indexes:
  - `req.headers.authorization`
  - `req.headers.cookie`
  - `req.body.password`
  - `req.body.passwordHash`
  - `*.token`
  - `*.apiKey`
  - `*.geminiApiKey`
  - `*.DATABASE_URL`
  - `*.REDIS_URL`

### 4.2 HTTP Request Logging Middleware (`apps/api/src/middleware/requestLogger.ts`)
Using `pino-http`, every incoming request is tracked and logged:
- **Request Correlation (`X-Request-Id`):** Checks for existing incoming header (e.g. from Cloudflare or AWS ALB); if missing, generates a standard UUID v4. The ID is set on the response headers (`res.setHeader('X-Request-Id', id)`) and attached to `req.id`.
- **Dynamic Log Levels:**
  - `5xx` / Server errors: Logged at `error` level.
  - `4xx` / Client errors: Logged at `warn` level.
  - `/health*` probes: Logged at `debug` level to prevent log pollution.
  - Normal operations: Logged at `info` level.
- **Performance Profiling:** Logs execution latency in milliseconds (`${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`).

### 4.3 Centralized Error Handling (`apps/api/src/middleware/errorHandler.ts`)
Standard Express error handler now logs structured error context with correlation:
- Operational `AppError` instances (4xx) are logged at `warn` level with `code`, `message`, and `reqId`.
- Unhandled runtime exceptions (5xx) are logged at `error` level with full sanitized error details and `reqId`.
- Response payloads strictly adhere to the `{ data, error, meta }` envelope, ensuring no stack traces or database errors reach the client.

---

## 5. Dependency-Aware Health Check Probes

SupportDesk implements a three-tier probe architecture (`apps/api/src/routes/health.routes.ts`):

| Endpoint | Probe Type | Purpose | Success Code | Failure Code |
| :--- | :--- | :--- | :--- | :--- |
| `GET /health` | Comprehensive | Detailed status of process and backing dependencies | `200 OK` | `503 Service Unavailable` |
| `GET /health/live` | Liveness | Verifies Express event loop is active and responsive | `200 OK` | Process Deadlock |
| `GET /health/ready` | Readiness | Verifies database and cache are ready for traffic | `200 OK` | `503 Service Unavailable` |

### 5.1 Active Dependency Verification
Each dependency probe is protected by a strict 2000ms timeout to prevent hanging connections during network brownouts:
- **PostgreSQL Check:** Executes `prisma.$queryRaw\`SELECT 1\``.
- **Redis Check:** Executes `redisClient.ping()` and asserts `"PONG"`.

### 5.2 Response Envelopes
#### Healthy State (`HTTP 200 OK`):
```json
{
  "data": {
    "status": "ok",
    "uptime": 142.5,
    "timestamp": "2026-11-20T08:08:14.000Z",
    "checks": {
      "database": {
        "status": "up",
        "latencyMs": 4
      },
      "redis": {
        "status": "up",
        "latencyMs": 2
      }
    }
  },
  "error": null,
  "meta": {}
}
```

#### Degraded State (`HTTP 503 Service Unavailable`):
```json
{
  "data": {
    "status": "degraded",
    "uptime": 145.2,
    "timestamp": "2026-11-20T08:08:16.000Z",
    "checks": {
      "database": {
        "status": "up",
        "latencyMs": 3
      },
      "redis": {
        "status": "down",
        "latencyMs": 2001,
        "error": "Redis connectivity check failed"
      }
    }
  },
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "One or more critical dependencies are unavailable"
  },
  "meta": {}
}
```

---

## 6. Verification and Test Results

### 6.1 Node Test Runner Suite (`npm --prefix apps/api run test:node`)
All 7 test files, 44 test suites, and 128 tests passed:
- `api.test.ts`: 39 tests passing (Perimeter routes, filtering, RBAC, health contract).
- `auth-middleware.test.ts`: 15 tests passing.
- `auth-mvc.test.ts`: 14 tests passing.
- `day10-env-auth-errors.test.ts`: 21 tests passing.
- `day10-password-jwt.test.ts`: 11 tests passing.
- `perimeter-security.test.ts`: 11 tests passing.
- `tickets-rbac.test.ts`: 17 tests passing.

### 6.2 Jest Test Suites (`npm --prefix apps/api run test:jest`)
All 12 test suites and 227 tests passed:
- `tests/health.logging.spec.ts`: Dedicated Day 21 suite verifying:
  - Structured logger configuration & URL password sanitization.
  - `X-Request-Id` generation and client header propagation.
  - `/health`, `/health/live`, and `/health/ready` probe responses.
  - Distributed Redis rate limiter store prefixing (`rl:test:`).
  - Direct Redis `PING` connectivity.
- `tests/ai.evaluation.spec.ts`: 100% passing.
- `tests/ai.guardrails.spec.ts`: 100% passing.
- `tests/ai.feature.spec.ts`: 100% passing.
- `tests/gemini.client.spec.ts`: 100% passing.
- `tests/integration.spec.ts`: Real PostgreSQL integration tests 100% passing.
- `tests/tickets.service.spec.ts`, `comments.spec.ts`, `auth.service.spec.ts`, `sanity.spec.ts`: 100% passing.

### 6.3 Frontend Vitest Suite (`npm --prefix apps/web test -- --run`)
All 12 test files and 183 tests passed:
- `CreateTicket.test.tsx`: 14 tests passing.
- `LoginPage.test.tsx`: 8 tests passing.
- `TicketList.test.tsx`: 16 tests passing.
- `TicketDetail.test.tsx`: 12 tests passing.
- `ai.features.test.tsx`: 16 tests passing.
- `components.ui.test.tsx`: 70 tests passing.
- All routing, auth, and query hook suites: 100% passing.

### 6.4 Static Analysis and Production Builds
- `apps/api`: TypeScript typecheck (`tsc --noEmit`) and build (`tsc -p tsconfig.json`) passed with 0 errors.
- `apps/web`: TypeScript typecheck (`tsc --noEmit`) and Vite production build (`vite build`) passed with 0 errors.

---

## 7. Deliverables & File Changes Summary

| File | Change Description |
| :--- | :--- |
| `apps/api/package.json` | Added `ioredis`, `rate-limit-redis`, `pino`, `pino-http`, and `pino-pretty`. |
| `apps/api/src/config/env.ts` | Added `REDIS_URL` and `LOG_LEVEL` environment variable schemas. |
| `apps/api/src/config/logger.ts` | Implemented centralized structured Pino logger with field redaction. |
| `apps/api/src/config/redis.ts` | Created Redis connection manager, health check probe, and distributed store factory. |
| `apps/api/src/middleware/requestLogger.ts` | Configured `pino-http` middleware with `X-Request-Id` propagation and route logging. |
| `apps/api/src/middleware/errorHandler.ts` | Updated error handler with structured logging and correlation ID tracking. |
| `apps/api/src/middleware/rateLimiter.ts` | Connected `createDistributedRateLimitStore("rl:login:")` to auth limiter. |
| `apps/api/src/ai/guardrails/rateLimiter.ts` | Connected `createDistributedRateLimitStore("rl:ai:")` to AI limiter. |
| `apps/api/src/routes/health.routes.ts` | Implemented dependency-aware `/health`, `/health/live`, and `/health/ready`. |
| `apps/api/src/config/database.ts` | Added safe cache disconnect to `disconnectDatabase()` lifecycle. |
| `apps/api/src/server.ts` | Replaced console logging with Pino and added graceful Redis disconnection. |
| `apps/api/tests/health.logging.spec.ts` | Automated test suite for health probes, logger redaction, and Redis stores. |
| `docs/week-4/day-21-redis-health-logging.md` | Comprehensive architectural documentation and verification report. |

---

## 8. Conclusion & Next Steps

Day 21 completes the operational triad: distributed rate limiting, structured logging with correlation, and dependency-aware health checks. The SupportDesk API is now fully instrumented for cluster deployment and container orchestration.

Next steps for Day 22:
- Implement metrics collection (Prometheus / OpenTelemetry) or automated performance benchmarking.
- Configure alert triggers for degraded health checks and rate limit violations.
