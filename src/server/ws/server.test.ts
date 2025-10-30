/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import WebSocket from "ws";
import { SignJWT } from "jose";
import { env } from "~/env";

// Mock the database module
vi.mock("~/server/db", () => ({
  db: {
    interview: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("WebSocket Server", () => {
  const WS_PORT = 3002; // Use different port for tests
  const WS_URL = `ws://localhost:${WS_PORT}`;
  let server: { close: () => Promise<void> };

  beforeAll(async () => {
    // Import and start the WebSocket server
    const { startServer } = await import("~/server/ws/server");
    server = startServer(WS_PORT);
  });

  afterAll(async () => {
    // Close the server after tests
    if (server) {
      await server.close();
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should accept connection with valid auth token and send StartResponse", async () => {
      const { db } = await import("~/server/db");

      // Mock interview exists and belongs to user
      vi.mocked(db.interview.findUnique).mockResolvedValue({
        id: "interview-123",
        userId: "user-123",
        status: "PENDING",
        jobTitleSnapshot: null,
        jobDescriptionSnapshot: "Job description",
        resumeSnapshot: "Resume",
        idempotencyKey: "key-123",
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: null,
        endedAt: null,
        resumeId: null,
        jobDescriptionId: null,
      });

      // Mock update to IN_PROGRESS
      vi.mocked(db.interview.update).mockResolvedValue({
        id: "interview-123",
        userId: "user-123",
        status: "IN_PROGRESS",
        jobTitleSnapshot: null,
        jobDescriptionSnapshot: "Job description",
        resumeSnapshot: "Resume",
        idempotencyKey: "key-123",
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: new Date(),
        endedAt: null,
        resumeId: null,
        jobDescriptionId: null,
      });

      // Generate valid token
      const secret = new TextEncoder().encode(
        env.AUTH_SECRET ?? "fallback-secret-for-development"
      );
      const token = await new SignJWT({
        userId: "user-123",
        interviewId: "interview-123",
      } as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(secret);

      // This test will fail until we implement the server
      const ws = new WebSocket(WS_URL);

      await new Promise<void>((resolve, reject) => {
        ws.on("open", () => {
          // Send StartRequest
          ws.send(
            JSON.stringify({
              start_request: {
                auth_token: token,
                interview_id: "interview-123",
                audio_config: {
                  encoding: "LINEAR_PCM",
                  sample_rate_hertz: 16000,
                },
              },
            })
          );
        });

        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());

          // Should receive StartResponse
          expect(message.start_response).toBeDefined();
          expect(message.start_response.session_id).toBeDefined();

          ws.close();
          resolve();
        });

        ws.on("error", reject);
        setTimeout(() => reject(new Error("Timeout")), 5000);
      });

      // Verify interview was updated to IN_PROGRESS
      expect(db.interview.update).toHaveBeenCalledWith({
        where: { id: "interview-123" },
        data: {
          status: "IN_PROGRESS",
          startedAt: expect.any(Date),
        },
      });
    });

    it("should close connection with invalid auth token", async () => {
      const ws = new WebSocket(WS_URL);

      await new Promise<void>((resolve, reject) => {
        ws.on("open", () => {
          // Send StartRequest with invalid token
          ws.send(
            JSON.stringify({
              start_request: {
                auth_token: "invalid-token",
                interview_id: "interview-123",
                audio_config: {
                  encoding: "LINEAR_PCM",
                  sample_rate_hertz: 16000,
                },
              },
            })
          );
        });

        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());

          // Should receive Error
          expect(message.error).toBeDefined();
          expect(message.error.message).toContain("authentication");
        });

        ws.on("close", () => {
          resolve();
        });

        ws.on("error", reject);
        setTimeout(() => reject(new Error("Timeout")), 5000);
      });
    });

    it("should reject connection when interview does not belong to user", async () => {
      const { db } = await import("~/server/db");

      // Mock interview not found
      vi.mocked(db.interview.findUnique).mockResolvedValue(null);

      // Generate valid token
      const secret = new TextEncoder().encode(
        env.AUTH_SECRET ?? "fallback-secret-for-development"
      );
      const token = await new SignJWT({
        userId: "user-123",
        interviewId: "interview-456",
      } as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(secret);

      const ws = new WebSocket(WS_URL);

      await new Promise<void>((resolve, reject) => {
        ws.on("open", () => {
          ws.send(
            JSON.stringify({
              start_request: {
                auth_token: token,
                interview_id: "interview-456",
                audio_config: {
                  encoding: "LINEAR_PCM",
                  sample_rate_hertz: 16000,
                },
              },
            })
          );
        });

        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());

          // Should receive Error
          expect(message.error).toBeDefined();
          expect(message.error.message).toContain("not found");
        });

        ws.on("close", () => {
          resolve();
        });

        ws.on("error", reject);
        setTimeout(() => reject(new Error("Timeout")), 5000);
      });
    });
  });

  describe("State Management", () => {
    it("should update interview status to COMPLETED on EndRequest", async () => {
      const { db } = await import("~/server/db");

      // Mock interview exists
      vi.mocked(db.interview.findUnique).mockResolvedValue({
        id: "interview-123",
        userId: "user-123",
        status: "PENDING",
        jobTitleSnapshot: null,
        jobDescriptionSnapshot: "Job description",
        resumeSnapshot: "Resume",
        idempotencyKey: "key-123",
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: null,
        endedAt: null,
        resumeId: null,
        jobDescriptionId: null,
      });

      // Mock updates
      vi.mocked(db.interview.update).mockResolvedValue({
        id: "interview-123",
        userId: "user-123",
        status: "COMPLETED",
        jobTitleSnapshot: null,
        jobDescriptionSnapshot: "Job description",
        resumeSnapshot: "Resume",
        idempotencyKey: "key-123",
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: new Date(),
        endedAt: new Date(),
        resumeId: null,
        jobDescriptionId: null,
      });

      // Generate valid token
      const secret = new TextEncoder().encode(
        env.AUTH_SECRET ?? "fallback-secret-for-development"
      );
      const token = await new SignJWT({
        userId: "user-123",
        interviewId: "interview-123",
      } as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(secret);

      const ws = new WebSocket(WS_URL);

      await new Promise<void>((resolve, reject) => {
        let startResponseReceived = false;

        ws.on("open", () => {
          ws.send(
            JSON.stringify({
              start_request: {
                auth_token: token,
                interview_id: "interview-123",
                audio_config: {
                  encoding: "LINEAR_PCM",
                  sample_rate_hertz: 16000,
                },
              },
            })
          );
        });

        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());

          if (message.start_response && !startResponseReceived) {
            startResponseReceived = true;
            // Send EndRequest
            ws.send(JSON.stringify({ end_request: {} }));
          } else if (message.session_ended) {
            // Should receive SessionEnded
            expect(message.session_ended.reason).toBe("USER_INITIATED");
            ws.close();
            resolve();
          }
        });

        ws.on("error", reject);
        setTimeout(() => reject(new Error("Timeout")), 5000);
      });

      // Verify interview was updated to COMPLETED
      expect(db.interview.update).toHaveBeenCalledWith({
        where: { id: "interview-123" },
        data: {
          status: "COMPLETED",
          endedAt: expect.any(Date),
        },
      });
    });
  });
});
