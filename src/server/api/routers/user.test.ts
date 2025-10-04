import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

// Mock NextAuth
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database module
vi.mock("~/server/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("user.getProfile", () => {
  const mockSession: Session = {
    user: {
      id: "test-user-id",
      name: "John Doe",
      email: "john@example.com",
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return user profile with name and email", async () => {
    // Import after mocking
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    // Mock Prisma to return user data
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "test-user-id",
      name: "John Doe",
      email: "john@example.com",
      emailVerified: null,
      image: null,
    });

    // Create tRPC caller with mock session
    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    // This will fail because user.getProfile doesn't exist yet
    const result = await caller.user.getProfile();

    // Assert the procedure returns only name and email
    expect(result).toEqual({
      name: "John Doe",
      email: "john@example.com",
    });

    // Verify Prisma was called correctly
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { id: "test-user-id" },
      select: { name: true, email: true },
    });
  });
});
