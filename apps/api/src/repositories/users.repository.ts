import { prisma } from "../config/database.js";
import { UserRole } from "../generated/prisma/enums.js";

export { UserRole };

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPasswordHash extends UserRecord {
  passwordHash: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
}

export class UsersRepository {
  /**
   * Finds a user by email with passwordHash included.
   * STRICTLY intended for authentication / credential verification.
   */
  async findByEmail(email: string): Promise<UserWithPasswordHash | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Finds a user by ID with passwordHash strictly excluded.
   * Safe for public/caller representations.
   */
  async findById(id: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Persists a new user record.
   * Returns safe representation excluding passwordHash.
   */
  async create(data: CreateUserData): Promise<UserRecord> {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role ?? UserRole.CUSTOMER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

export const usersRepository = new UsersRepository();

