import { prisma } from "../../src/config/database.js";
import { env } from "../../src/config/env.js";
import { hashPassword } from "../../src/utils/password.js";
import { generateToken } from "../../src/utils/jwt.js";
import { UserRole, TicketStatus, TicketPriority } from "../../src/generated/prisma/enums.js";

/**
 * Asserts that the active database is the isolated test database.
 * Prevents accidental execution against development or production databases.
 */
export function assertTestDatabase(): void {
  const activeUrl =
    process.env.NODE_ENV === "test" && (process.env.TEST_DATABASE_URL || env.TEST_DATABASE_URL)
      ? (process.env.TEST_DATABASE_URL || env.TEST_DATABASE_URL)!
      : env.DATABASE_URL;

  let dbName: string;
  try {
    const parsedUrl = new URL(activeUrl);
    dbName = parsedUrl.pathname.replace(/^\//, "");
  } catch {
    throw new Error("[SAFETY CHECK FAILED] Invalid active database connection string structure.");
  }

  if (dbName !== "supportdesk_test") {
    throw new Error(
      `[SAFETY CHECK FAILED] Refusing to run integration tests against database "${dbName}". ` +
      `Target database must be strictly "supportdesk_test".`
    );
  }
}

/**
 * Cleanly truncates all domain data tables in the isolated test database.
 */
export async function cleanTestDatabase(): Promise<void> {
  assertTestDatabase();
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "comments", "tickets", "audit_logs", "users" CASCADE;'
  );
}

export interface CreateTestUserData {
  id?: string;
  name?: string;
  email: string;
  password?: string;
  role?: UserRole;
}

export async function createTestUser(data: CreateTestUserData) {
  assertTestDatabase();
  const password = data.password ?? "P@ssword123!";
  const passwordHash = await hashPassword(password);

  return prisma.user.create({
    data: {
      ...(data.id ? { id: data.id } : {}),
      name: data.name ?? "Test User",
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role ?? UserRole.CUSTOMER,
    },
  });
}

export interface CreateTestTicketData {
  id?: string;
  title: string;
  description: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string;
  createdById: string;
  assigneeId?: string | null;
}

export async function createTestTicket(data: CreateTestTicketData) {
  assertTestDatabase();
  return prisma.ticket.create({
    data: {
      ...(data.id ? { id: data.id } : {}),
      title: data.title,
      description: data.description,
      status: data.status ?? TicketStatus.OPEN,
      priority: data.priority ?? TicketPriority.P3,
      category: data.category ?? "General",
      createdById: data.createdById,
      assigneeId: data.assigneeId ?? null,
    },
  });
}

export interface CreateTestCommentData {
  id?: string;
  ticketId: string;
  authorId: string;
  body: string;
  isInternal?: boolean;
}

export async function createTestComment(data: CreateTestCommentData) {
  assertTestDatabase();
  return prisma.comment.create({
    data: {
      ...(data.id ? { id: data.id } : {}),
      ticketId: data.ticketId,
      authorId: data.authorId,
      body: data.body,
      isInternal: data.isInternal ?? false,
    },
  });
}

export function createAuthHeaders(user: { id: string; email: string; role: UserRole }): {
  Authorization: string;
} {
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  return {
    Authorization: `Bearer ${token}`,
  };
}

