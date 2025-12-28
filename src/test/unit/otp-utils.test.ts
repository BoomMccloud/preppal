/**
 * Unit tests for OTP utilities: rate limiting, code generation, and hashing.
 * These tests don't require database access and can run independently.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  resetRateLimit,
  _getCount,
  _clear,
} from "~/server/lib/rate-limit";
import {
  generateOtp,
  hashCode,
  verifyCodeConstantTime,
} from "~/server/lib/otp";

// =============================================================================
// Unit Tests: Rate Limiting
// =============================================================================

describe("Rate Limiting", () => {
  beforeEach(() => {
    _clear();
  });

  it("should allow first request for an email", () => {
    const result = checkRateLimit("test@example.com");

    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBeUndefined();
  });

  it("should track attempts within the window", () => {
    const email = "track@example.com";

    checkRateLimit(email); // 1
    checkRateLimit(email); // 2
    checkRateLimit(email); // 3

    expect(_getCount(email)).toBe(3);
  });

  it("should allow up to MAX_ATTEMPTS (5) requests", () => {
    const email = "max@example.com";

    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(email);
      expect(result.allowed).toBe(true);
    }

    expect(_getCount(email)).toBe(5);
  });

  it("should block after MAX_ATTEMPTS exceeded", () => {
    const email = "blocked@example.com";

    // Use up all 5 attempts
    for (let i = 0; i < 5; i++) {
      checkRateLimit(email);
    }

    // 6th attempt should be blocked
    const result = checkRateLimit(email);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeDefined();
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("should normalize email to lowercase", () => {
    checkRateLimit("Test@Example.COM");
    checkRateLimit("test@example.com");
    checkRateLimit("TEST@EXAMPLE.COM");

    expect(_getCount("test@example.com")).toBe(3);
  });

  it("should reset rate limit for an email", () => {
    const email = "reset@example.com";

    // Use some attempts
    checkRateLimit(email);
    checkRateLimit(email);
    expect(_getCount(email)).toBe(2);

    // Reset
    resetRateLimit(email);

    // Should start fresh
    checkRateLimit(email);
    expect(_getCount(email)).toBe(1);
  });

  it("should return retryAfterMs when rate limited", () => {
    const email = "retry@example.com";

    // Exhaust attempts
    for (let i = 0; i < 5; i++) {
      checkRateLimit(email);
    }

    const result = checkRateLimit(email);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeDefined();
    // Should be close to 15 minutes (within reasonable margin)
    expect(result.retryAfterMs).toBeLessThanOrEqual(15 * 60 * 1000);
    expect(result.retryAfterMs).toBeGreaterThan(14 * 60 * 1000);
  });

  it("should track different emails independently", () => {
    const email1 = "user1@example.com";
    const email2 = "user2@example.com";

    // Use up email1's attempts
    for (let i = 0; i < 5; i++) {
      checkRateLimit(email1);
    }

    // email1 should be blocked
    expect(checkRateLimit(email1).allowed).toBe(false);

    // email2 should still be allowed
    expect(checkRateLimit(email2).allowed).toBe(true);
  });
});

// =============================================================================
// Unit Tests: OTP Generation and Hashing
// =============================================================================

describe("OTP Generation and Hashing", () => {
  describe("generateOtp", () => {
    it("should generate a 6-digit numeric code", () => {
      const code = generateOtp();

      expect(code).toMatch(/^\d{6}$/);
    });

    it("should generate codes within valid range (100000-999999)", () => {
      for (let i = 0; i < 100; i++) {
        const code = generateOtp();
        const num = parseInt(code, 10);

        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });

    it("should generate different codes on subsequent calls", () => {
      const codes = new Set<string>();

      for (let i = 0; i < 100; i++) {
        codes.add(generateOtp());
      }

      // With ~20 bits of entropy, collisions in 100 samples should be rare
      expect(codes.size).toBeGreaterThan(90);
    });
  });

  describe("hashCode", () => {
    it("should return a SHA-256 hex string (64 characters)", () => {
      const hash = hashCode("123456");

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should produce consistent hashes for the same input", () => {
      const hash1 = hashCode("847291");
      const hash2 = hashCode("847291");

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", () => {
      const hash1 = hashCode("123456");
      const hash2 = hashCode("654321");

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyCodeConstantTime", () => {
    it("should return true for matching hashes", () => {
      const code = "123456";
      const hash = hashCode(code);

      expect(verifyCodeConstantTime(hash, hash)).toBe(true);
    });

    it("should return false for non-matching hashes", () => {
      const hash1 = hashCode("123456");
      const hash2 = hashCode("654321");

      expect(verifyCodeConstantTime(hash1, hash2)).toBe(false);
    });

    it("should return false for different length buffers", () => {
      const hash = hashCode("123456");
      const shortHash = hash.slice(0, 32); // Truncated

      expect(verifyCodeConstantTime(hash, shortHash)).toBe(false);
    });

    it("should verify user input against stored hash correctly", () => {
      const originalCode = "847291";
      const storedHash = hashCode(originalCode);

      // Correct code
      const correctInputHash = hashCode("847291");
      expect(verifyCodeConstantTime(correctInputHash, storedHash)).toBe(true);

      // Wrong code
      const wrongInputHash = hashCode("000000");
      expect(verifyCodeConstantTime(wrongInputHash, storedHash)).toBe(false);
    });
  });
});
