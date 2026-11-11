# Postman API Demonstration Guide
**SupportDesk — Week 2 Day 6 (Day 12)**

---

## 1. Overview and Setup

This document provides a comprehensive runbook for demonstrating the secured SupportDesk REST API in Postman or via `curl`. It covers every implemented route across authentication, role-based access control (RBAC), ticket querying, comment management, and OpenAPI interactive documentation.

### Base Environment Configuration
Configure the following collection variables in Postman:

| Variable Name | Initial Value | Description |
|:---|:---|:---|
| `baseUrl` | `http://localhost:5000` | SupportDesk API Base URL |
| `customerToken` | *(empty)* | Populated after Customer Login |
| `agentToken` | *(empty)* | Populated after Agent Login |
| `adminToken` | *(empty)* | Populated after Admin Login |
| `createdTicketId` | *(empty)* | UUID of ticket created by customer |

---

## 2. Standard Response Envelope Format

All endpoints in the SupportDesk API return a standardized response envelope:

### Success Response (`200 OK`, `201 Created`):
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

### Error Response (`400`, `401`, `403`, `404`, `409`, `500`):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication token required or invalid"
  }
}
```

---

## 3. Step-by-Step API Demonstration Scenarios

### Scenario 1: Authentication & Perimeter Security

#### 1.1 Customer Registration
- **Method & URL:** `POST {{baseUrl}}/api/v1/auth/register`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "name": "Jane Customer",
  "email": "jane.customer@example.com",
  "password": "SecurePassword123!"
}
```
- **Expected Status:** `201 Created`
- **Verification Points:**
  - `data.user.role` is strictly `"CUSTOMER"`.
  - `data.accessToken` is returned.
  - **Security Check:** Verify that `passwordHash` is **never** present in `data.user`.

#### 1.2 Customer Login
- **Method & URL:** `POST {{baseUrl}}/api/v1/auth/login`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "email": "jane.customer@example.com",
  "password": "SecurePassword123!"
}
```
- **Expected Status:** `200 OK`
- **Action:** Save returned `data.accessToken` into Postman variable `{{customerToken}}`.

#### 1.3 Unauthenticated Access Attempt (401 Unauthorized)
- **Method & URL:** `GET {{baseUrl}}/api/v1/tickets`
- **Headers:** *(Omit Authorization header)*
- **Expected Status:** `401 Unauthorized`
- **Verification Response:**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication token required"
  }
}
```

#### 1.4 Rate Limiter Verification (Strict 5 Attempts / 15 Minutes)
- **Method & URL:** `POST {{baseUrl}}/api/v1/auth/login` with incorrect password 6 times consecutively.
- **Expected Status:** `429 Too Many Requests` on the 6th attempt.
- **Verification Response:** Error code `TOO_MANY_REQUESTS` indicates brute-force protection is active.

---

### Scenario 2: Ticket Operations & Customer Data Isolation

#### 2.1 Customer Creates a Support Ticket
- **Method & URL:** `POST {{baseUrl}}/api/v1/tickets`
- **Headers:**
  - `Authorization: Bearer {{customerToken}}`
  - `Content-Type: application/json`
- **Body:**
```json
{
  "title": "VPN Disconnecting Intermittently",
  "description": "Every 15 minutes the corporate VPN client drops connectivity while on office Wi-Fi.",
  "priority": "P2",
  "category": "Network"
}
```
- **Expected Status:** `201 Created`
- **Action:** Store `data.id` in `{{createdTicketId}}`.
- **Verification Points:**
  - `createdById` equals the customer's authenticated user ID.
  - Status defaults to `"OPEN"`.

