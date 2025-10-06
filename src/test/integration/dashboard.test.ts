import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Mock the auth module to prevent environment errors
vi.mock("~/server/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)), // Default mock
}));
import { appRouter } from "~/server/api/root";
import { db } from "~/server/db";
import type { inferProcedureInput } from "@trpc/server";
import type { User } from "@prisma/client";
import { TRPCError } from "@trpc/server";

describe("Backend Integration Tests", () => {
  let testUser: User;
  let otherUser: User;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    // Create dedicated users for this test run
    [testUser, otherUser] = await Promise.all([
      db.user.create({
        data: {
          email: `test-user-${Date.now()}@example.com`,
          name: "Test User",
        },
      }),
      db.user.create({
        data: {
          email: `other-user-${Date.now()}@example.com`,
          name: "Other User",
        },
      }),
    ]);

    // Create a tRPC caller authenticated as the main test user
    caller = appRouter.createCaller({
      db,
      session: {
        user: { id: testUser.id, name: testUser.name, email: testUser.email },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      headers: new Headers(),
    });
  });

  afterAll(async () => {
    // Clean up the database
    await db.user.deleteMany({
      where: { id: { in: [testUser.id, otherUser.id] } },
    });
  });

  it("should fetch the correct user profile data", async () => {
    // ARRANGE & ACT: Call the getProfile procedure
    const profile = await caller.user.getProfile();

    // ASSERT: The returned profile data should match the test user
    expect(profile).toBeDefined();
    expect(profile.name).toBe(testUser.name);
    expect(profile.email).toBe(testUser.email);
  });

  it("should list a newly created interview on the dashboard", async () => {
    // ARRANGE: Create a new interview
    const createInput: inferProcedureInput<typeof appRouter.interview.createSession> = {
      jobDescription: { type: "text", content: "Integration Test JD" },
      resume: { type: "text", content: "Integration Test Resume" },
      idempotencyKey: `integration-test-dashboard-${Date.now()}`,
    };
    const createdInterview = await caller.interview.createSession(createInput);

    // ACT: Call the (not-yet-implemented) getHistory procedure
    const history = await caller.interview.getHistory();

    // ASSERT: The new interview should be in the history
    const foundInterview = history.find(
      (interview) => interview.id === createdInterview.id,
    );
    expect(foundInterview).toBeDefined();
  });

  it("should fetch a specific interview by ID, but deny access to other users", async () => {
    // ARRANGE: Create a new interview
    const createInput: inferProcedureInput<typeof appRouter.interview.createSession> = {
      jobDescription: { type: "text", content: "getById Test JD" },
      resume: { type: "text", content: "getById Test Resume" },
      idempotencyKey: `integration-test-getbyid-${Date.now()}`,
    };
    const createdInterview = await caller.interview.createSession(createInput);

    // ACT & ASSERT (Correct User): Fetch the interview by its ID
    const result = await caller.interview.getById({ id: createdInterview.id });
    expect(result).toBeDefined();
    expect(result.id).toBe(createdInterview.id);

    // ACT & ASSERT (Incorrect User): Attempt to fetch the same interview as a different user
    const otherUserCaller = appRouter.createCaller({
      db,
      session: {
        user: { id: otherUser.id, name: otherUser.name, email: otherUser.email },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      headers: new Headers(),
    });

    // Expect this call to fail because of the security check in getById
    await expect(
      otherUserCaller.interview.getById({ id: createdInterview.id }),
    ).rejects.toThrow(TRPCError);
  });
});
