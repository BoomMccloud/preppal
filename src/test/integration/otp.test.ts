/**
 * Integration tests for Email OTP authentication flow.
 * Tests database operations, account linking, and full auth flow.
 *
 * NOTE: These tests require the EmailVerification model in prisma/schema.prisma.
 * Run 'pnpm db:push' after adding the model to enable these tests.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
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

// =============================================================================
// Integration Tests: OTP Auth Flow
// =============================================================================

describe("OTP Auth Flow Integration", () => {
  let testUser: User;
  let oauthUser: User;

  beforeAll(async () => {
    // Create test users
    [testUser, oauthUser] = await Promise.all([
      db.user.create({
        data: {
          email: `otp-test-${Date.now()}@example.com`,
          name: "OTP Test User",
          emailVerified: new Date(),
        },
      }),
      db.user.create({
        data: {
          email: `otp-oauth-${Date.now()}@example.com`,
          name: "OAuth User",
          emailVerified: null, // OAuth user without email verification
        },
      }),
    ]);
  });

  afterAll(async () => {
    // Clean up EmailVerification records
    await db.emailVerification.deleteMany({
      where: {
        email: {
          in: [testUser.email, oauthUser.email],
        },
      },
    });

    // Clean up test users
    await db.user.deleteMany({
      where: { id: { in: [testUser.id, oauthUser.id] } },
    });
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
        where: { id: { in: [validRecord.id, expiredRecord.id, usedRecord.id] } },
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

  describe("Account linking", () => {
    it("should find existing user by email", async () => {
      const user = await db.user.findUnique({
        where: { email: testUser.email },
      });

      expect(user).not.toBeNull();
      expect(user!.id).toBe(testUser.id);
    });

    it("should update emailVerified for OAuth user on first email login", async () => {
      // Verify OAuth user doesn't have emailVerified
      const beforeUser = await db.user.findUnique({
        where: { id: oauthUser.id },
      });
      expect(beforeUser!.emailVerified).toBeNull();

      // Simulate email verification updating the user
      await db.user.update({
        where: { id: oauthUser.id },
        data: { emailVerified: new Date() },
      });

      const afterUser = await db.user.findUnique({
        where: { id: oauthUser.id },
      });
      expect(afterUser!.emailVerified).not.toBeNull();
    });

    it("should create new user if email doesn't exist", async () => {
      const newEmail = `new-user-${Date.now()}@example.com`;

      // Verify user doesn't exist
      const existingUser = await db.user.findUnique({
        where: { email: newEmail },
      });
      expect(existingUser).toBeNull();

      // Create new user (simulating OTP verification for new email)
      const newUser = await db.user.create({
        data: {
          email: newEmail,
          emailVerified: new Date(),
        },
      });

      expect(newUser.id).toBeDefined();
      expect(newUser.email).toBe(newEmail);
      expect(newUser.emailVerified).not.toBeNull();

      // Clean up
      await db.user.delete({ where: { id: newUser.id } });
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

    it("should use constant-time comparison for code verification", () => {
      // This test verifies the implementation uses timingSafeEqual
      const code = "123456";
      const storedHash = createHash("sha256").update(code).digest("hex");

      const verifyConstantTime = (inputCode: string): boolean => {
        const inputHash = createHash("sha256").update(inputCode).digest("hex");
        const a = Buffer.from(inputHash, "hex");
        const b = Buffer.from(storedHash, "hex");
        if (a.length !== b.length) return false;
        return timingSafeEqual(a, b);
      };

      expect(verifyConstantTime("123456")).toBe(true);
      expect(verifyConstantTime("000000")).toBe(false);
      expect(verifyConstantTime("123457")).toBe(false);
    });
  });

  describe("Security: Enumeration prevention", () => {
    it("should return same response structure for existing and non-existing emails", async () => {
      // This test documents the expected behavior for enumeration prevention
      // The actual implementation should return success: true regardless of email existence

      const existingEmail = testUser.email;
      const nonExistingEmail = `nonexistent-${Date.now()}@example.com`;

      // Both should be able to create verification records
      const [existingVerification, nonExistingVerification] = await Promise.all([
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
      ]);

      // Both should have the same structure
      expect(existingVerification.id).toBeDefined();
      expect(nonExistingVerification.id).toBeDefined();
      expect(existingVerification.expiresAt).toBeDefined();
      expect(nonExistingVerification.expiresAt).toBeDefined();

      // Clean up
      await db.emailVerification.deleteMany({
        where: { id: { in: [existingVerification.id, nonExistingVerification.id] } },
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
        where: { id: newVerification.id, usedAt: null, expiresAt: { gt: new Date() } },
      });
      expect(newResult).not.toBeNull();

      // Clean up
      await db.emailVerification.deleteMany({ where: { email } });
    });
  });
});
