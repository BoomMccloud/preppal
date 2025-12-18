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
      update: vi.fn(),
    },
    interviewFeedback: {
      create: vi.fn(),
      upsert: vi.fn(),
    },
    transcriptEntry: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
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
      jobDescriptionSnapshot:
        "We are looking for a senior frontend developer...",
      resumeSnapshot:
        "John Doe - Senior Frontend Developer with 5 years experience...",
      idempotencyKey: "test-key-123",
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: null,
      endedAt: null,
      resumeId: null,
      jobDescriptionId: null,
      persona: null,
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
        content:
          "John Doe - Senior Frontend Developer with 5 years experience...",
      },
      idempotencyKey: "test-key-123",
    });

    // Assert the returned interview has correct properties
    expect(result).toEqual(mockInterview);
    expect(result.status).toBe("PENDING");
    expect(result.userId).toBe("test-user-id");
    expect(result.jobDescriptionSnapshot).toBe(
      "We are looking for a senior frontend developer...",
    );
    expect(result.resumeSnapshot).toBe(
      "John Doe - Senior Frontend Developer with 5 years experience...",
    );
    expect(result.idempotencyKey).toBe("test-key-123");

    // Verify findUnique was called to check for existing interview
    expect(db.interview.findUnique).toHaveBeenCalledWith({
      where: { idempotencyKey: "test-key-123" },
    });

    // Verify create was called with correct data structure
    const createCall = vi.mocked(db.interview.create).mock.calls[0]?.[0];
    expect(createCall?.data.userId).toBe("test-user-id");
    expect(createCall?.data.jobDescriptionSnapshot).toBe(
      "We are looking for a senior frontend developer...",
    );
    expect(createCall?.data.resumeSnapshot).toBe(
      "John Doe - Senior Frontend Developer with 5 years experience...",
    );
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
      persona: null,
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
        userId: "test-user-id",
        status: "COMPLETED" as const,
        jobTitleSnapshot: "Frontend Developer with a very long description",
        jobDescriptionSnapshot:
          "Frontend Developer with a very long description",
        resumeSnapshot: "some resume content",
        idempotencyKey: "idempotency-key-1",
        createdAt: new Date("2023-01-01T00:00:00Z"),
        updatedAt: new Date("2023-01-01T00:00:00Z"),
        startedAt: new Date("2023-01-01T00:00:00Z"),
        endedAt: new Date("2023-01-01T01:00:00Z"),
        resumeId: null,
        jobDescriptionId: null,
        persona: null,
      },
      {
        id: "int-2",
        userId: "test-user-id",
        status: "PENDING" as const,
        jobTitleSnapshot: "Backend Developer",
        jobDescriptionSnapshot: "Backend Developer Description",
        resumeSnapshot: "some other resume content",
        idempotencyKey: "idempotency-key-2",
        createdAt: new Date("2023-01-02T00:00:00Z"),
        updatedAt: new Date("2023-01-02T00:00:00Z"),
        startedAt: null,
        endedAt: null,
        resumeId: null,
        jobDescriptionId: null,
        persona: null,
      },
    ];

    // Mock the database call
    vi.mocked(db.interview.findMany).mockResolvedValue(mockInterviewsFromDb);

    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    // ACT
    const result = await caller.interview.getHistory();

    // ASSERT
    // 1. Check if the result has the transformed shape and all fields
    expect(result).toHaveLength(2);

    // Check first interview
    expect(result![0].id).toBe("int-1");
    expect(result![0].status).toBe("COMPLETED");
    expect(result![0].createdAt).toBe(mockInterviewsFromDb[0].createdAt);
    expect(result![0].jobTitleSnapshot).toBe("Frontend Developer with a very"); // First 30 chars

    // Check second interview
    expect(result![1].id).toBe("int-2");
    expect(result![1].status).toBe("PENDING");
    expect(result![1].createdAt).toBe(mockInterviewsFromDb[1].createdAt);
    expect(result![1].jobTitleSnapshot).toBe("Backend Developer Description");

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
      persona: null,
      feedback: {
        id: "feedback-id",
        interviewId: "interview-with-feedback-id",
        summary: "Overall great performance...",
        strengths: "Good communication, Technical knowledge",
        contentAndStructure: "Overall great performance...",
        communicationAndDelivery: "Clear and concise",
        presentation: "Good posture, eye contact",
        createdAt: new Date(),
      },
    };

    // Mock findUnique to return interview with feedback
    vi.mocked(db.interview.findUnique).mockResolvedValue(
      mockInterviewWithFeedback,
    );

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
    expect(result?.feedback?.summary).toBe("Overall great performance...");
    expect(result?.feedback?.strengths).toBe(
      "Good communication, Technical knowledge",
    );

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
      persona: null,
      feedback: null, // No feedback generated yet
    };

    // Mock findUnique to return interview without feedback
    vi.mocked(db.interview.findUnique).mockResolvedValue(
      mockInterviewWithoutFeedback,
    );

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
      userId: "test-user-id",
      status: "IN_PROGRESS" as const,
      jobTitleSnapshot: "Senior Developer",
      jobDescriptionSnapshot: "Senior Developer Job Description",
      resumeSnapshot: "Senior Developer Resume Content",
      idempotencyKey: "idempotency-key-current",
      createdAt: new Date("2023-03-01T00:00:00Z"),
      updatedAt: new Date("2023-03-01T00:00:00Z"),
      startedAt: new Date("2023-03-01T00:00:00Z"),
      endedAt: null,
      resumeId: null,
      jobDescriptionId: null,
      persona: null,
    };

    // Mock the database call for findFirst
    vi.mocked(db.interview.findFirst).mockResolvedValue(mockCurrentInterview);

    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

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

    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

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

    vi.mocked(db.interview.findUnique).mockResolvedValue(
      mockInterviewWithFeedback,
    );

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

    vi.mocked(db.interview.findUnique).mockResolvedValue(
      mockInterviewWithoutFeedback,
    );

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
      }),
    ).rejects.toThrow("Interview not found");
  });

  it("should return mock data for demo interviews when the database is not available", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    vi.mocked(db.interview.findUnique).mockRejectedValue(
      new Error("DB connection failed"),
    );

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
      persona: null,
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
      }),
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

