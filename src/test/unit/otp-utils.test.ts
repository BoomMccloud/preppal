/**
 * Unit tests for OTP utilities: rate limiting, code generation, and hashing.
 * These tests don't require database access and can run independently.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createHash, randomInt, timingSafeEqual } from "crypto";

// =============================================================================
// Unit Tests: Rate Limiting
// =============================================================================

describe("Rate Limiting", () => {
  // Inline implementation for testing (matches skeleton from spec)
  interface RateLimitEntry {
    count: number;
    resetAt: number;
  }

  const createRateLimiter = () => {
    const store = new Map<string, RateLimitEntry>();
    const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
    const MAX_ATTEMPTS = 5;

    return {
      checkRateLimit(email: string): { allowed: boolean; retryAfterMs?: number } {
        const now = Date.now();
        const key = email.toLowerCase();
        const entry = store.get(key);

        if (!entry || now >= entry.resetAt) {
          store.set(key, { count: 1, resetAt: now + WINDOW_MS });
          return { allowed: true };
        }

        if (entry.count >= MAX_ATTEMPTS) {
          return { allowed: false, retryAfterMs: entry.resetAt - now };
        }

        entry.count++;
        return { allowed: true };
      },

      resetRateLimit(email: string): void {
        store.delete(email.toLowerCase());
      },

      // For testing: get current count
      _getCount(email: string): number {
        return store.get(email.toLowerCase())?.count ?? 0;
      },

      // For testing: clear all
      _clear(): void {
        store.clear();
      },
    };
  };

  let rateLimiter: ReturnType<typeof createRateLimiter>;

  beforeEach(() => {
    rateLimiter = createRateLimiter();
  });

  it("should allow first request for an email", () => {
    const result = rateLimiter.checkRateLimit("test@example.com");

    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBeUndefined();
  });

  it("should track attempts within the window", () => {
    const email = "track@example.com";

    rateLimiter.checkRateLimit(email); // 1
    rateLimiter.checkRateLimit(email); // 2
    rateLimiter.checkRateLimit(email); // 3

    expect(rateLimiter._getCount(email)).toBe(3);
  });

  it("should allow up to MAX_ATTEMPTS (5) requests", () => {
    const email = "max@example.com";

    for (let i = 0; i < 5; i++) {
      const result = rateLimiter.checkRateLimit(email);
      expect(result.allowed).toBe(true);
    }

    expect(rateLimiter._getCount(email)).toBe(5);
  });

  it("should block after MAX_ATTEMPTS exceeded", () => {
    const email = "blocked@example.com";

    // Use up all 5 attempts
    for (let i = 0; i < 5; i++) {
      rateLimiter.checkRateLimit(email);
    }

    // 6th attempt should be blocked
    const result = rateLimiter.checkRateLimit(email);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeDefined();
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("should normalize email to lowercase", () => {
    rateLimiter.checkRateLimit("Test@Example.COM");
    rateLimiter.checkRateLimit("test@example.com");
    rateLimiter.checkRateLimit("TEST@EXAMPLE.COM");

    expect(rateLimiter._getCount("test@example.com")).toBe(3);
  });

  it("should reset rate limit for an email", () => {
    const email = "reset@example.com";

    // Use some attempts
    rateLimiter.checkRateLimit(email);
    rateLimiter.checkRateLimit(email);
    expect(rateLimiter._getCount(email)).toBe(2);

    // Reset
    rateLimiter.resetRateLimit(email);

    // Should start fresh
    rateLimiter.checkRateLimit(email);
    expect(rateLimiter._getCount(email)).toBe(1);
  });

  it("should return retryAfterMs when rate limited", () => {
    const email = "retry@example.com";

    // Exhaust attempts
    for (let i = 0; i < 5; i++) {
      rateLimiter.checkRateLimit(email);
    }

    const result = rateLimiter.checkRateLimit(email);

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
      rateLimiter.checkRateLimit(email1);
    }

    // email1 should be blocked
    expect(rateLimiter.checkRateLimit(email1).allowed).toBe(false);

    // email2 should still be allowed
    expect(rateLimiter.checkRateLimit(email2).allowed).toBe(true);
  });
});

// =============================================================================
// Unit Tests: OTP Generation and Hashing
// =============================================================================

describe("OTP Generation and Hashing", () => {
  function generateOtp(): string {
    return String(randomInt(100000, 999999));
  }

  function hashCode(code: string): string {
    return createHash("sha256").update(code).digest("hex");
  }

  function verifyCodeConstantTime(inputHash: string, storedHash: string): boolean {
    const a = Buffer.from(inputHash, "hex");
    const b = Buffer.from(storedHash, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

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
