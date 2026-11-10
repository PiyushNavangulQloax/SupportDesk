/**
 * SupportDesk API — OpenAPI 3.0.3 Specification
 * Accurately reflects all registered routes, validation schemas,
 * security requirements, and standard { data, error, meta } envelopes.
 */
export const openapiSpecification = {
  openapi: "3.0.3",
  info: {
    title: "SupportDesk API",
    version: "1.0.0",
    description:
      "Enterprise Support Ticket and Customer Service Management REST API built with Node.js, Express, TypeScript, and Prisma ORM.",
    contact: {
      name: "SupportDesk Engineering Team",
      email: "support@supportdesk.internal",
    },
  },
  servers: [
    {
      url: "/",
      description: "SupportDesk Application Host",
    },
  ],
  tags: [
    { name: "System", description: "Health monitoring and diagnostics" },
    { name: "Authentication", description: "Registration and login operations" },
    { name: "Tickets", description: "Ticket management, filtering, search, and triage" },
    { name: "Comments", description: "Ticket conversation and internal staff notes" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Service Health Check",
        description: "Returns current API operational status, server uptime, and timestamp.",
        security: [], // Public endpoint
        responses: {
          200: {
            description: "Service is healthy and operating normally",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/HealthResponse",
                },
              },
            },
          },
        },
      },
    },

    "/api/v1/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register Customer Account",
        description:
          "Public registration for customer accounts. All registrations create CUSTOMER role users. Passwords are encrypted using bcrypt (12 rounds) and are never returned in responses.",
        security: [], // Public endpoint
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RegisterInput",
              },
            },
          },
        },
        responses: {
          201: {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AuthResponse",
                },
              },
            },
          },
          400: {
            description: "Validation error (invalid email format or password < 8 chars)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          409: {
            description: "Conflict (email address already registered)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
        },
      },
    },

    "/api/v1/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "User Login",
        description:
          "Authenticates user credentials and returns a signed HS256 JWT access token. Protected by strict rate-limiting (maximum 5 login attempts per 15 minutes per IP address).",
        security: [], // Public endpoint
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginInput",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Authentication successful",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AuthResponse",
                },
              },
            },
          },
          400: {
            description: "Validation error (missing or malformed email/password)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          401: {
            description:
              "Unauthorized (invalid email or password, anti-enumeration generic message)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          429: {
            description: "Too Many Requests (exceeded 5 attempts per 15 minutes)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
        },
      },
    },

    "/api/v1/tickets": {
      get: {
        tags: ["Tickets"],
        summary: "List Tickets with Filtering, Search, and Pagination",
        description:
          "Returns a paginated list of tickets. CUSTOMER users see only their own tickets. AGENT and ADMIN users see all tickets. Supports status/priority/assignee filtering, case-insensitive search, and allowlisted sorting.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            description: "Page number (minimum 1)",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            description: "Items per page (minimum 1, maximum 100)",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: "status",
            in: "query",
            description: "Filter by ticket status",
            schema: {
              type: "string",
              enum: ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"],
            },
          },
          {
            name: "priority",
            in: "query",
            description: "Filter by ticket priority",
            schema: {
              type: "string",
              enum: ["P1", "P2", "P3", "P4"],
            },
          },
          {
            name: "category",
            in: "query",
            description: "Filter by category name (case-insensitive substring)",
            schema: { type: "string" },
          },
          {
            name: "assigneeId",
            in: "query",
            description: "Filter by assigned agent user UUID",
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "search",
            in: "query",
            description: "Search keyword matching title or description (case-insensitive)",
            schema: { type: "string" },
          },
          {
            name: "sortBy",
            in: "query",
            description: "Sortable field from strict allowlist",
            schema: {
              type: "string",
              enum: ["createdAt", "updatedAt", "priority", "status", "title"],
              default: "createdAt",
            },
          },
          {
            name: "sortOrder",
            in: "query",
            description: "Sort direction",
            schema: {
              type: "string",
              enum: ["asc", "desc"],
              default: "desc",
            },
          },
        ],
        responses: {
          200: {
            description: "Paginated list of tickets",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TicketListResponse",
                },
              },
            },
          },
          400: {
            description: "Validation error (invalid query parameter)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          401: {
            description: "Unauthorized (missing or invalid Bearer token)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Tickets"],
        summary: "Create Ticket",
        description:
          "Creates a new support ticket. Ticket creator is strictly derived from authenticated JWT. CUSTOMER users cannot assign tickets during creation.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateTicketInput",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Ticket created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TicketSingleResponse",
                },
              },
            },
          },
          400: {
            description: "Validation error in request payload",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          403: {
            description: "Forbidden (Customer attempted to assign ticket)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
        },
      },
    },

    "/api/v1/tickets/{id}": {
      get: {
        tags: ["Tickets"],
        summary: "Get Ticket by ID",
        description:
          "Retrieves ticket details including relations. Returns 404 for inaccessible tickets if requested by CUSTOMER to prevent resource enumeration.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Ticket UUID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Ticket found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TicketSingleResponse",
                },
              },
            },
          },
          400: {
            description: "Validation error (invalid UUID format)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          404: {
            description: "Ticket not found or access denied for customer",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Tickets"],
        summary: "Update Ticket",
        description:
          "Updates ticket fields. CUSTOMER users can only update title and description on owned tickets. Only AGENT and ADMIN users can modify status and assigneeId.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Ticket UUID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateTicketInput",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Ticket updated successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TicketSingleResponse",
                },
              },
            },
          },
          400: {
            description: "Validation error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          403: {
            description: "Forbidden (Customer attempted to modify status or assignee)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          404: {
            description: "Ticket not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Tickets"],
        summary: "Delete Ticket (Admin Only)",
        description:
          "Permanently deletes a ticket. Strictly restricted to users with ADMIN role. Deletion fails if ticket has comments or attachments.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Ticket UUID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Ticket deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        deleted: { type: "boolean", example: true },
                      },
                    },
                    error: { type: "null" },
                    meta: { type: "object" },
                  },
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          403: {
            description: "Forbidden (Only administrators can delete tickets)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          404: {
            description: "Ticket not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
        },
      },
    },

    "/api/v1/tickets/{ticketId}/comments": {
      get: {
        tags: ["Comments"],
        summary: "List Comments for Ticket",
        description:
          "Lists comments in chronological order. CUSTOMER users see only public comments on their own tickets. AGENT and ADMIN users see both public comments and internal staff notes.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            description: "Parent ticket UUID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "List of comments",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CommentListResponse",
                },
              },
            },
          },
          400: {
            description: "Validation error (invalid ticketId UUID)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          404: {
            description: "Ticket not found or access denied for customer",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Comments"],
        summary: "Create Comment on Ticket",
        description:
          "Adds a comment to the specified ticket. Author is strictly derived from the authenticated JWT. CUSTOMER users can only create public comments on owned tickets. AGENT and ADMIN users can create public or internal notes.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            description: "Parent ticket UUID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateCommentInput",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Comment created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CommentSingleResponse",
                },
              },
            },
          },
          400: {
            description: "Validation error (empty body or exceeds 5000 characters)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          403: {
            description: "Forbidden (Customer attempted to create internal comment)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
          404: {
            description: "Ticket not found or access denied for customer",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorEnvelope",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "JSON Web Token using HS256 algorithm. Enter your token in the Authorization header as: Bearer <token>",
      },
    },
    schemas: {
      ErrorEnvelope: {
        type: "object",
        properties: {
          data: { type: "null", example: null },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Invalid request data" },
              details: {
                type: "array",
                items: { type: "object" },
                example: [{ path: "email", message: "Invalid email" }],
              },
            },
            required: ["code", "message"],
          },
          meta: { type: "object", example: {} },
        },
        required: ["data", "error", "meta"],
      },

      HealthResponse: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              status: { type: "string", example: "ok" },
              timestamp: { type: "string", format: "date-time" },
              uptime: { type: "number", example: 124.56 },
            },
            required: ["status", "timestamp", "uptime"],
          },
          error: { type: "null", example: null },
          meta: { type: "object", example: {} },
        },
        required: ["data", "error", "meta"],
      },

      RegisterInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          name: { type: "string", maxLength: 100, example: "John Doe" },
          email: { type: "string", format: "email", example: "customer@example.com" },
          password: {
            type: "string",
            format: "password",
            minLength: 8,
            example: "SecureP@ssw0rd123",
          },
        },
      },

      LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "customer@example.com" },
          password: {
            type: "string",
            format: "password",
            minLength: 1,
            example: "SecureP@ssw0rd123",
          },
        },
      },

      AuthUser: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", nullable: true, example: "John Doe" },
          email: { type: "string", format: "email", example: "customer@example.com" },
          role: {
            type: "string",
            enum: ["CUSTOMER", "AGENT", "ADMIN"],
            example: "CUSTOMER",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: ["id", "email", "role"],
      },

      AuthResponse: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              user: { $ref: "#/components/schemas/AuthUser" },
              accessToken: {
                type: "string",
                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              },
            },
            required: ["user", "accessToken"],
          },
          error: { type: "null", example: null },
          meta: { type: "object", example: {} },
        },
        required: ["data", "error", "meta"],
      },

      CreateTicketInput: {
        type: "object",
        required: ["title", "description"],
        properties: {
          title: { type: "string", minLength: 3, maxLength: 255, example: "Cannot access portal" },
          description: {
            type: "string",
            minLength: 5,
            example: "Getting 403 error when viewing my account invoice page.",
          },
          priority: {
            type: "string",
            enum: ["P1", "P2", "P3", "P4"],
            default: "P3",
          },
          category: { type: "string", maxLength: 100, example: "Billing" },
          assigneeId: {
            type: "string",
            format: "uuid",
            description: "Agent UUID (staff only)",
          },
          slaDueAt: { type: "string", format: "date-time" },
        },
      },

      UpdateTicketInput: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 3, maxLength: 255 },
          description: { type: "string", minLength: 5 },
          status: {
            type: "string",
            enum: ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"],
            description: "Staff only",
          },
          priority: { type: "string", enum: ["P1", "P2", "P3", "P4"] },
          category: { type: "string", maxLength: 100, nullable: true },
          assigneeId: { type: "string", format: "uuid", nullable: true, description: "Staff only" },
          slaDueAt: { type: "string", format: "date-time", nullable: true },
        },
      },

      Ticket: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string" },
          status: {
            type: "string",
            enum: ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"],
          },
          priority: { type: "string", enum: ["P1", "P2", "P3", "P4"] },
          category: { type: "string", nullable: true },
          createdById: { type: "string", format: "uuid" },
          assigneeId: { type: "string", format: "uuid", nullable: true },
          slaDueAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          createdBy: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              email: { type: "string", format: "email" },
            },
          },
          assignee: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              email: { type: "string", format: "email" },
            },
          },
        },
        required: ["id", "title", "description", "status", "priority", "createdById", "createdAt", "updatedAt"],
      },

      TicketSingleResponse: {
        type: "object",
        properties: {
          data: { $ref: "#/components/schemas/Ticket" },
          error: { type: "null", example: null },
          meta: { type: "object", example: {} },
        },
        required: ["data", "error", "meta"],
      },

      TicketListResponse: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Ticket" },
          },
          error: { type: "null", example: null },
          meta: {
            type: "object",
            properties: {
              pagination: {
                type: "object",
                properties: {
                  page: { type: "integer", example: 1 },
                  limit: { type: "integer", example: 20 },
                  total: { type: "integer", example: 50 },
                  totalPages: { type: "integer", example: 3 },
                },
                required: ["page", "limit", "total", "totalPages"],
              },
            },
            required: ["pagination"],
          },
        },
        required: ["data", "error", "meta"],
      },

      CreateCommentInput: {
        type: "object",
        required: ["body"],
        properties: {
          body: {
            type: "string",
            minLength: 1,
            maxLength: 5000,
            example: "We have deployed a hotfix for this issue.",
          },
          isInternal: {
            type: "boolean",
            default: false,
            description: "Staff only: internal note not visible to customers",
          },
        },
      },

      Comment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          ticketId: { type: "string", format: "uuid" },
          authorId: { type: "string", format: "uuid" },
          body: { type: "string" },
          isInternal: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          author: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              email: { type: "string", format: "email" },
              role: { type: "string", enum: ["CUSTOMER", "AGENT", "ADMIN"] },
            },
          },
        },
        required: ["id", "ticketId", "authorId", "body", "isInternal", "createdAt"],
      },

      CommentSingleResponse: {
        type: "object",
        properties: {
          data: { $ref: "#/components/schemas/Comment" },
          error: { type: "null", example: null },
          meta: { type: "object", example: {} },
        },
        required: ["data", "error", "meta"],
      },

      CommentListResponse: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Comment" },
          },
          error: { type: "null", example: null },
          meta: { type: "object", example: {} },
        },
        required: ["data", "error", "meta"],
      },
    },
  },
};