describe("interview.generateWorkerToken", () => {
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
    vi.resetModules(); // Ensure we can re-import modules with fresh mocks
  });

  it("should fail for an interview not owned by the user", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    // Mock findUnique to return null, simulating not found or not owned
    vi.mocked(db.interview.findUnique).mockResolvedValue(null);

    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    // Expect the call to be rejected
    await expect(
      caller.interview.generateWorkerToken({
        interviewId: "some-other-users-interview",
      }),
    ).rejects.toThrow("Interview not found");

    // Verify it was called correctly
    expect(db.interview.findUnique).toHaveBeenCalledWith({
      where: {
        id: "some-other-users-interview",
        userId: "test-user-id",
      },
    });
  });

  it("should fail for an interview not in PENDING state", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const mockInProgressInterview = {
      id: "in-progress-interview-id",
      userId: "test-user-id",
      status: "IN_PROGRESS" as const,
    };

    // Mock findUnique to return an interview that's already in progress
    vi.mocked(db.interview.findUnique).mockResolvedValue(
      mockInProgressInterview as any,
    );

    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    // Expect the call to be rejected with BAD_REQUEST
    await expect(
      caller.interview.generateWorkerToken({
        interviewId: "in-progress-interview-id",
      }),
    ).rejects.toThrow("Interview is not in PENDING state");
  });

  it("should return a valid, decodable JWT for a valid PENDING interview", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");
    const jose = await import("jose");

    const mockInterview = {
      id: "owned-interview-id",
      userId: "test-user-id",
      status: "PENDING" as const,
      // ... other fields
    };

    // Mock findUnique to return the user-owned interview
    vi.mocked(db.interview.findUnique).mockResolvedValue(mockInterview as any);

    // Set JWT_SECRET for the test environment
    process.env.JWT_SECRET = "test-secret-123";

    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    const { token } = await caller.interview.generateWorkerToken({
      interviewId: "owned-interview-id",
    });

    // Assert that a token string was returned
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);

    // Decode the token to verify its contents using jose
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const decoded = await jose.jwtVerify(token, secret);
    expect(decoded.payload).toMatchObject({
      userId: "test-user-id",
      interviewId: "owned-interview-id",
    });
  });

  it("should JWT contain correct claims including exp and iat", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");
    const jose = await import("jose");

    const mockInterview = {
      id: "owned-interview-id",
      userId: "test-user-id",
      status: "PENDING" as const,
    };

    vi.mocked(db.interview.findUnique).mockResolvedValue(mockInterview as any);
    process.env.JWT_SECRET = "test-secret-123";

    const beforeTime = Math.floor(Date.now() / 1000);
    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });
    const { token } = await caller.interview.generateWorkerToken({
      interviewId: "owned-interview-id",
    });
    const afterTime = Math.floor(Date.now() / 1000);

    // Decode the token to verify its contents using jose
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const decoded = await jose.jwtVerify(token, secret);

    // Verify all required claims exist
    expect(decoded.payload).toHaveProperty("userId");
    expect(decoded.payload).toHaveProperty("interviewId");
    expect(decoded.payload).toHaveProperty("iat");
    expect(decoded.payload).toHaveProperty("exp");

    // Verify iat is within reasonable time
    expect(decoded.payload.iat).toBeGreaterThanOrEqual(beforeTime);
    expect(decoded.payload.iat).toBeLessThanOrEqual(afterTime);

    // Verify exp is 5 minutes from iat (300 seconds)
    const expectedExpiration = (decoded.payload.iat as number) + 300;
    expect(decoded.payload.exp).toBe(expectedExpiration);
  });
});

