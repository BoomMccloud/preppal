/**
 * @vitest-environment node
 */
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
    // 1. Check if the result has the transformed shape and all fields
    expect(result).toHaveLength(2);

    // Check first interview
    expect(result[0].id).toBe("int-1");
    expect(result[0].status).toBe("COMPLETED");
    expect(result[0].createdAt).toBe(mockInterviewsFromDb[0].createdAt);
    expect(result[0].jobTitleSnapshot).toBe("Frontend Developer with a very"); // First 30 chars

    // Check second interview
    expect(result[1].id).toBe("int-2");
    expect(result[1].status).toBe("PENDING");
    expect(result[1].createdAt).toBe(mockInterviewsFromDb[1].createdAt);
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

describe("interview.getById", () => {
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

  it("should fetch a COMPLETED interview with feedback when includeFeedback is true", async () => {
    // Import after mocking
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const mockInterviewWithFeedback = {
      id: "interview-with-feedback-id",
      userId: "test-user-id",
      status: "COMPLETED" as const,
      jobTitleSnapshot: null,
      jobDescriptionSnapshot: "Senior Developer Position",
      resumeSnapshot: "Resume content",
      idempotencyKey: "test-key-feedback",
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: new Date(),
      endedAt: new Date(),
      resumeId: null,
      jobDescriptionId: null,
      feedback: {
        id: "feedback-id",
        interviewId: "interview-with-feedback-id",
        overallScore: 85,
        strengths: ["Good communication", "Technical knowledge"],
        improvements: ["Practice behavioral questions"],
        detailedFeedback: "Overall great performance...",
        createdAt: new Date(),
      },
    };

    // Mock findUnique to return interview with feedback
    vi.mocked(db.interview.findUnique).mockResolvedValue(mockInterviewWithFeedback);

    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    // ACT: Call getById with includeFeedback: true
    const result = await caller.interview.getById({
      id: "interview-with-feedback-id",
      includeFeedback: true,
    });

    // ASSERT: Should return interview with feedback included
    expect(result).toBeDefined();
    expect(result?.id).toBe("interview-with-feedback-id");
    expect(result?.feedback).toBeDefined();
    expect(result?.feedback?.overallScore).toBe(85);
    expect(result?.feedback?.strengths).toEqual(["Good communication", "Technical knowledge"]);

    // Verify database call included feedback relation
    expect(db.interview.findUnique).toHaveBeenCalledWith({
      where: {
        id: "interview-with-feedback-id",
        userId: "test-user-id",
      },
      include: {
        feedback: true,
      },
    });
  });

  it("should return feedback as null when includeFeedback is true but feedback not generated yet", async () => {
    // Import after mocking
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const mockInterviewWithoutFeedback = {
      id: "interview-no-feedback-id",
      userId: "test-user-id",
      status: "COMPLETED" as const,
      jobTitleSnapshot: null,
      jobDescriptionSnapshot: "Senior Developer Position",
      resumeSnapshot: "Resume content",
      idempotencyKey: "test-key-no-feedback",
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: new Date(),
      endedAt: new Date(),
      resumeId: null,
      jobDescriptionId: null,
      feedback: null, // No feedback generated yet
    };

    // Mock findUnique to return interview without feedback
    vi.mocked(db.interview.findUnique).mockResolvedValue(mockInterviewWithoutFeedback);

    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    // ACT: Call getById with includeFeedback: true
    const result = await caller.interview.getById({
      id: "interview-no-feedback-id",
      includeFeedback: true,
    });

    // ASSERT: Should return interview with feedback as null
    expect(result).toBeDefined();
    expect(result?.id).toBe("interview-no-feedback-id");
    expect(result?.feedback).toBeNull();

    // Verify database call included feedback relation
    expect(db.interview.findUnique).toHaveBeenCalledWith({
      where: {
        id: "interview-no-feedback-id",
        userId: "test-user-id",
      },
      include: {
        feedback: true,
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

describe("interview.getFeedback", () => {
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

  it("should return the interview with feedback when it exists", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const mockInterviewWithFeedback = {
      id: "interview-with-feedback-id",
      userId: "test-user-id",
      feedback: {
        id: "feedback-id",
        summary: "Great job!",
      },
    };

    vi.mocked(db.interview.findUnique).mockResolvedValue(mockInterviewWithFeedback);

    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    const result = await caller.interview.getFeedback({
      interviewId: "interview-with-feedback-id",
    });

    expect(result).toEqual(mockInterviewWithFeedback);
    expect(db.interview.findUnique).toHaveBeenCalledWith({
      where: {
        id: "interview-with-feedback-id",
        userId: "test-user-id",
      },
      include: {
        feedback: true,
      },
    });
  });

  it("should return the interview with null feedback when it does not exist", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const mockInterviewWithoutFeedback = {
      id: "interview-no-feedback-id",
      userId: "test-user-id",
      feedback: null,
    };

    vi.mocked(db.interview.findUnique).mockResolvedValue(mockInterviewWithoutFeedback);

    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    const result = await caller.interview.getFeedback({
      interviewId: "interview-no-feedback-id",
    });

    expect(result?.feedback).toBeNull();
  });

  it("should throw an error if the interview is not found", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    vi.mocked(db.interview.findUnique).mockResolvedValue(null);

    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    await expect(
      caller.interview.getFeedback({
        interviewId: "not-found-id",
      })
    ).rejects.toThrow("Interview not found");
  });

  it("should return mock data for demo interviews when the database is not available", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    vi.mocked(db.interview.findUnique).mockRejectedValue(new Error("DB connection failed"));

    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    const result = await caller.interview.getFeedback({
      interviewId: "demo-123",
    });

    expect(result?.id).toBe("demo-123");
    expect(result?.feedback).toBeDefined();
    expect(result?.feedback?.summary).toBeDefined();
  });
});

describe("interview.generateWsToken", () => {
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

  it("should generate a JWT token for an interview owned by the user", async () => {
    // Import after mocking
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const mockInterview = {
      id: "interview-123",
      userId: "test-user-id",
      status: "PENDING" as const,
      jobTitleSnapshot: null,
      jobDescriptionSnapshot: "Job description",
      resumeSnapshot: "Resume content",
      idempotencyKey: "test-key",
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: null,
      endedAt: null,
      resumeId: null,
      jobDescriptionId: null,
    };

    // Mock findUnique to return the interview
    vi.mocked(db.interview.findUnique).mockResolvedValue(mockInterview);

    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    // ACT: Call generateWsToken
    const result = await caller.interview.generateWsToken({
      interviewId: "interview-123",
    });

    // ASSERT: Should return a token string
    expect(result).toBeDefined();
    expect(typeof result.token).toBe("string");
    expect(result.token.length).toBeGreaterThan(0);

    // Verify the interview was fetched with userId authorization
    expect(db.interview.findUnique).toHaveBeenCalledWith({
      where: {
        id: "interview-123",
        userId: "test-user-id",
      },
    });
  });

  it("should throw NOT_FOUND error when interview does not belong to user", async () => {
    // Import after mocking
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    // Mock findUnique to return null (interview not found or unauthorized)
    vi.mocked(db.interview.findUnique).mockResolvedValue(null);

    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    // ACT & ASSERT: Should throw error
    await expect(
      caller.interview.generateWsToken({
        interviewId: "unauthorized-interview-id",
      })
    ).rejects.toThrow();

    // Verify the interview lookup was attempted
    expect(db.interview.findUnique).toHaveBeenCalledWith({
      where: {
        id: "unauthorized-interview-id",
        userId: "test-user-id",
      },
    });
  });
});