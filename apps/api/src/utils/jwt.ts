import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { UnauthorizedError } from "../errors/appError.js";
import { UserRole } from "../generated/prisma/enums.js";

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface VerifiedTokenPayload extends AuthTokenPayload {
  iat: number;
  exp: number;
}

export const JWT_ALGORITHM = "HS256";

/**
 * Generates a signed JWT access token containing minimal approved user claims.
 * Uses validated env.JWT_SECRET, configured expiry (default: 1d), and HS256 algorithm.
 */
export function generateToken(payload: AuthTokenPayload): string {
  const signOptions: jwt.SignOptions = {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  };

  return jwt.sign(
    {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
    },
    env.JWT_SECRET,
    signOptions
  );
}

/**
 * Verifies a JWT token ensuring valid signature, expiry, and HS256 algorithm.
 * Rejects malformed, invalid, expired, and unsigned tokens.
 * Converts verification failures to safe UnauthorizedError.
 */
export function verifyToken(token: string): VerifiedTokenPayload {
  if (!token || typeof token !== "string") {
    throw new UnauthorizedError("Authentication token is missing or malformed");
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
    });

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("userId" in decoded) ||
      !("role" in decoded) ||
      !("email" in decoded)
    ) {
      throw new UnauthorizedError("Invalid token payload structure");
    }

    const { userId, role, email, iat, exp } = decoded as Record<string, unknown>;

    if (
      typeof userId !== "string" ||
      userId.trim().length === 0 ||
      typeof email !== "string" ||
      email.trim().length === 0
    ) {
      throw new UnauthorizedError("Invalid token claims: userId and email must be non-empty strings");
    }

    const validRoles = Object.values(UserRole) as string[];
    if (typeof role !== "string" || !validRoles.includes(role)) {
      throw new UnauthorizedError("Invalid token role claim: not a valid UserRole");
    }

    if (
      typeof iat !== "number" ||
      typeof exp !== "number" ||
      !Number.isFinite(iat) ||
      !Number.isFinite(exp)
    ) {
      throw new UnauthorizedError("Invalid token claims: numeric finite iat and exp timestamps required");
    }

    if (exp <= iat) {
      throw new UnauthorizedError("Invalid token claims: exp must be later than iat");
    }

    return {
      userId,
      role: role as UserRole,
      email,
      iat,
      exp,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      throw err;
    }
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Authentication token has expired", {
        expiredAt: err.expiredAt,
      });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError("Invalid authentication token");
    }
    throw new UnauthorizedError("Authentication verification failed");
  }
}

