import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { AuthService } from "../src/services/auth.service.js";
import { UsersRepository } from "../src/repositories/users.repository.js";
import { UserRole } from "../src/generated/prisma/enums.js";
import { ConflictError, UnauthorizedError } from "../src/errors/appError.js";
import { hashPassword } from "../src/utils/password.js";

describe("AuthService Unit Tests (Jest)", () => {
  let mockUsersRepo: jest.Mocked<UsersRepository>;
  let authService: AuthService;

  beforeEach(() => {
    mockUsersRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    authService = new AuthService(mockUsersRepo);
  });

  describe("register", () => {
    it("throws ConflictError if email is already registered", async () => {
      mockUsersRepo.findByEmail.mockResolvedValueOnce({
        id: "user-1",
        name: "Existing User",
        email: "existing@example.com",
        passwordHash: "$2b$12$...",
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.register({
          name: "New User",
          email: "existing@example.com",
          password: "SecurePassword123!",
        })
      ).rejects.toThrow(ConflictError);
    });

    it("hashes password, creates user with CUSTOMER role, and returns access token", async () => {
      mockUsersRepo.findByEmail.mockResolvedValueOnce(null);
      mockUsersRepo.create.mockResolvedValueOnce({
        id: "new-user-id",
        name: "John Customer",
        email: "john@example.com",
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await authService.register({
        name: "John Customer",
        email: "john@example.com",
        password: "SecurePassword123!",
      });

      expect(mockUsersRepo.create).toHaveBeenCalledWith({
        name: "John Customer",
        email: "john@example.com",
        passwordHash: expect.any(String),
        role: UserRole.CUSTOMER,
      });
      expect(result.user.id).toBe("new-user-id");
      expect(result.accessToken).toBeDefined();
    });
  });

  describe("login", () => {
    it("throws UnauthorizedError if user is not found by email", async () => {
      mockUsersRepo.findByEmail.mockResolvedValueOnce(null);

      await expect(
        authService.login({
          email: "unknown@example.com",
          password: "password123",
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it("throws UnauthorizedError if password comparison fails", async () => {
      const realHash = await hashPassword("correctpassword");
      mockUsersRepo.findByEmail.mockResolvedValueOnce({
        id: "user-1",
        name: "User",
        email: "user@example.com",
        passwordHash: realHash,
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.login({
          email: "user@example.com",
          password: "wrongpassword",
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it("authenticates valid credentials and returns safe user and token", async () => {
      const realHash = await hashPassword("correctpassword");
      mockUsersRepo.findByEmail.mockResolvedValueOnce({
        id: "user-1",
        name: "Valid User",
        email: "valid@example.com",
        passwordHash: realHash,
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.login({
        email: "valid@example.com",
        password: "correctpassword",
      });

      expect(result.user).toEqual({
        id: "user-1",
        name: "Valid User",
        email: "valid@example.com",
        role: UserRole.CUSTOMER,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.accessToken).toBeDefined();
    });
  });
});