describe("interview.updateStatus", () => {
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
    vi.resetModules();
    process.env.WORKER_SHARED_SECRET = "test-worker-secret";
  });

  it("should fail without authentication (no session, no shared secret)", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    // Create caller with no session and no auth header
    const caller = createCaller({ db, session: null, headers: new Headers() });

    await expect(
      caller.interview.updateStatus({
        interviewId: "any-interview-id",
        status: "IN_PROGRESS",
      }),
    ).rejects.toThrow("UNAUTHORIZED");
  });

  it("should succeed with session auth for user-owned interview", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const mockInterview = {
      id: "user-interview-id",
      userId: "test-user-id",
      status: "IN_PROGRESS" as const,
      startedAt: new Date(),
      updatedAt: new Date(),
      createdAt: new Date(),
      endedAt: null,
      jobTitleSnapshot: null,
      jobDescriptionSnapshot: "Job description",
      resumeSnapshot: "Resume content",
      idempotencyKey: "test-key",
      resumeId: null,
      jobDescriptionId: null,
      persona: null,
    };

    // Mock findUnique to check ownership
    vi.mocked(db.interview.findUnique).mockResolvedValue(mockInterview);
    // Mock update to return updated interview
    vi.mocked(db.interview.update).mockResolvedValue(mockInterview);

    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    const result = await caller.interview.updateStatus({
      interviewId: "user-interview-id",
      status: "IN_PROGRESS",
    });

    expect(result).toBeDefined();
    expect(db.interview.findUnique).toHaveBeenCalledWith({
      where: {
        id: "user-interview-id",
        userId: "test-user-id",
      },
    });
  });

  it("should fail with session auth for interview not owned by user", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    // Mock findUnique to return null (not owned by user)
    vi.mocked(db.interview.findUnique).mockResolvedValue(null);

    const caller = createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });

    await expect(
      caller.interview.updateStatus({
        interviewId: "other-users-interview-id",
        status: "IN_PROGRESS",
      }),
    ).rejects.toThrow("Interview not found");
  });

  it("should succeed with shared secret auth", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const mockInterview = {
      id: "worker-interview-id",
      userId: "some-user-id",
      status: "IN_PROGRESS" as const,
      startedAt: new Date(),
      updatedAt: new Date(),
      createdAt: new Date(),
      endedAt: null,
      jobTitleSnapshot: null,
      jobDescriptionSnapshot: "Job description",
      resumeSnapshot: "Resume content",
      idempotencyKey: "test-key",
      resumeId: null,
      jobDescriptionId: null,
      persona: null,
    };

    // Mock findUnique to just check existence
    vi.mocked(db.interview.findUnique).mockResolvedValue(mockInterview);
    // Mock update
    vi.mocked(db.interview.update).mockResolvedValue(mockInterview);

    const headers = new Headers();
    headers.set("Authorization", `Bearer ${process.env.WORKER_SHARED_SECRET}`);

    const caller = createCaller({ db, session: null, headers });

    const result = await caller.interview.updateStatus({
      interviewId: "worker-interview-id",
      status: "IN_PROGRESS",
    });

    expect(result).toBeDefined();
    // Worker auth should only verify existence, not ownership
    expect(db.interview.findUnique).toHaveBeenCalledWith({
      where: { id: "worker-interview-id" },
    });
  });

  it("should correctly set startedAt when transitioning to IN_PROGRESS", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const mockInterview = {
      id: "interview-id",
      userId: "test-user-id",
      status: "PENDING" as const,
    };

    vi.mocked(db.interview.findUnique).mockResolvedValue(mockInterview as any);
    vi.mocked(db.interview.update).mockResolvedValue(mockInterview as any);

    const headers = new Headers();
    headers.set("Authorization", `Bearer ${process.env.WORKER_SHARED_SECRET}`);

    const beforeTime = new Date();
    const caller = createCaller({ db, session: null, headers });

    await caller.interview.updateStatus({
      interviewId: "interview-id",
      status: "IN_PROGRESS",
    });
    const afterTime = new Date();

    const updateCall = vi.mocked(db.interview.update).mock.calls[0]?.[0];
    expect(updateCall?.data).toHaveProperty("startedAt");
    const startedAt = (updateCall?.data as any).startedAt as Date;
    expect(startedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(startedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });

  it("should correctly set endedAt when transitioning to COMPLETED or ERROR", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const mockInterview = {
      id: "interview-id",
      userId: "test-user-id",
      status: "IN_PROGRESS" as const,
    };

    vi.mocked(db.interview.findUnique).mockResolvedValue(mockInterview as any);
    vi.mocked(db.interview.update).mockResolvedValue(mockInterview as any);

    const headers = new Headers();
    headers.set("Authorization", `Bearer ${process.env.WORKER_SHARED_SECRET}`);

    const providedEndedAt = new Date().toISOString();
    const caller = createCaller({ db, session: null, headers });

    await caller.interview.updateStatus({
      interviewId: "interview-id",
      status: "COMPLETED",
      endedAt: providedEndedAt,
    });

    const updateCall = vi.mocked(db.interview.update).mock.calls[0]?.[0];
    expect(updateCall?.data).toHaveProperty("endedAt");
    expect(updateCall?.data).toHaveProperty("status", "COMPLETED");
  });
});

