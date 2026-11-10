import bcrypt from "bcrypt";

export const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hashes a plain-text password using bcrypt with an appropriate work factor (12 rounds).
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
}

/**
 * Securely compares a plain-text password against a stored bcrypt hash.
 * Never logs or exposes password hashes or raw passwords.
 */
export async function comparePassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

