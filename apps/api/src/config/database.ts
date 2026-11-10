import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

export function resolveDatabaseUrl(
  nodeEnv = process.env.NODE_ENV,
  testDbUrl = process.env.TEST_DATABASE_URL || env.TEST_DATABASE_URL
): string {
  if (nodeEnv === "test") {
    if (!testDbUrl || testDbUrl.trim().length === 0) {
      throw new Error(
        "[Database Safety Error] NODE_ENV is 'test' but TEST_DATABASE_URL is not configured. " +
        "Silently falling back to DATABASE_URL during test execution is strictly forbidden."
      );
    }
    return testDbUrl;
  }
  return env.DATABASE_URL;
}

const dbUrl = resolveDatabaseUrl();

const pool = new pg.Pool({
  connectionString: dbUrl,
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

export async function disconnectDatabase(): Promise<void> {
  let disconnectError: unknown;

  try {
    await prisma.$disconnect();
  } catch (err) {
    disconnectError = err;
    console.error("[Database] Error disconnecting Prisma client:", err);
  }

  try {
    await pool.end();
  } catch (err) {
    console.error("[Database] Error ending PostgreSQL pool:", err);
    if (!disconnectError) {
      disconnectError = err;
    }
  }

  if (disconnectError) {
    throw disconnectError;
  }
}
