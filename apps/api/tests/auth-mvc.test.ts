import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AuthService } from "../src/services/auth.service.js";
import { AuthController } from "../src/controllers/auth.controller.js";
import {
  UsersRepository,
  type UserRecord,
  type UserWithPasswordHash,
  type CreateUserData,
  UserRole,
} from "../src/repositories/users.repository.js";
import { registerBodySchema, loginBodySchema } from "../src/schemas/auth.schema.js";
import { ConflictError, UnauthorizedError } from "../src/errors/appError.js";
import { verifyToken } from "../src/utils/jwt.js";
import { comparePassword } from "../src/utils/password.js";

/**
 * In-memory test double for UsersRepository to verify business rules,
 * security constraints, and authorization independently of database network state.
 */
class InMemoryUsersRepository extends UsersRepository {
  public store: Map<string, UserWithPasswordHash> = new Map();

  async findByEmail(email: string): Promise<UserWithPasswordHash | null> {
    for (const record of this.store.values()) {
      if (record.email.toLowerCase() === email.toLowerCase()) {
        return { ...record };
      }
    }
    return null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const record = this.store.get(id);
    if (!record) return null;
    const { passwordHash: _, ...safeUser } = record;
    return { ...safeUser };
  }

  async create(data: CreateUserData): Promise<UserRecord> {
    const id = `00000001-0000-0000-0000-${String(this.store.size + 1).padStart(12, "0")}`;
    const userWithHash: UserWithPasswordHash = {
      id,
      name: data.name,
      email: data.email,
      role: data.role ?? UserRole.CUSTOMER,
      passwordHash: data.passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.store.set(id, userWithHash);
    const { passwordHash: _, ...safeUser } = userWithHash;
    return { ...safeUser };
  }
}

describe("Day 10 — Authentication MVC Module Tests", () => {
  let mockRepo: InMemoryUsersRepository;
  let authService: AuthService;
  let authController: AuthController;

  beforeEach(() => {
    mockRepo = new InMemoryUsersRepository();
    authService = new AuthService(mockRepo);
    authController = new AuthController(authService);
  });

  describe("Auth Service: Registration Rules", () => {
    it("1. Valid registration creates a user and returns accessToken", async () => {
      const result = await authService.register({
        name: "Test User",
        email: "test.user@example.com",
        password: "Password123!",
      });

      assert.ok(result.user.id);
      assert.equal(result.user.name, "Test User");
      assert.equal(result.user.email, "test.user@example.com");
      assert.ok(result.accessToken);
      assert.equal(typeof result.accessToken, "string");
    });

    it("2. Duplicate registration throws ConflictError (409)", async () => {
      await authService.register({
        name: "First User",
        email: "duplicate@example.com",
        password: "Password123!",
      });

      await assert.rejects(
        async () => {
          await authService.register({
            name: "Second User",
            email: "DUPLICATE@example.com", // Verify case-insensitive check
            password: "Password123!",
          });
        },
        (err: unknown) => {
          assert.equal(err instanceof ConflictError, true);
          assert.equal((err as ConflictError).statusCode, 409);
          assert.equal((err as ConflictError).code, "CONFLICT");
          assert.equal((err as ConflictError).message, "User with this email already exists");
          return true;
        }
      );
    });

    it("3. Registration always creates CUSTOMER role by default", async () => {
      const result = await authService.register({
        name: "Customer User",
        email: "customer@example.com",
        password: "Password123!",
      });

      assert.equal(result.user.role, UserRole.CUSTOMER);
      assert.equal(mockRepo.store.get(result.user.id)?.role, UserRole.CUSTOMER);
    });

    it("4. Registration cannot create ADMIN or AGENT via client payload (Privilege Escalation Protection)", async () => {
      // Simulate client attempting to inject role into registration
      const maliciousPayload = {
        name: "Attacker",
        email: "attacker@example.com",
        password: "Password123!",
        role: "ADMIN" as any,
      };

      const result = await authService.register(maliciousPayload);

      // Verify the service strictly enforces CUSTOMER
      assert.equal(result.user.role, UserRole.CUSTOMER);
      assert.notEqual(result.user.role, "ADMIN");
      assert.equal(mockRepo.store.get(result.user.id)?.role, UserRole.CUSTOMER);
    });

    it("5. Password hash is stored correctly in database with bcrypt 12 rounds", async () => {
      const plainPassword = "SuperSecretPassword123!";
      const result = await authService.register({
        name: "Security User",
        email: "security@example.com",
        password: plainPassword,
      });

      const storedRecord = mockRepo.store.get(result.user.id);
      assert.ok(storedRecord);
      assert.ok(storedRecord.passwordHash);
      assert.notEqual(storedRecord.passwordHash, plainPassword);
      // Valid bcrypt hash format with 12 rounds
      assert.ok(storedRecord.passwordHash.startsWith("$2b$12$") || storedRecord.passwordHash.startsWith("$2a$12$"));

      const isMatch = await comparePassword(plainPassword, storedRecord.passwordHash);
      assert.equal(isMatch, true);
    });

    it("6. Password hash is strictly excluded from registration response", async () => {
      const result = await authService.register({
        name: "Leak Check User",
        email: "leak.check@example.com",
        password: "Password123!",
      });

      assert.equal("passwordHash" in result.user, false);
      assert.equal((result.user as any).password, undefined);
      assert.equal((result.user as any).passwordHash, undefined);
    });
  });

  describe("Auth Service: Login Rules", () => {
    const seedUser = {
      name: "Alice Moreau",
      email: "alice@example.com",
      password: "AlicePassword123!",
    };

    beforeEach(async () => {
      await authService.register(seedUser);
    });

    it("7. Valid login returns user details and accessToken", async () => {
      const result = await authService.login({
        email: "alice@example.com",
        password: "AlicePassword123!",
      });

      assert.ok(result.user);
      assert.equal(result.user.email, "alice@example.com");
      assert.equal(result.user.name, "Alice Moreau");
      assert.equal(result.user.role, UserRole.CUSTOMER);
      assert.ok(result.accessToken);
      assert.equal("passwordHash" in result.user, false);
    });

    it("8. Invalid password throws UnauthorizedError (401) with generic message", async () => {
      await assert.rejects(
        async () => {
          await authService.login({
            email: "alice@example.com",
            password: "WrongPassword!",
          });
        },
        (err: unknown) => {
          assert.equal(err instanceof UnauthorizedError, true);
          assert.equal((err as UnauthorizedError).statusCode, 401);
          assert.equal((err as UnauthorizedError).code, "UNAUTHORIZED");
          assert.equal((err as UnauthorizedError).message, "Invalid email or password");
          return true;
        }
      );
    });

    it("9. Unknown email throws UnauthorizedError (401) with identical generic message (Anti-Enumeration)", async () => {
      await assert.rejects(
        async () => {
          await authService.login({
            email: "unknown.user@example.com",
            password: "SomePassword123!",
          });
        },
        (err: unknown) => {
          assert.equal(err instanceof UnauthorizedError, true);
          assert.equal((err as UnauthorizedError).statusCode, 401);
          assert.equal((err as UnauthorizedError).code, "UNAUTHORIZED");
          assert.equal((err as UnauthorizedError).message, "Invalid email or password");
          return true;
        }
      );
    });

    it("10. JWT returned on successful login contains correct decoded claims", async () => {
      const result = await authService.login({
        email: "alice@example.com",
        password: "AlicePassword123!",
      });

      const decoded = verifyToken(result.accessToken);
      assert.equal(decoded.userId, result.user.id);
      assert.equal(decoded.email, "alice@example.com");
      assert.equal(decoded.role, UserRole.CUSTOMER);
    });
  });

  describe("Auth Controller & Response Envelope Consistency", () => {
    it("11. Controller formats registration response in standard { data, error, meta } envelope with 201", async () => {
      let capturedStatus: number | null = null;
      let capturedBody: any = null;

      const mockRes: any = {
        status(code: number) {
          capturedStatus = code;
          return this;
        },
        json(body: any) {
          capturedBody = body;
          return this;
        },
      };

      const mockReq: any = {
        body: {
          name: "Envelope Tester",
          email: "envelope@example.com",
          password: "Password123!",
        },
      };

      await authController.register(mockReq, mockRes, (() => {}) as any);

      assert.equal(capturedStatus, 201);
      assert.ok(capturedBody);
      assert.ok("data" in capturedBody);
      assert.ok("error" in capturedBody);
      assert.ok("meta" in capturedBody);
      assert.equal(capturedBody.error, null);
      assert.ok(capturedBody.data.user);
      assert.ok(capturedBody.data.accessToken);
      assert.equal("passwordHash" in capturedBody.data.user, false);
    });

    it("Controller formats login response in standard { data, error, meta } envelope with 200", async () => {
      await authService.register({
        name: "Login Envelope User",
        email: "login.envelope@example.com",
        password: "Password123!",
      });

      let capturedStatus: number | null = null;
      let capturedBody: any = null;

      const mockRes: any = {
        status(code: number) {
          capturedStatus = code;
          return this;
        },
        json(body: any) {
          capturedBody = body;
          return this;
        },
      };

      const mockReq: any = {
        body: {
          email: "login.envelope@example.com",
          password: "Password123!",
        },
      };

      await authController.login(mockReq, mockRes, (() => {}) as any);

      assert.equal(capturedStatus, 200);
      assert.ok(capturedBody);
      assert.ok("data" in capturedBody);
      assert.equal(capturedBody.error, null);
      assert.ok(capturedBody.meta);
      assert.equal(capturedBody.data.user.email, "login.envelope@example.com");
      assert.ok(capturedBody.data.accessToken);
    });
  });

  describe("Auth Zod Schemas Validation", () => {
    it("registerBodySchema validates valid registration payload", () => {
      const parsed = registerBodySchema.safeParse({
        name: "Jane Doe",
        email: "JANE.DOE@example.com",
        password: "Password123!",
      });

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.name, "Jane Doe");
        assert.equal(parsed.data.email, "jane.doe@example.com"); // normalized lowercase
      }
    });

    it("registerBodySchema rejects passwords shorter than 8 characters", () => {
      const parsed = registerBodySchema.safeParse({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "short",
      });

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.issues.some((i) => i.path.includes("password")));
      }
    });

    it("registerBodySchema rejects invalid email formats", () => {
      const parsed = registerBodySchema.safeParse({
        name: "Jane Doe",
        email: "not-an-email",
        password: "Password123!",
      });

      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.ok(parsed.error.issues.some((i) => i.path.includes("email")));
      }
    });

    it("loginBodySchema validates valid login payload", () => {
      const parsed = loginBodySchema.safeParse({
        email: "USER@EXAMPLE.COM",
        password: "MyPassword!",
      });

      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.email, "user@example.com");
      }
    });

    it("loginBodySchema rejects empty password", () => {
      const parsed = loginBodySchema.safeParse({
        email: "user@example.com",
        password: "",
      });

      assert.equal(parsed.success, false);
    });
  });
});

