import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

// Mock NextAuth
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database module
vi.mock("~/server/db", () => ({
  db: {
    interview: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

describe("interview.createSession", () => {
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

  it("should create a new interview with PENDING status using text inputs", async () => {
    // Import after mocking
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const mockInterview = {
      id: "test-interview-id",
      userId: "test-user-id",
      status: "PENDING" as const,
      jobTitleSnapshot: null,
      jobDescriptionSnapshot: "We are looking for a senior frontend developer...",
      resumeSnapshot: "John Doe - Senior Frontend Developer with 5 years experience...",
      idempotencyKey: "test-key-123",
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: null,
      endedAt: null,
      resumeId: null,
      jobDescriptionId: null,
    };

    // Mock findUnique to return null (no existing interview)
    vi.mocked(db.interview.findUnique).mockResolvedValue(null);

    // Mock create to return the new interview
    vi.mocked(db.interview.create).mockResolvedValue(mockInterview);

    // Create tRPC caller with mock session
    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    // Call the mutation with discriminated union inputs
    const result = await caller.interview.createSession({
      jobDescription: {
        type: "text",
        content: "We are looking for a senior frontend developer...",
      },
      resume: {
        type: "text",
        content: "John Doe - Senior Frontend Developer with 5 years experience...",
      },
      idempotencyKey: "test-key-123",
    });

    // Assert the returned interview has correct properties
    expect(result).toEqual(mockInterview);
    expect(result.status).toBe("PENDING");
    expect(result.userId).toBe("test-user-id");
    expect(result.jobDescriptionSnapshot).toBe("We are looking for a senior frontend developer...");
    expect(result.resumeSnapshot).toBe("John Doe - Senior Frontend Developer with 5 years experience...");
    expect(result.idempotencyKey).toBe("test-key-123");

    // Verify findUnique was called to check for existing interview
    expect(db.interview.findUnique).toHaveBeenCalledWith({
      where: { idempotencyKey: "test-key-123" },
    });

    // Verify create was called with correct data structure
    const createCall = vi.mocked(db.interview.create).mock.calls[0]?.[0];
    expect(createCall?.data.userId).toBe("test-user-id");
    expect(createCall?.data.jobDescriptionSnapshot).toBe("We are looking for a senior frontend developer...");
    expect(createCall?.data.resumeSnapshot).toBe("John Doe - Senior Frontend Developer with 5 years experience...");
    expect(createCall?.data.idempotencyKey).toBe("test-key-123");
    expect(createCall?.data.status).toBe("PENDING");
  });

  it("should return existing interview when idempotencyKey already exists", async () => {
    // Import after mocking
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const existingInterview = {
      id: "existing-interview-id",
      userId: "test-user-id",
      status: "PENDING" as const,
      jobTitleSnapshot: null,
      jobDescriptionSnapshot: "We are looking for...",
      resumeSnapshot: "Resume content...",
      idempotencyKey: "duplicate-key-123",
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: null,
      endedAt: null,
      resumeId: null,
      jobDescriptionId: null,
    };

    // Mock findUnique to return an existing interview
    vi.mocked(db.interview.findUnique).mockResolvedValue(existingInterview);

    // Create tRPC caller with mock session
    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    // Call the mutation with the same idempotency key
    const result = await caller.interview.createSession({
      jobDescription: {
        type: "text",
        content: "We are looking for...",
      },
      resume: {
        type: "text",
        content: "Resume content...",
      },
      idempotencyKey: "duplicate-key-123",
    });

    // Assert it returns the existing interview
    expect(result).toEqual(existingInterview);
    expect(result.id).toBe("existing-interview-id");

    // Verify findUnique was called
    expect(db.interview.findUnique).toHaveBeenCalledWith({
      where: { idempotencyKey: "duplicate-key-123" },
    });

    // Verify create was NOT called (idempotent behavior)
    expect(db.interview.create).not.toHaveBeenCalled();
  });
});

describe("interview.getHistory", () => {
  it("should return a list of past interviews for the current user", async () => {
    // ARRANGE
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const mockSession: Session = {
      user: { id: "test-user-id", name: "Test User", email: "test@test.com" },
      expires: new Date().toISOString(),
    };

    const mockInterviewsFromDb = [
      {
        id: "int-1",
        status: "COMPLETED" as const,
        jobDescriptionSnapshot: "Frontend Developer with a very long description",
        createdAt: new Date(),
      },
      {
        id: "int-2",
        status: "PENDING" as const,
        jobDescriptionSnapshot: "Backend Developer",
        createdAt: new Date(),
      },
    ];

    // Mock the database call
    vi.mocked(db.interview.findMany).mockResolvedValue(mockInterviewsFromDb);

    const caller = createCaller({ db, session: mockSession, headers: new Headers() });

    // ACT
    const result = await caller.interview.getHistory();

    // ASSERT
    // 1. Check if the result has the transformed shape
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("int-1");
    expect(result[0].jobTitleSnapshot).toBe("Frontend Developer with a very"); // First 30 chars
    expect(result[1].jobTitleSnapshot).toBe("Backend Developer");

    // 2. Check if the database was called with the correct query
    expect(db.interview.findMany).toHaveBeenCalledWith({
      where: {
        userId: "test-user-id",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        jobDescriptionSnapshot: true, // Correctly expect jobDescriptionSnapshot
      },
    });
  });
});

describe("interview.getCurrent", () => {
  it("should return the current IN_PROGRESS interview for the user", async () => {
    // ARRANGE
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const mockSession: Session = {
      user: { id: "test-user-id", name: "Test User", email: "test@test.com" },
      expires: new Date().toISOString(),
    };

    const mockCurrentInterview = {
      id: "in-progress-interview-id",
      status: "IN_PROGRESS" as const,
      userId: "test-user-id",
      // Add other necessary fields that the procedure is expected to return
      jobTitleSnapshot: "Senior Developer",
      createdAt: new Date(),
    };

    // Mock the database call for findFirst
    vi.mocked(db.interview.findFirst).mockResolvedValue(mockCurrentInterview);

    const caller = createCaller({ db, session: mockSession, headers: new Headers() });

    // ACT: This will fail because getCurrent doesn't exist yet
    const result = await caller.interview.getCurrent();

    // ASSERT
    // 1. Check if the result matches the mock data
    expect(result).toEqual(mockCurrentInterview);

    // 2. Check if the database was called with the correct query
    expect(db.interview.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "test-user-id",
        status: "IN_PROGRESS",
      },
    });
  });

  it("should return null if no IN_PROGRESS interview is found", async () => {
    // ARRANGE
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const mockSession: Session = {
      user: { id: "test-user-id", name: "Test User", email: "test@test.com" },
      expires: new Date().toISOString(),
    };

    // Mock the database call to return null
    vi.mocked(db.interview.findFirst).mockResolvedValue(null);

    const caller = createCaller({ db, session: mockSession, headers: new Headers() });

    // ACT
    const result = await caller.interview.getCurrent();

    // ASSERT
    expect(result).toBeNull();
    expect(db.interview.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "test-user-id",
        status: "IN_PROGRESS",
      },
    });
  });
});
