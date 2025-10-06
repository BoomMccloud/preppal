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

    // ACT: Call the getHistory procedure
    const history = await caller.interview.getHistory();

    // ASSERT: The new interview should be in the history
    const foundInterview = history.find(
      (interview) => interview.id === createdInterview.id,
    );
    expect(foundInterview).toBeDefined();

    // ASSERT: The returned fields should match the specification
    expect(foundInterview).toHaveProperty("id");
    expect(foundInterview).toHaveProperty("status");
    expect(foundInterview).toHaveProperty("createdAt");
    expect(foundInterview).toHaveProperty("jobTitleSnapshot");
  });

  it("should return interviews sorted by newest first", async () => {
    // ARRANGE: Create multiple interviews with slight time delay
    const firstInterview = await caller.interview.createSession({
      jobDescription: { type: "text", content: "First Interview JD" },
      resume: { type: "text", content: "First Resume" },
      idempotencyKey: `sort-test-first-${Date.now()}`,
    });

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondInterview = await caller.interview.createSession({
      jobDescription: { type: "text", content: "Second Interview JD" },
      resume: { type: "text", content: "Second Resume" },
      idempotencyKey: `sort-test-second-${Date.now()}`,
    });

    // ACT: Get history
    const history = await caller.interview.getHistory();

    // ASSERT: Second interview (newer) should come before first interview
    const firstIndex = history.findIndex(i => i.id === firstInterview.id);
    const secondIndex = history.findIndex(i => i.id === secondInterview.id);

    expect(secondIndex).toBeLessThan(firstIndex);
  });

  it("should generate jobTitleSnapshot from first 30 characters of jobDescriptionSnapshot", async () => {
    // ARRANGE: Create interview with long job description
    const longJobDescription = "This is a very long job description that exceeds thirty characters and should be truncated";

    const interview = await caller.interview.createSession({
      jobDescription: { type: "text", content: longJobDescription },
      resume: { type: "text", content: "Test Resume" },
      idempotencyKey: `title-test-${Date.now()}`,
    });

    // ACT: Get history
    const history = await caller.interview.getHistory();

    // ASSERT: Find the created interview in history
    const foundInterview = history.find(i => i.id === interview.id);

    expect(foundInterview).toBeDefined();
    expect(foundInterview!.jobTitleSnapshot).toBe(longJobDescription.substring(0, 30));
    expect(foundInterview!.jobTitleSnapshot?.length).toBeLessThanOrEqual(30);
  });

  it("should return empty array when user has no interviews", async () => {
    // ARRANGE: Create a new user with no interviews
    const newUser = await db.user.create({
      data: {
        email: `empty-user-${Date.now()}@example.com`,
        name: "Empty User",
      },
    });

    const emptyUserCaller = appRouter.createCaller({
      db,
      session: {
        user: { id: newUser.id, name: newUser.name, email: newUser.email },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      headers: new Headers(),
    });

    // ACT: Get history
    const history = await emptyUserCaller.interview.getHistory();

    // ASSERT: Should return empty array
    expect(history).toEqual([]);

    // Cleanup
    await db.user.delete({ where: { id: newUser.id } });
  });

  it("should only return interviews belonging to the authenticated user", async () => {
    // ARRANGE: Create interviews for both users
    const testUserInterview = await caller.interview.createSession({
      jobDescription: { type: "text", content: "Test User JD" },
      resume: { type: "text", content: "Test Resume" },
      idempotencyKey: `isolation-test-user-${Date.now()}`,
    });

    const otherUserCaller = appRouter.createCaller({
      db,
      session: {
        user: { id: otherUser.id, name: otherUser.name, email: otherUser.email },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      headers: new Headers(),
    });

    const otherUserInterview = await otherUserCaller.interview.createSession({
      jobDescription: { type: "text", content: "Other User JD" },
      resume: { type: "text", content: "Other Resume" },
      idempotencyKey: `isolation-other-user-${Date.now()}`,
    });

    // ACT: Get history for test user
    const testUserHistory = await caller.interview.getHistory();

    // ASSERT: Should only contain test user's interview, not other user's
    expect(testUserHistory.some(i => i.id === testUserInterview.id)).toBe(true);
    expect(testUserHistory.some(i => i.id === otherUserInterview.id)).toBe(false);
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
