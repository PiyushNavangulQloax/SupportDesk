import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";
import { UnauthorizedError, ForbiddenError } from "../errors/appError.js";
import { UserRole } from "../generated/prisma/enums.js";

export { UserRole };

/**
 * Middleware that authenticates incoming requests via JWT Bearer token in Authorization header.
 * Attaches the verified user context { id, email, role } to req.user.
 * Passes UnauthorizedError (401) to next() for missing, malformed, invalid, or expired tokens.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError("Authorization header is missing");
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      throw new UnauthorizedError("Malformed authorization header: format must be Bearer <token>");
    }

    const token = parts[1].trim();
    if (!token) {
      throw new UnauthorizedError("Malformed authorization header: token is missing");
    }

    const payload = verifyToken(token);

    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware factory that enforces Role-Based Access Control (RBAC).
 * Must be executed after `authenticate`.
 * Returns 401 if no authenticated user exists.
 * Returns 403 if the user's role is not within allowedRoles.
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required: no authenticated user found");
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new ForbiddenError(
          `Access forbidden: user role '${req.user.role}' is not permitted to access this resource`,
          { requiredRoles: allowedRoles, currentRole: req.user.role }
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
