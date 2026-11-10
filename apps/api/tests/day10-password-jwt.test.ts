import { describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { hashPassword, comparePassword, BCRYPT_SALT_ROUNDS } from "../src/utils/password.js";
import { generateToken, verifyToken, JWT_ALGORITHM } from "../src/utils/jwt.js";
import { UserRole } from "../src/generated/prisma/enums.js";
import { UnauthorizedError } from "../src/errors/appError.js";
import { env } from "../src/config/env.js";

describe("Day 10 — Password Hashing & JWT Utilities", () => {
  describe("Password Utilities (bcrypt)", () => {
    it("1. Password hashes successfully", async () => {
      const plainPassword = "SuperSecurePassword123!";
      const hash = await hashPassword(plainPassword);

      assert.ok(hash);
      assert.equal(typeof hash, "string");
      assert.ok(hash.length >= 50);
    });

    it("2. Hash differs from plain password and uses correct work factor (12 rounds)", async () => {
      const plainPassword = "SuperSecurePassword123!";
      const hash = await hashPassword(plainPassword);

      assert.notEqual(hash, plainPassword);
      // Bcrypt hash identifier $2b$ or $2a$ followed by salt rounds (12)
      assert.ok(
        hash.startsWith(`$2b$${BCRYPT_SALT_ROUNDS}$`) || hash.startsWith(`$2a$${BCRYPT_SALT_ROUNDS}$`),
        `Hash should use ${BCRYPT_SALT_ROUNDS} rounds, got: ${hash.slice(0, 7)}`
      );
    });

    it("3. Correct password comparison returns true", async () => {
      const plainPassword = "CorrectPassword123!";
      const hash = await hashPassword(plainPassword);

      const isMatch = await comparePassword(plainPassword, hash);
      assert.equal(isMatch, true);
    });

    it("4. Incorrect password comparison returns false", async () => {
      const plainPassword = "CorrectPassword123!";
      const hash = await hashPassword(plainPassword);

      const isMatch = await comparePassword("WrongPassword123!", hash);
      assert.equal(isMatch, false);
    });
  });

  describe("JWT Utilities (jsonwebtoken)", () => {
    const samplePayload = {
      userId: "00000001-0000-0000-0000-000000000001",
      role: UserRole.CUSTOMER,
      email: "alice.moreau@example.com",
    };

    it("5. Valid token generation produces a non-empty string", () => {
      const token = generateToken(samplePayload);

      assert.ok(token);
      assert.equal(typeof token, "string");
      assert.equal(token.split(".").length, 3, "JWT must consist of header.payload.signature");
    });

    it("6. Valid token verification returns correct payload claims", () => {
      const token = generateToken(samplePayload);
      const verified = verifyToken(token);

      assert.equal(verified.userId, samplePayload.userId);
      assert.equal(verified.role, samplePayload.role);
      assert.equal(verified.email, samplePayload.email);
      assert.ok(typeof verified.iat === "number");
      assert.ok(typeof verified.exp === "number");
      assert.ok(verified.exp > verified.iat);
    });

    it("7. Expired token is rejected with UnauthorizedError", () => {
      const expiredToken = jwt.sign(
        samplePayload,
        env.JWT_SECRET,
        { algorithm: JWT_ALGORITHM, expiresIn: "-1s" }
      );

      assert.throws(
        () => verifyToken(expiredToken),
        (err: unknown) => {
          assert.equal(err instanceof UnauthorizedError, true);
          const authErr = err as UnauthorizedError;
          assert.equal(authErr.statusCode, 401);
          assert.equal(authErr.code, "UNAUTHORIZED");
          assert.ok(authErr.message.includes("expired"));
          return true;
        }
      );
    });

    it("8. Invalid signature is rejected with UnauthorizedError", () => {
      const forgedToken = jwt.sign(
        samplePayload,
        "an_alternate_invalid_secret_key_32_characters!",
        { algorithm: JWT_ALGORITHM, expiresIn: "1h" }
      );

      assert.throws(
        () => verifyToken(forgedToken),
        (err: unknown) => {
          assert.equal(err instanceof UnauthorizedError, true);
          const authErr = err as UnauthorizedError;
          assert.equal(authErr.statusCode, 401);
          assert.equal(authErr.code, "UNAUTHORIZED");
          assert.ok(authErr.message.includes("Invalid"));
          return true;
        }
      );
    });

    it("9. Malformed tokens are rejected with UnauthorizedError", () => {
      const malformedTokens = [
        "not-a-jwt",
        "header.payload",
        "header.payload.signature.extra",
        "",
      ];

      for (const badToken of malformedTokens) {
        assert.throws(
          () => verifyToken(badToken),
          (err: unknown) => {
            assert.equal(err instanceof UnauthorizedError, true);
            const authErr = err as UnauthorizedError;
            assert.equal(authErr.statusCode, 401);
            assert.equal(authErr.code, "UNAUTHORIZED");
            return true;
          }
        );
      }
    });

    it("10. Wrong algorithm token is rejected", () => {
      // Sign with HS512 instead of HS256
      const hs512Token = jwt.sign(
        samplePayload,
        env.JWT_SECRET,
        { algorithm: "HS512", expiresIn: "1h" }
      );

      assert.throws(
        () => verifyToken(hs512Token),
        (err: unknown) => {
          assert.equal(err instanceof UnauthorizedError, true);
          const authErr = err as UnauthorizedError;
          assert.equal(authErr.statusCode, 401);
          assert.equal(authErr.code, "UNAUTHORIZED");
          return true;
        }
      );
    });

    it("11. Token payload contains no password or sensitive information", () => {
      const token = generateToken(samplePayload);
      const decoded: any = jwt.decode(token);

      assert.ok(decoded);
      assert.equal("password" in decoded, false);
      assert.equal("passwordHash" in decoded, false);
      assert.equal("hash" in decoded, false);
      assert.equal("secret" in decoded, false);

      // Verify claims are strictly limited to approved set: userId, role, email, iat, exp
      const claimKeys = Object.keys(decoded).sort();
      assert.deepEqual(claimKeys, ["email", "exp", "iat", "role", "userId"].sort());
    });
  });
});

