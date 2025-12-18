import { describe, it, expect, beforeEach, vi } from "vitest";
import { GeminiClient } from "../gemini-client";
import { Modality } from "@google/genai";

// Mock the @google/genai module
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    live: {
      connect: vi.fn().mockResolvedValue({
        sendRealtimeInput: vi.fn(),
        sendClientContent: vi.fn(),
        close: vi.fn(),
      }),
    },
  })),
  Modality: {
    AUDIO: "AUDIO",
    TEXT: "TEXT",
  },
}));

describe("GeminiClient", () => {
  let client: GeminiClient;

  beforeEach(() => {
    client = new GeminiClient("test-api-key");
  });

  it("should not be connected initially", () => {
    expect(client.isConnected()).toBe(false);
  });

  it("should connect to Gemini", async () => {
    await client.connect({
      model: "test-model",
      config: {
        responseModalities: ["AUDIO"],
        systemInstruction: "Test instruction",
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {},
        onmessage: () => {},
        onerror: () => {},
        onclose: () => {},
      },
    });

    expect(client.isConnected()).toBe(true);
  });

  it("should throw if connecting when already connected", async () => {
    await client.connect({
      model: "test-model",
      config: {
        responseModalities: ["AUDIO"],
        systemInstruction: "Test",
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {},
        onmessage: () => {},
        onerror: () => {},
        onclose: () => {},
      },
    });

    await expect(
      client.connect({
        model: "test-model",
        config: {
          responseModalities: ["AUDIO"],
          systemInstruction: "Test",
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {},
          onmessage: () => {},
          onerror: () => {},
          onclose: () => {},
        },
      }),
    ).rejects.toThrow("already connected");
  });

  it("should close connection", async () => {
    await client.connect({
      model: "test-model",
      config: {
        responseModalities: ["AUDIO"],
        systemInstruction: "Test",
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {},
        onmessage: () => {},
        onerror: () => {},
        onclose: () => {},
      },
    });

    client.close();

    expect(client.isConnected()).toBe(false);
  });

  it("should throw when sending realtime input if not connected", () => {
    expect(() => {
      client.sendRealtimeInput({
        audio: {
          data: "base64data",
          mimeType: "audio/pcm",
        },
      });
    }).toThrow("not connected");
  });

  it("should throw when sending client content if not connected", () => {
    expect(() => {
      client.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [{ text: "Hello" }],
          },
        ],
      });
    }).toThrow("not connected");
  });

  it("should send realtime input when connected", async () => {
    await client.connect({
      model: "test-model",
      config: {
        responseModalities: ["AUDIO"],
        systemInstruction: "Test",
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {},
        onmessage: () => {},
        onerror: () => {},
        onclose: () => {},
      },
    });

    // Should not throw
    expect(() => {
      client.sendRealtimeInput({
        audio: {
          data: "base64data",
          mimeType: "audio/pcm",
        },
      });
    }).not.toThrow();
  });

  it("should send client content when connected", async () => {
    await client.connect({
      model: "test-model",
      config: {
        responseModalities: ["AUDIO"],
        systemInstruction: "Test",
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {},
        onmessage: () => {},
        onerror: () => {},
        onclose: () => {},
      },
    });

    // Should not throw
    expect(() => {
      client.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [{ text: "Hello" }],
          },
        ],
      });
    }).not.toThrow();
  });
});
