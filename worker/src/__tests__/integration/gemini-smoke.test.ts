// ABOUTME: Smoke test that verifies our Gemini implementation works end-to-end
// ABOUTME: Tests GeminiClient wrapper connecting to real Gemini Live API

import { config } from "dotenv";
import { resolve } from "path";

// Load .env from project root
config({ path: resolve(__dirname, "../../../../.env") });

import { describe, it, expect, beforeAll } from "vitest";
import { Modality } from "@google/genai";
import { GeminiClient } from "../../gemini-client";
import { GEMINI_MODEL } from "../../constants";
import type { GeminiMessage } from "../../interfaces";

describe("Gemini Implementation Smoke Test", () => {
  beforeAll(() => {
    if (!process.env.GEMINI_API_KEY) {
      console.log("Skipping Gemini smoke test: GEMINI_API_KEY not set");
    }
  });

  it.skipIf(!process.env.GEMINI_API_KEY)(
    "GeminiClient should connect, send text, and receive a response",
    async () => {
      // Use OUR GeminiClient implementation, not the raw SDK
      const client = new GeminiClient(process.env.GEMINI_API_KEY!);

      let connectionOpened = false;
      let receivedContent = false;
      let errorOccurred: Error | null = null;

      // Connect using our GeminiClient wrapper
      await client.connect({
        model: GEMINI_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are a test assistant. Respond briefly.",
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            connectionOpened = true;
          },
          onmessage: (message: GeminiMessage) => {
            // Check for actual content, not just setupComplete
            if (message.serverContent) {
              receivedContent = true;
            }
          },
          onerror: (error: Error) => {
            errorOccurred = error;
          },
          onclose: () => {},
        },
      });

      expect(client.isConnected()).toBe(true);
      expect(connectionOpened).toBe(true);
      expect(errorOccurred).toBeNull();

      // Send text using our GeminiClient.sendClientContent method
      // This matches how we send context in gemini-stream-handler.ts
      client.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [{ text: "Hello, say one word." }],
          },
        ],
      });

      // Wait for actual content response (up to 10 seconds)
      const startTime = Date.now();
      while (!receivedContent && Date.now() - startTime < 10000) {
        await new Promise((r) => setTimeout(r, 100));
      }

      client.close();

      expect(client.isConnected()).toBe(false);
      expect(receivedContent).toBe(true);
      expect(errorOccurred).toBeNull();
    },
    15000,
  );
});
