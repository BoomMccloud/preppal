/**
 * OTP utilities for code generation, hashing, and verification.
 * Used by the email OTP authentication flow.
 */

import { createHash, randomInt, timingSafeEqual } from "crypto";

/** OTP code time-to-live in milliseconds (10 minutes) */
export const OTP_TTL_MS = 10 * 60 * 1000;

/**
 * Generates a cryptographically secure 6-digit OTP code.
 * Range: 100000-999999 (~20 bits of entropy)
 */
export function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

/**
 * Hashes an OTP code using SHA-256.
 * Returns a 64-character hex string.
 */
export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Verifies an input hash against a stored hash using constant-time comparison.
 * Prevents timing attacks by ensuring comparison time doesn't leak information.
 */
export function verifyCodeConstantTime(
  inputHash: string,
  storedHash: string
): boolean {
  const a = Buffer.from(inputHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