describe("interview.submitTranscript", () => {
  const mockTranscript = [
    {
      speaker: "USER" as const,
      content: "Hello",
      timestamp: "2024-01-01T10:00:00Z",
    },
    {
      speaker: "AI" as const,
      content: "Hi, how can I help?",
      timestamp: "2024-01-01T10:00:05Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.WORKER_SHARED_SECRET = "test-worker-secret";
  });

  it("should fail if the shared secret is missing", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const caller = createCaller({ db, session: null, headers: new Headers() });

    await expect(
      caller.interview.submitTranscript({
        interviewId: "any-interview-id",
        transcript: mockTranscript,
        endedAt: "2024-01-01T10:05:00Z",
      }),
    ).rejects.toThrow("UNAUTHORIZED");
  });

  it("should fail if the shared secret is incorrect", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const headers = new Headers();
    headers.set("Authorization", "Bearer incorrect-secret");

    const caller = createCaller({ db, session: null, headers });

    await expect(
      caller.interview.submitTranscript({
        interviewId: "any-interview-id",
        transcript: mockTranscript,
        endedAt: "2024-01-01T10:05:00Z",
      }),
    ).rejects.toThrow("UNAUTHORIZED");
  });

  it("should successfully save transcript entries and update status to COMPLETED in a transaction", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    // Mock the transaction
    const mockTransaction = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.$transaction).mockImplementation(mockTransaction as any);

    const headers = new Headers();
    headers.set("Authorization", `Bearer ${process.env.WORKER_SHARED_SECRET}`);

    const caller = createCaller({ db, session: null, headers });

    const result = await caller.interview.submitTranscript({
      interviewId: "target-interview-id",
      transcript: mockTranscript,
      endedAt: "2024-01-01T10:05:00Z",
    });

    expect(result).toBeDefined();

    // Verify transaction was called
    expect(db.$transaction).toHaveBeenCalled();
  });

  it("should handle idempotency correctly (same timestamp entries)", async () => {
    const { db } = await import("~/server/db");
    const { createCaller } = await import("~/server/api/root");

    const mockTransaction = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.$transaction).mockImplementation(mockTransaction as any);

    const headers = new Headers();
    headers.set("Authorization", `Bearer ${process.env.WORKER_SHARED_SECRET}`);

    const caller = createCaller({ db, session: null, headers });

    // First call
    await caller.interview.submitTranscript({
      interviewId: "target-interview-id",
      transcript: mockTranscript,
      endedAt: "2024-01-01T10:05:00Z",
    });

    // Second call with same data should not throw
    await expect(
      caller.interview.submitTranscript({
        interviewId: "target-interview-id",
        transcript: mockTranscript,
        endedAt: "2024-01-01T10:05:00Z",
      }),
    ).resolves.toBeDefined();
  });

  describe("submitFeedback (P0)", () => {
    const mockFeedback = {
      interviewId: "target-interview-id",
      summary: "Excellent performance in the behavioral interview.",
      strengths: "- Clear communication\n- Strong examples of leadership",
      contentAndStructure: "Markdown content about structure...",
      communicationAndDelivery: "Markdown content about delivery...",
      presentation: "Markdown content about presentation...",
    };

    it("should create an InterviewFeedback record with valid input", async () => {
      const { db } = await import("~/server/db");
      const { createCaller } = await import("~/server/api/root");

      const headers = new Headers();
      headers.set(
        "Authorization",
        `Bearer ${process.env.WORKER_SHARED_SECRET}`,
      );

      const caller = createCaller({ db, session: null, headers });

      // Mock finding the interview
      vi.mocked(db.interview.findUnique).mockResolvedValue({
        id: "target-interview-id",
      } as any);

      // Mock the db.interviewFeedback.upsert call
      vi.mocked(db.interviewFeedback.upsert).mockResolvedValue({
        id: "feedback-id",
        ...mockFeedback,
        createdAt: new Date(),
      } as any);

      const result = await (caller.interview as any).submitFeedback(
        mockFeedback,
      );

      expect(result).toBeDefined();
      expect(db.interviewFeedback.upsert).toHaveBeenCalledWith({
        where: { interviewId: mockFeedback.interviewId },
        update: {
          summary: mockFeedback.summary,
          strengths: mockFeedback.strengths,
          contentAndStructure: mockFeedback.contentAndStructure,
          communicationAndDelivery: mockFeedback.communicationAndDelivery,
          presentation: mockFeedback.presentation,
        },
        create: mockFeedback,
      });
    });

    it("should throw UNAUTHORIZED if the shared secret is missing", async () => {
      const { db } = await import("~/server/db");
      const { createCaller } = await import("~/server/api/root");

      const caller = createCaller({
        db,
        session: null,
        headers: new Headers(),
      });

      await expect(
        (caller.interview as any).submitFeedback(mockFeedback),
      ).rejects.toThrow("UNAUTHORIZED");
    });

    it("should throw NOT_FOUND if the interview does not exist", async () => {
      const { db } = await import("~/server/db");
      const { createCaller } = await import("~/server/api/root");

      const headers = new Headers();
      headers.set(
        "Authorization",
        `Bearer ${process.env.WORKER_SHARED_SECRET}`,
      );

      const caller = createCaller({ db, session: null, headers });

      // Mock interview not found
      vi.mocked(db.interview.findUnique).mockResolvedValue(null);

      await expect(
        (caller.interview as any).submitFeedback(mockFeedback),
      ).rejects.toThrow("Interview not found");
    });

    it("should validate the feedback schema using Zod", async () => {
      const { db } = await import("~/server/db");
      const { createCaller } = await import("~/server/api/root");

      const headers = new Headers();
      headers.set(
        "Authorization",
        `Bearer ${process.env.WORKER_SHARED_SECRET}`,
      );

      const caller = createCaller({ db, session: null, headers });

      // @ts-expect-error - testing invalid input
      await expect(
        (caller.interview as any).submitFeedback({ interviewId: "test" }),
      ).rejects.toThrow();
    });
  });
});