#### 2.2 Customer Privilege Escalation Rejection (403 Forbidden)
- **Method & URL:** `POST {{baseUrl}}/api/v1/tickets`
- **Headers:** `Authorization: Bearer {{customerToken}}`
- **Body:**
```json
{
  "title": "Hardware Request",
  "description": "Need new keyboard",
  "assigneeId": "00000000-0000-0000-0000-000000000001"
}
```
- **Expected Status:** `403 Forbidden`
- **Verification Response:**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "Customers are not permitted to assign tickets"
  }
}
```

#### 2.3 Customer Scoped Ticket Listing (Data Isolation)
- **Method & URL:** `GET {{baseUrl}}/api/v1/tickets`
- **Headers:** `Authorization: Bearer {{customerToken}}`
- **Expected Status:** `200 OK`
- **Verification Points:** Every ticket returned in `data.tickets` has `createdById === customer.id`. Tickets created by other users are excluded.

#### 2.4 Anti-Enumeration Protection (404 for Foreign Tickets)
- **Method & URL:** `GET {{baseUrl}}/api/v1/tickets/00000000-0000-0000-0000-999999999999`
- **Headers:** `Authorization: Bearer {{customerToken}}`
- **Expected Status:** `404 Not Found`
- **Verification Points:** Returns `404` rather than `403`, preventing attackers from enumerating valid ticket IDs across customers.

---

### Scenario 3: Advanced Ticket Querying (Agent / Admin View)

#### 3.1 Pagination and Filtering by Status & Priority
- **Method & URL:** `GET {{baseUrl}}/api/v1/tickets?status=OPEN&priority=P2&page=1&limit=10`
- **Headers:** `Authorization: Bearer {{agentToken}}`
- **Expected Status:** `200 OK`
- **Verification Response:**
```json
{
  "success": true,
  "data": {
    "tickets": [ ... ]
  },
  "error": null,
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

#### 3.2 Substring Search Across Title and Description
- **Method & URL:** `GET {{baseUrl}}/api/v1/tickets?search=Disconnecting`
- **Headers:** `Authorization: Bearer {{agentToken}}`
- **Expected Status:** `200 OK`
- **Verification Points:** Matches tickets containing "Disconnecting" in either `title` or `description`.

#### 3.3 Allowlisted Dynamic Sorting
- **Method & URL:** `GET {{baseUrl}}/api/v1/tickets?sortBy=createdAt&sortOrder=desc`
- **Headers:** `Authorization: Bearer {{agentToken}}`
- **Expected Status:** `200 OK`

#### 3.4 Invalid Sort Field Rejection
- **Method & URL:** `GET {{baseUrl}}/api/v1/tickets?sortBy=unapprovedField`
- **Headers:** `Authorization: Bearer {{agentToken}}`
- **Expected Status:** `400 Bad Request` (Zod schema validation rejects non-allowlisted sort fields).

---

### Scenario 4: Comments API & Visibility Boundaries

#### 4.1 Customer Creates a Public Comment
- **Method & URL:** `POST {{baseUrl}}/api/v1/tickets/{{createdTicketId}}/comments`
- **Headers:**
  - `Authorization: Bearer {{customerToken}}`
  - `Content-Type: application/json`
- **Body:**
```json
{
  "body": "Tested with an Ethernet cable and the connection remains stable.",
  "isInternal": false
}
```
- **Expected Status:** `201 Created`
- **Verification Points:**
  - `data.authorId` is bound to the customer's authenticated user ID.
  - `data.isInternal` is `false`.

#### 4.2 Customer Prevented from Creating Internal Note (403 Forbidden)
- **Method & URL:** `POST {{baseUrl}}/api/v1/tickets/{{createdTicketId}}/comments`
- **Headers:** `Authorization: Bearer {{customerToken}}`
- **Body:**
```json
{
  "body": "Attempting to create internal note",
  "isInternal": true
}
```
- **Expected Status:** `403 Forbidden`
- **Verification Response:** Error code `FORBIDDEN`.

#### 4.3 Agent Creates an Internal Comment
- **Method & URL:** `POST {{baseUrl}}/api/v1/tickets/{{createdTicketId}}/comments`
- **Headers:**
  - `Authorization: Bearer {{agentToken}}`
  - `Content-Type: application/json`
- **Body:**
```json
{
  "body": "Known issue with 802.1X supplicant on macOS 15.1. Pushing configuration profile fix.",
  "isInternal": true
}
```
- **Expected Status:** `201 Created`
- **Verification Points:** `isInternal` is `true`.

#### 4.4 Comment Visibility Verification (Customer vs. Agent)
- **Test 1 (Customer Listing):** Call `GET {{baseUrl}}/api/v1/tickets/{{createdTicketId}}/comments` with `{{customerToken}}`.
  - **Result:** Returns **1 comment** (public only). The internal comment is completely excluded from the response payload.
- **Test 2 (Agent Listing):** Call `GET {{baseUrl}}/api/v1/tickets/{{createdTicketId}}/comments` with `{{agentToken}}`.
  - **Result:** Returns **2 comments** (both public and internal comments are visible).

---

### Scenario 5: OpenAPI Documentation & System Health

#### 5.1 Interactive Swagger UI Documentation
- **Method & URL:** `GET {{baseUrl}}/docs` (Open in Browser)
- **Expected Status:** `200 OK`
- **Verification Points:**
  - Swagger UI renders with title: **SupportDesk REST API Documentation**.
  - All endpoints under Auth, Tickets, Comments, and Health are listed.
  - Interactive "Try it out" and Bearer Authorization modal are operational.

#### 5.2 Raw OpenAPI Specification
- **Method & URL:** `GET {{baseUrl}}/docs/openapi.json`
- **Expected Status:** `200 OK`
- **Verification Points:** Returns valid OpenAPI 3.0.3 specification in JSON format.

#### 5.3 System Health Check
- **Method & URL:** `GET {{baseUrl}}/health`
- **Expected Status:** `200 OK`
- **Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-11-11T15:15:00.000Z"
}
```

