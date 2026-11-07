import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
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
