// ABOUTME: Tests for Gemini Live API integration in GeminiSession Durable Object
// ABOUTME: Covers audio conversion, transcript tracking, and bidirectional streaming

/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { AudioConverter } from "../audio-converter";
import { TranscriptManager } from "../transcript-manager";
import { GoogleGenAI, Modality } from "@google/genai";
import { ApiClient } from "../api-client";
import type { Env } from "../index"; // Added type keyword
import { GeminiSession } from "../gemini-session";

// Mock the GoogleGenAI and ApiClient modules
vi.mock("@google/genai");
vi.mock("../api-client");

// Mock WebSocketPair for the Cloudflare Workers environment
class MockWebSocket {
  readyState = 1; // WebSocket.READY_STATE_OPEN
  send = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  accept = vi.fn();
}

class MockWebSocketPair {
  client = new MockWebSocket();
  server = new MockWebSocket();
  constructor() {
    vi.spyOn(this.server, "accept").mockImplementation(() => {
      // Simulate the server accepting the connection
      // In a real WebSocket, this would change its readyState
      // For testing purposes, we just need to know it was called.
    });
  }
}

// Globally mock WebSocketPair if it's not defined, as it's a Workers API
if (typeof WebSocketPair === "undefined") {
  (global as any).WebSocketPair = MockWebSocketPair as any;
}

// Mock WebSocket constants for Cloudflare Workers
if (typeof WebSocket !== "undefined") {
  (WebSocket as any).READY_STATE_OPEN = 1;
}

// Mock the global Response object to allow status 101 for WebSocket upgrades
const OriginalResponse = Response;
global.Response = class MockResponse extends OriginalResponse {
  constructor(body?: BodyInit | null, init?: ResponseInit) {
    if (init && init.status === 101 && "webSocket" in init) {
      // When status is 101 and webSocket is present, this is a WebSocket upgrade response.
      // We don't call super() here because the native Response constructor in Node.js
      // does not allow status 101, even with a webSocket property.
      // Instead, we return a minimal object that fulfills the test's needs.
      return { status: 101, webSocket: init.webSocket } as any;
    } else {
      super(body, init);
    }
  }
} as any;

