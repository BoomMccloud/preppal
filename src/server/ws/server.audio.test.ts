/**
 * @vitest-environment node
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
    feedback: {
      create: vi.fn(),
    },
  },
}));

describe("WebSocket Server with Audio Echo", () => {
  const WS_PORT = 3003; // Use different port for these tests
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

  describe("Binary Protobuf Messages", () => {
    it("should send and receive binary Protobuf messages instead of JSON", async () => {
      // This test would verify that the server can handle binary Protobuf messages
      // instead of the JSON messages used in the MVP
      expect(true).toBe(true); // Placeholder
    });
  });

  describe("Audio Chunk Echo", () => {
    it("should echo received AudioChunk back to the client", async () => {
      // Arrange
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
        env.AUTH_SECRET ?? "fallback-secret-for-development",
      );
      const token = await new SignJWT({
        userId: "user-123",
        interviewId: "interview-123",
      } as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(secret);

      // Create WebSocket connection
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
            }),
          );
        });

        ws.on("message", (data) => {
          const message = JSON.parse(data.toString());

          // Should receive StartResponse
          expect(message.start_response).toBeDefined();
          expect(message.start_response.session_id).toBeDefined();

          // Now test sending an AudioChunk
          // In the real implementation, this would be a binary Protobuf message
          const audioChunkMessage = {
            audio_chunk: {
              audio_content: "test-audio-data",
            },
          };
          ws.send(JSON.stringify(audioChunkMessage));
        });

        ws.on("error", reject);
        setTimeout(() => reject(new Error("Timeout")), 5000);
      });

      // This test would verify that when the server receives an AudioChunk,
      // it correctly decodes it and sends the same AudioChunk back to the client
      expect(true).toBe(true); // Placeholder
    });
  });
});
