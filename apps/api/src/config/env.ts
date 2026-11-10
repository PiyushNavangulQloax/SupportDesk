import "dotenv/config";
import { z } from "zod";

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    TEST_DATABASE_URL: z.string().optional(),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
    JWT_EXPIRES_IN: z.string().min(1, "JWT_EXPIRES_IN cannot be empty").default("1d"),
    CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN cannot be empty").default("http://localhost:5173"),
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === "production") {
        return data.CORS_ORIGIN !== "*";
      }
      return true;
    },
    {
      message: "Wildcard CORS origin ('*') is not allowed in production",
      path: ["CORS_ORIGIN"],
    }
  );

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const sanitizedErrors = parsed.error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
  console.error("❌ Invalid environment variables:", JSON.stringify(sanitizedErrors, null, 2));
  throw new Error("Invalid environment configuration. Please check your .env file.");
}

if (
  parsed.data.NODE_ENV === "test" &&
  (!parsed.data.TEST_DATABASE_URL || parsed.data.TEST_DATABASE_URL.trim().length === 0)
) {
  const sanitizedErrors = [
    {
      field: "TEST_DATABASE_URL",
      message: "TEST_DATABASE_URL is required when NODE_ENV is 'test'",
    },
  ];
  console.error("❌ Invalid environment variables:", JSON.stringify(sanitizedErrors, null, 2));
  throw new Error("Invalid environment configuration. Please check your .env file.");
}

export const env = parsed.data;
