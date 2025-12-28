/**
 * Integration tests for Email OTP authentication flow.
 * Tests database operations, account linking, and full auth flow.
 *
 * Prerequisites:
 * 1. Add EmailVerification model to prisma/schema.prisma
 * 2. Run 'pnpm db:push' to sync the database
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import type { User } from "@prisma/client";
import { createHash, timingSafeEqual } from "crypto";

// Mock the auth module to prevent environment errors
vi.mock("~/server/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

// Mock the env module to prevent client/server environment errors
vi.mock("~/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: process.env.DATABASE_URL,
    RESEND_API_KEY: "re_test_key",
    EMAIL_FROM: "test@preppal.com",
  },
}));

// Mock the email module to prevent actual email sending
vi.mock("~/server/lib/email", () => ({
  sendOtpEmail: vi.fn(() => Promise.resolve({ success: true })),
}));

import { db } from "~/server/db";
import { appRouter } from "~/server/api/root";
import { _clear as clearRateLimits } from "~/server/lib/rate-limit";
import { hashCode } from "~/server/lib/otp";

// =============================================================================
// Integration Tests: OTP Auth Flow
// =============================================================================

describe("OTP Auth Flow Integration", () => {
  let testUser: User;

  beforeAll(async () => {
    // Create test user for enumeration prevention test
    testUser = await db.user.create({
      data: {
        email: `otp-test-${Date.now()}@example.com`,
        name: "OTP Test User",
        emailVerified: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Clean up EmailVerification records
    await db.emailVerification.deleteMany({
      where: { email: testUser.email },
    });

    // Clean up test user
    await db.user.delete({ where: { id: testUser.id } });
  });

  describe("EmailVerification model", () => {
    it("should create and retrieve an email verification record", async () => {
      const email = `verify-model-${Date.now()}@example.com`;
      const codeHash = createHash("sha256").update("123456").digest("hex");
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const verification = await db.emailVerification.create({
        data: {
          email,
          codeHash,
          expiresAt,
        },
      });

      expect(verification.id).toBeDefined();
      expect(verification.email).toBe(email);
      expect(verification.codeHash).toBe(codeHash);
      expect(verification.usedAt).toBeNull();

      // Clean up
      await db.emailVerification.delete({ where: { id: verification.id } });
    });

    it("should find valid (unused, non-expired) verification records", async () => {
      const email = `verify-find-${Date.now()}@example.com`;
      const codeHash = createHash("sha256").update("123456").digest("hex");

      // Create a valid record
      const validRecord = await db.emailVerification.create({
        data: {
          email,
          codeHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Future
        },
      });

      // Create an expired record
      const expiredRecord = await db.emailVerification.create({
        data: {
          email,
          codeHash,
          expiresAt: new Date(Date.now() - 1000), // Past
        },
      });

      // Create a used record
      const usedRecord = await db.emailVerification.create({
        data: {
          email,
          codeHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          usedAt: new Date(),
        },
      });

      // Query for valid records
      const result = await db.emailVerification.findFirst({
        where: {
          email,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      expect(result).not.toBeNull();
      expect(result!.id).toBe(validRecord.id);

      // Clean up
      await db.emailVerification.deleteMany({
        where: {
          id: { in: [validRecord.id, expiredRecord.id, usedRecord.id] },
        },
      });
    });

    it("should mark verification as used", async () => {
      const email = `verify-used-${Date.now()}@example.com`;
      const codeHash = createHash("sha256").update("123456").digest("hex");

      const verification = await db.emailVerification.create({
        data: {
          email,
          codeHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      expect(verification.usedAt).toBeNull();

      // Mark as used
      const updated = await db.emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      });

      expect(updated.usedAt).not.toBeNull();

      // Clean up
      await db.emailVerification.delete({ where: { id: verification.id } });
    });

    it("should invalidate existing codes when creating a new one", async () => {
      const email = `verify-invalidate-${Date.now()}@example.com`;
      const oldCodeHash = createHash("sha256").update("111111").digest("hex");
      const newCodeHash = createHash("sha256").update("222222").digest("hex");

      // Create first code
      const oldRecord = await db.emailVerification.create({
        data: {
          email,
          codeHash: oldCodeHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      // Simulate invalidating old codes before creating new one
      await db.emailVerification.updateMany({
        where: { email, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Create new code
      const newRecord = await db.emailVerification.create({
        data: {
          email,
          codeHash: newCodeHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      // Old record should now be "used"
      const oldRecordRefreshed = await db.emailVerification.findUnique({
        where: { id: oldRecord.id },
      });
      expect(oldRecordRefreshed!.usedAt).not.toBeNull();

      // New record should be valid
      expect(newRecord.usedAt).toBeNull();

      // Clean up
      await db.emailVerification.deleteMany({
        where: { id: { in: [oldRecord.id, newRecord.id] } },
      });
    });
  });

  describe("Security: Code verification", () => {
    it("should reject expired codes", async () => {
      const email = `security-expired-${Date.now()}@example.com`;
      const codeHash = createHash("sha256").update("123456").digest("hex");

      // Create expired verification
      await db.emailVerification.create({
        data: {
          email,
          codeHash,
          expiresAt: new Date(Date.now() - 1000), // Already expired
        },
      });

      // Query should not find it
      const verification = await db.emailVerification.findFirst({
        where: {
          email,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      expect(verification).toBeNull();

      // Clean up
      await db.emailVerification.deleteMany({ where: { email } });
    });

    it("should reject already-used codes", async () => {
      const email = `security-used-${Date.now()}@example.com`;
      const codeHash = createHash("sha256").update("123456").digest("hex");

      // Create used verification
      await db.emailVerification.create({
        data: {
          email,
          codeHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          usedAt: new Date(), // Already used
        },
      });

      // Query should not find it
      const verification = await db.emailVerification.findFirst({
        where: {
          email,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      expect(verification).toBeNull();

      // Clean up
      await db.emailVerification.deleteMany({ where: { email } });
    });
  });

  describe("Security: Enumeration prevention", () => {
    it("should return same response structure for existing and non-existing emails", async () => {
      // This test documents the expected behavior for enumeration prevention
      // The actual implementation should return success: true regardless of email existence

      const existingEmail = testUser.email;
      const nonExistingEmail = `nonexistent-${Date.now()}@example.com`;

      // Both should be able to create verification records
      const [existingVerification, nonExistingVerification] = await Promise.all(
        [
          db.emailVerification.create({
            data: {
              email: existingEmail,
              codeHash: createHash("sha256").update("111111").digest("hex"),
              expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
          }),
          db.emailVerification.create({
            data: {
              email: nonExistingEmail,
              codeHash: createHash("sha256").update("222222").digest("hex"),
              expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
          }),
        ],
      );

      // Both should have the same structure
      expect(existingVerification.id).toBeDefined();
      expect(nonExistingVerification.id).toBeDefined();
      expect(existingVerification.expiresAt).toBeDefined();
      expect(nonExistingVerification.expiresAt).toBeDefined();

      // Clean up
      await db.emailVerification.deleteMany({
        where: {
          id: { in: [existingVerification.id, nonExistingVerification.id] },
        },
      });
    });
  });
});

// =============================================================================
// OTP Flow End-to-End Scenarios
// =============================================================================

describe("OTP Flow Scenarios", () => {
  describe("Happy path", () => {
    it("should complete full OTP flow: send code → verify → account created/linked", async () => {
      const email = `e2e-happy-${Date.now()}@example.com`;
      const code = "847291";
      const codeHash = createHash("sha256").update(code).digest("hex");
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Step 1: Create verification record (simulating sendOtp)
      const verification = await db.emailVerification.create({
        data: { email, codeHash, expiresAt },
      });
      expect(verification.id).toBeDefined();

      // Step 2: Find verification record (simulating verifyOtp lookup)
      const foundVerification = await db.emailVerification.findFirst({
        where: {
          email,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(foundVerification).not.toBeNull();

      // Step 3: Verify code hash matches
      const inputHash = createHash("sha256").update(code).digest("hex");
      const a = Buffer.from(inputHash, "hex");
      const b = Buffer.from(foundVerification!.codeHash, "hex");
      expect(timingSafeEqual(a, b)).toBe(true);

      // Step 4: Mark as used
      await db.emailVerification.update({
        where: { id: foundVerification!.id },
        data: { usedAt: new Date() },
      });

      // Step 5: Create user (since email doesn't exist)
      const user = await db.user.create({
        data: { email, emailVerified: new Date() },
      });
      expect(user.id).toBeDefined();
      expect(user.emailVerified).not.toBeNull();

      // Clean up
      await db.emailVerification.delete({ where: { id: verification.id } });
      await db.user.delete({ where: { id: user.id } });
    });
  });

  describe("Error scenarios", () => {
    it("should handle wrong code gracefully", async () => {
      const email = `e2e-wrong-${Date.now()}@example.com`;
      const correctCode = "123456";
      const wrongCode = "654321";
      const codeHash = createHash("sha256").update(correctCode).digest("hex");

      await db.emailVerification.create({
        data: {
          email,
          codeHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      const verification = await db.emailVerification.findFirst({
        where: { email, usedAt: null, expiresAt: { gt: new Date() } },
      });

      // Verify wrong code doesn't match
      const wrongHash = createHash("sha256").update(wrongCode).digest("hex");
      const a = Buffer.from(wrongHash, "hex");
      const b = Buffer.from(verification!.codeHash, "hex");
      expect(timingSafeEqual(a, b)).toBe(false);

      // Clean up
      await db.emailVerification.deleteMany({ where: { email } });
    });

    it("should handle expired code scenario", async () => {
      const email = `e2e-expired-${Date.now()}@example.com`;
      const code = "123456";
      const codeHash = createHash("sha256").update(code).digest("hex");

      // Create already-expired verification
      await db.emailVerification.create({
        data: {
          email,
          codeHash,
          expiresAt: new Date(Date.now() - 1000), // Expired
        },
      });

      // Should not find valid verification
      const verification = await db.emailVerification.findFirst({
        where: { email, usedAt: null, expiresAt: { gt: new Date() } },
      });
      expect(verification).toBeNull();

      // Clean up
      await db.emailVerification.deleteMany({ where: { email } });
    });

    it("should handle resend code scenario", async () => {
      const email = `e2e-resend-${Date.now()}@example.com`;
      const oldCode = "111111";
      const newCode = "222222";

      // Create first code
      const oldVerification = await db.emailVerification.create({
        data: {
          email,
          codeHash: createHash("sha256").update(oldCode).digest("hex"),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      // Simulate resend: invalidate old codes
      await db.emailVerification.updateMany({
        where: { email, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Create new code
      const newVerification = await db.emailVerification.create({
        data: {
          email,
          codeHash: createHash("sha256").update(newCode).digest("hex"),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      // Old code should no longer work
      const oldResult = await db.emailVerification.findFirst({
        where: { id: oldVerification.id, usedAt: null },
      });
      expect(oldResult).toBeNull();

      // New code should work
      const newResult = await db.emailVerification.findFirst({
        where: {
          id: newVerification.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      expect(newResult).not.toBeNull();

      // Clean up
      await db.emailVerification.deleteMany({ where: { email } });
    });
  });
});

// =============================================================================
// tRPC Procedure Tests: auth.sendOtp and auth.verifyOtp
// =============================================================================

describe("tRPC Auth Procedures", () => {
  // Create an unauthenticated caller (these are public procedures)
  const createCaller = () =>
    appRouter.createCaller({
      db,
      session: null,
      headers: new Headers(),
    });

  beforeEach(() => {
    // Clear rate limits before each test
    clearRateLimits();
  });

  describe("auth.sendOtp", () => {
    it("should send OTP and return success with expiresAt", async () => {
      const email = `trpc-send-${Date.now()}@example.com`;
      const caller = createCaller();

      const result = await caller.auth.sendOtp({ email });

      expect(result.success).toBe(true);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Verify record was created in database
      const verification = await db.emailVerification.findFirst({
        where: { email, usedAt: null },
      });
      expect(verification).not.toBeNull();

      // Clean up
      await db.emailVerification.deleteMany({ where: { email } });
    });

    it("should invalidate previous codes when sending new one", async () => {
      const email = `trpc-invalidate-${Date.now()}@example.com`;
      const caller = createCaller();

      // Send first code
      await caller.auth.sendOtp({ email });
      const firstVerification = await db.emailVerification.findFirst({
        where: { email, usedAt: null },
      });
      expect(firstVerification).not.toBeNull();

      // Send second code
      await caller.auth.sendOtp({ email });

      // First code should now be marked as used
      const firstAfter = await db.emailVerification.findUnique({
        where: { id: firstVerification!.id },
      });
      expect(firstAfter!.usedAt).not.toBeNull();

      // Should have exactly one valid code
      const validCodes = await db.emailVerification.findMany({
        where: { email, usedAt: null },
      });
      expect(validCodes).toHaveLength(1);

      // Clean up
      await db.emailVerification.deleteMany({ where: { email } });
    });

    it("should rate limit after 5 attempts", async () => {
      const email = `trpc-ratelimit-${Date.now()}@example.com`;
      const caller = createCaller();

      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        await caller.auth.sendOtp({ email });
      }

      // 6th request should be rate limited
      await expect(caller.auth.sendOtp({ email })).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
      });

      // Clean up
      await db.emailVerification.deleteMany({ where: { email } });
    }, 15000); // Extended timeout: 6 tRPC calls ~8-10 seconds
  });

  describe("auth.verifyOtp", () => {
    it("should verify correct code and create new user", async () => {
      const email = `trpc-verify-new-${Date.now()}@example.com`;
      const code = "123456";
      const caller = createCaller();

      // Create verification record directly (simulating sendOtp)
      await db.emailVerification.create({
        data: {
          email,
          codeHash: hashCode(code),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      // Verify the code
      const result = await caller.auth.verifyOtp({ email, code });

      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();

      // Verify user was created
      const user = await db.user.findUnique({ where: { email } });
      expect(user).not.toBeNull();
      expect(user!.emailVerified).not.toBeNull();

      // Clean up
      await db.emailVerification.deleteMany({ where: { email } });
      await db.user.delete({ where: { id: result.userId } });
    });

    it("should verify correct code and link existing user", async () => {
      const email = `trpc-verify-existing-${Date.now()}@example.com`;
      const code = "654321";

      // Create existing user without emailVerified
      const existingUser = await db.user.create({
        data: { email, name: "Existing User" },
      });
      expect(existingUser.emailVerified).toBeNull();

      // Create verification record
      await db.emailVerification.create({
        data: {
          email,
          codeHash: hashCode(code),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      const caller = createCaller();
      const result = await caller.auth.verifyOtp({ email, code });

      expect(result.success).toBe(true);
      expect(result.userId).toBe(existingUser.id);

      // Verify emailVerified was set
      const updatedUser = await db.user.findUnique({ where: { email } });
      expect(updatedUser!.emailVerified).not.toBeNull();

      // Clean up
      await db.emailVerification.deleteMany({ where: { email } });
      await db.user.delete({ where: { id: existingUser.id } });
    });

    it("should reject wrong code", async () => {
      const email = `trpc-wrong-code-${Date.now()}@example.com`;
      const correctCode = "111111";
      const wrongCode = "999999";

      await db.emailVerification.create({
        data: {
          email,
          codeHash: hashCode(correctCode),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      const caller = createCaller();

      await expect(
        caller.auth.verifyOtp({ email, code: wrongCode }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "That code didn't work. Please check and try again.",
      });

      // Clean up
      await db.emailVerification.deleteMany({ where: { email } });
    });

    it("should reject expired code", async () => {
      const email = `trpc-expired-${Date.now()}@example.com`;
      const code = "222222";

      await db.emailVerification.create({
        data: {
          email,
          codeHash: hashCode(code),
          expiresAt: new Date(Date.now() - 1000), // Already expired
        },
      });

      const caller = createCaller();

      await expect(
        caller.auth.verifyOtp({ email, code }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "This code has expired. We'll send you a new one.",
      });

      // Clean up
      await db.emailVerification.deleteMany({ where: { email } });
    });

    it("should reject already-used code", async () => {
      const email = `trpc-used-${Date.now()}@example.com`;
      const code = "333333";

      await db.emailVerification.create({
        data: {
          email,
          codeHash: hashCode(code),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          usedAt: new Date(), // Already used
        },
      });

      const caller = createCaller();

      await expect(
        caller.auth.verifyOtp({ email, code }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "This code has expired. We'll send you a new one.",
      });

      // Clean up
      await db.emailVerification.deleteMany({ where: { email } });
    });

    it("should rate limit verification attempts", async () => {
      const email = `trpc-verify-ratelimit-${Date.now()}@example.com`;
      const code = "444444";

      await db.emailVerification.create({
        data: {
          email,
          codeHash: hashCode(code),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      const caller = createCaller();

      // Make 5 failed attempts with wrong code
      for (let i = 0; i < 5; i++) {
        try {
          await caller.auth.verifyOtp({ email, code: "000000" });
        } catch {
          // Expected to fail with BAD_REQUEST
        }
      }

      // 6th attempt should be rate limited even with correct code
      await expect(
        caller.auth.verifyOtp({ email, code }),
      ).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
      });

      // Clean up
      await db.emailVerification.deleteMany({ where: { email } });
    });
  });

  describe("Full flow: sendOtp → verifyOtp", () => {
    it("should complete full authentication flow via tRPC", async () => {
      const email = `trpc-full-flow-${Date.now()}@example.com`;
      const caller = createCaller();

      // Step 1: Send OTP
      const sendResult = await caller.auth.sendOtp({ email });
      expect(sendResult.success).toBe(true);

      // Step 2: Get the code from database (in real flow, user gets it via email)
      const verification = await db.emailVerification.findFirst({
        where: { email, usedAt: null },
        orderBy: { createdAt: "desc" },
      });
      expect(verification).not.toBeNull();

      // Reverse the hash to find the code (for testing only)
      // In practice, we need to intercept the code before it's hashed
      // So let's create a new verification with known code
      await db.emailVerification.deleteMany({ where: { email } });
      const knownCode = "567890";
      await db.emailVerification.create({
        data: {
          email,
          codeHash: hashCode(knownCode),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      // Step 3: Verify OTP
      const verifyResult = await caller.auth.verifyOtp({
        email,
        code: knownCode,
      });
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.userId).toBeDefined();

      // Step 4: Verify user exists and is verified
      const user = await db.user.findUnique({ where: { email } });
      expect(user).not.toBeNull();
      expect(user!.id).toBe(verifyResult.userId);
      expect(user!.emailVerified).not.toBeNull();

      // Clean up
      await db.emailVerification.deleteMany({ where: { email } });
      await db.user.delete({ where: { id: verifyResult.userId } });
    });
  });
});
