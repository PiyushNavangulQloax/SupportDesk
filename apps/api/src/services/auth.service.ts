import {
  usersRepository,
  UsersRepository,
  type UserRecord,
  UserRole,
} from "../repositories/users.repository.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { generateToken } from "../utils/jwt.js";
import { ConflictError, UnauthorizedError } from "../errors/appError.js";
import type { RegisterInput, LoginInput } from "../schemas/auth.schema.js";

export interface AuthResult {
  user: UserRecord;
  accessToken: string;
}

export class AuthService {
  constructor(private readonly usersRepo: UsersRepository = usersRepository) {}

  /**
   * Registers a new customer account.
   * Public registration is strictly restricted to UserRole.CUSTOMER.
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // 1. Check for duplicate registration
    const existingUser = await this.usersRepo.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    // 2. Hash password with bcrypt (12 rounds)
    const passwordHash = await hashPassword(input.password);

    // 3. Persist user strictly with CUSTOMER role
    const user = await this.usersRepo.create({
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: UserRole.CUSTOMER,
    });

    // 4. Generate JWT access token with minimal claims
    const accessToken = generateToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    return {
      user,
      accessToken,
    };
  }

  /**
   * Authenticates an existing user.
   * Returns identical error message on unknown email or password mismatch
   * to prevent user enumeration attacks.
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // 1. Find user by email
    const userRecord = await this.usersRepo.findByEmail(normalizedEmail);
    if (!userRecord) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // 2. Constant-time bcrypt comparison
    const isPasswordValid = await comparePassword(input.password, userRecord.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // 3. Omit passwordHash from response
    const { passwordHash: _hash, ...safeUser } = userRecord;

    // 4. Generate JWT access token
    const accessToken = generateToken({
      userId: safeUser.id,
      role: safeUser.role,
      email: safeUser.email,
    });

    return {
      user: safeUser,
      accessToken,
    };
  }
}

export const authService = new AuthService();