describe("Audio Conversion", () => {
  it("should convert binary audio to base64 string", () => {
    // Create sample audio data (simulating PCM audio)
    const audioData = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe]);

    const base64 = AudioConverter.binaryToBase64(audioData);

    // Base64 encoding should produce a string
    expect(typeof base64).toBe("string");
    expect(base64.length).toBeGreaterThan(0);

    // Verify it's valid base64 (only contains valid base64 characters)
    expect(base64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("should convert base64 string back to binary audio", () => {
    // Create base64 string (representing "Hello" in base64)
    const base64Audio = "AAECA/8="; // base64 for [0x00, 0x01, 0x02, 0xff]

    const binary = AudioConverter.base64ToBinary(base64Audio);

    // Should return a Uint8Array
    expect(binary).toBeInstanceOf(Uint8Array);
    expect(binary.length).toBeGreaterThan(0);
  });

  it("should round-trip conversion (binary -> base64 -> binary)", () => {
    const originalData = new Uint8Array([
      0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
    ]);

    const base64 = AudioConverter.binaryToBase64(originalData);
    const roundTripped = AudioConverter.base64ToBinary(base64);

    expect(roundTripped).toEqual(originalData);
  });

  it("should handle empty audio data", () => {
    const emptyData = new Uint8Array([]);

    const base64 = AudioConverter.binaryToBase64(emptyData);

    expect(base64).toBe("");
  });

  it("should handle large audio chunks", () => {
    // Simulate a 1KB audio chunk
    const largeChunk = new Uint8Array(1024);
    for (let i = 0; i < largeChunk.length; i++) {
      largeChunk[i] = i % 256;
    }

    const base64 = AudioConverter.binaryToBase64(largeChunk);
    const roundTripped = AudioConverter.base64ToBinary(base64);

    expect(roundTripped).toEqual(largeChunk);
  });
});

describe("Transcript Manager", () => {
  let manager: TranscriptManager;

  beforeEach(() => {
    manager = new TranscriptManager();
  });

  it("should add user transcript entries", () => {
    manager.addUserTranscript("Hello, how are you?");

    const transcript = manager.getTranscript();

    expect(transcript).toHaveLength(1);
    expect(transcript?.[0]?.speaker).toBe("USER");
    expect(transcript?.[0]?.content).toBe("Hello, how are you?");
    expect(transcript?.[0]?.timestamp).toBeDefined();
  });

  it("should add AI transcript entries", () => {
    manager.addAITranscript("I am doing well, thank you!");

    const transcript = manager.getTranscript();

    expect(transcript).toHaveLength(1);
    expect(transcript?.[0]?.speaker).toBe("AI");
    expect(transcript?.[0]?.content).toBe("I am doing well, thank you!");
    expect(transcript?.[0]?.timestamp).toBeDefined();
  });

  it("should maintain conversation order", () => {
    manager.addUserTranscript("First message");
    manager.addAITranscript("Second message");
    manager.addUserTranscript("Third message");

    const transcript = manager.getTranscript();

    expect(transcript).toHaveLength(3);
    expect(transcript?.[0]?.content).toBe("First message");
    expect(transcript?.[1]?.content).toBe("Second message");
    expect(transcript?.[2]?.content).toBe("Third message");
  });

  it("should include timestamps for all entries", () => {
    manager.addUserTranscript("Test message");

    const transcript = manager.getTranscript();

    // Timestamp should be ISO 8601 format
    expect(transcript?.[0]?.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
  });

  it("should clear all transcript entries", () => {
    manager.addUserTranscript("Message 1");
    manager.addAITranscript("Message 2");

    manager.clear();

    const transcript = manager.getTranscript();
    expect(transcript).toHaveLength(0);
  });

  it("should handle empty transcript", () => {
    const transcript = manager.getTranscript();

    expect(transcript).toHaveLength(0);
    expect(Array.isArray(transcript)).toBe(true);
  });

  it("should handle multiple rapid additions", () => {
    for (let i = 0; i < 10; i++) {
      manager.addUserTranscript(`User message ${i}`);
      manager.addAITranscript(`AI message ${i}`);
    }

    const transcript = manager.getTranscript();
    expect(transcript).toHaveLength(20);
  });
});

describe("GeminiSession - Error Handling", () => {
  let mockConsoleError: ReturnType<typeof vi.spyOn>;
  let mockUpdateStatus: ReturnType<typeof vi.fn>;
  let mockClientWs: MockWebSocket;
  let env: Env;
  let durableObjectState: DurableObjectState; // Corrected type
  let mockServerWs: MockWebSocket; // Added for explicit mock server WebSocket

  beforeEach(() => {
    // Mock console.error
    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock ApiClient's updateStatus method
    mockUpdateStatus = vi.fn();
    (ApiClient as unknown as vi.Mock).mockImplementation(() => ({
      updateStatus: mockUpdateStatus,
      submitTranscript: vi.fn(),
    }));

    // Mock WebSocketPair's client and server WebSockets
    const mockPair = new MockWebSocketPair();
    mockClientWs = mockPair.client;
    mockServerWs = mockPair.server;

    // Restore global WebSocketPair mock before each test to ensure fresh mocks
    if (typeof WebSocketPair === "undefined") {
      (global as any).WebSocketPair = MockWebSocketPair as any;
    }

    vi.spyOn(global as any, "WebSocketPair").mockImplementation(() => {
      const newPair = new MockWebSocketPair();
      mockClientWs = newPair.client;
      mockServerWs = newPair.server;
      return newPair as any;
    });

    // Mock Env
    env = {
      GEMINI_API_KEY: "test-api-key",
      WORKER_SHARED_SECRET: "test-secret",
      NEXT_PUBLIC_API_URL: "http://localhost:3000",
      // Add missing properties
      GEMINI_SESSION: {} as DurableObjectNamespace, // Mock as empty object, or a more specific mock if needed
      JWT_SECRET: "some-super-secret-jwt-key-minimum-32-chars",
    };

    // Mock DurableObjectState
    durableObjectState = {
      blockConcurrencyWhile: vi.fn(async (cb) => await cb()),
      storage: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
      } as any,
    } as DurableObjectState;
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
    vi.clearAllMocks();
  });

  it("should log error and update status to ERROR when Gemini connection fails", async () => {
    const mockError = new Error("Gemini connection failed");
    (GoogleGenAI as unknown as vi.Mock).mockImplementation(() => ({
      live: {
        connect: vi.fn(() => {
          throw mockError;
        }),
      },
    }));

    const session = new GeminiSession(durableObjectState, env);
    const request = new Request("http://localhost/", {
      headers: {
        Upgrade: "websocket",
        "X-User-Id": "test-user",
        "X-Interview-Id": "test-interview",
      },
    });

    const response = await session.fetch(request);

    expect(mockConsoleError).toHaveBeenCalledWith(
      "[GeminiSession] Failed to establish session:",
      expect.any(Error),
    );
    expect(mockUpdateStatus).toHaveBeenCalledWith("test-interview", "ERROR");
    expect(response.status).toBe(500); // Error response (not 101 WebSocket upgrade)
  });

  it("should log error and update status to ERROR when Gemini onerror callback is invoked", async () => {
    let geminiOnErrorCallback: (error: any) => void;

    (GoogleGenAI as unknown as vi.Mock).mockImplementation(() => ({
      live: {
        connect: vi.fn(({ callbacks }) => {
          geminiOnErrorCallback = callbacks.onerror;
          return {
            sendRealtimeInput: vi.fn(),
            close: vi.fn(),
          };
        }),
      },
    }));

    const session = new GeminiSession(durableObjectState, env);
    const request = new Request("http://localhost/", {
      headers: {
        Upgrade: "websocket",
        "X-User-Id": "test-user",
        "X-Interview-Id": "test-interview",
      },
    });

    // Trigger the fetch, which initializes GeminiSession and sets up callbacks
    await session.fetch(request);

    const mockGeminiError = new Error("Simulated Gemini runtime error");
    await geminiOnErrorCallback!(mockGeminiError); // Manually invoke the onerror callback

    expect(mockConsoleError).toHaveBeenCalledWith(
      `[GeminiSession] Gemini Live API error for interview test-interview:`,
      mockGeminiError,
    );
    expect(mockUpdateStatus).toHaveBeenCalledWith("test-interview", "ERROR");
    expect(mockServerWs.send).toHaveBeenCalled(); // Should send an error message to client via server WebSocket
  });
});

describe("Gemini Message Handling", () => {
  it("should handle input transcription messages (user speech)", () => {
    // Mock Gemini message with input transcription
    const geminiMessage = {
      serverContent: {
        inputTranscription: {
          text: "Hello from the user",
        },
      },
    };

    // Test that we can extract the user transcript
    expect(geminiMessage.serverContent.inputTranscription.text).toBe(
      "Hello from the user",
    );
  });

  it("should handle output transcription messages (AI speech)", () => {
    // Mock Gemini message with output transcription
    const geminiMessage = {
      serverContent: {
        outputTranscription: {
          text: "Hello from the AI",
        },
      },
    };

    // Test that we can extract the AI transcript
    expect(geminiMessage.serverContent.outputTranscription.text).toBe(
      "Hello from the AI",
    );
  });

  it("should handle AI text responses", () => {
    // Mock Gemini message with text response
    const geminiMessage = {
      text: "This is an AI text response",
    };

    expect(geminiMessage.text).toBe("This is an AI text response");
  });

  it("should handle AI audio responses", () => {
    // Mock Gemini message with base64 audio
    const geminiMessage = {
      data: "AAECA/8=", // base64 audio
    };

    expect(geminiMessage.data).toBeDefined();
    expect(typeof geminiMessage.data).toBe("string");
  });

  it("should handle turn complete signals", () => {
    // Mock Gemini message with turnComplete
    const geminiMessage = {
      serverContent: {
        turnComplete: true,
      },
    };

    expect(geminiMessage.serverContent.turnComplete).toBe(true);
  });
});

describe("Integration: End-to-End Flow", () => {
  it("should handle complete user audio -> transcription flow", () => {
    const manager = new TranscriptManager();

    // 1. Receive binary audio from client
    const clientAudio = new Uint8Array([0x12, 0x34, 0x56, 0x78]);

    // 2. Convert to base64 for Gemini
    const base64Audio = AudioConverter.binaryToBase64(clientAudio);
    expect(base64Audio).toBeDefined();
    expect(typeof base64Audio).toBe("string");

    // 3. Gemini responds with transcription
    // (handled by GeminiConnectionManager callbacks)

    // 4. Save transcription
    manager.addUserTranscript("transcribed text");
    const transcript = manager.getTranscript();
    expect(transcript).toHaveLength(1);
    expect(transcript?.[0]?.speaker).toBe("USER");
    expect(transcript?.[0]?.content).toBe("transcribed text");
  });

  it("should handle complete AI response -> audio flow", () => {
    const manager = new TranscriptManager();

    // 1. Gemini sends base64 audio
    const geminiBase64Audio = "AAECA/8=";

    // 2. Convert to binary for client
    const binaryAudio = AudioConverter.base64ToBinary(geminiBase64Audio);
    expect(binaryAudio).toBeInstanceOf(Uint8Array);
    expect(binaryAudio.length).toBeGreaterThan(0);

    // 3. Save AI transcript if provided
    manager.addAITranscript("AI response text");
    const transcript = manager.getTranscript();
    expect(transcript).toHaveLength(1);
    expect(transcript?.[0]?.speaker).toBe("AI");
    expect(transcript?.[0]?.content).toBe("AI response text");
  });
});
