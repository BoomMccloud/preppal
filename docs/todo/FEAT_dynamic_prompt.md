# Feature: Dynamic Gemini System Prompt

## Overview
This document outlines the steps to implement dynamic system prompt generation for the Gemini Live API, leveraging the ongoing Cloudflare Worker refactoring. The goal is to allow the system prompt to be constructed dynamically based on the job description, user resume, and interviewer persona, which will be fetched from the backend.

## Integration with Refactoring Workflow
This feature is designed to be integrated during or after Phase 6 ("Refactor GeminiSession") of the `cloudflare-refactor-practical.md` plan, as it depends on the established interface patterns and the refactored `GeminiSession` structure.

## Implementation Steps

### Step 1: Database Schema Update
Add a `persona` field to the `Interview` model in `prisma/schema.prisma`. This will store the interviewer persona (e.g., "HR Manager", "Senior Engineer") for each interview session.

```prisma
// File: prisma/schema.prisma
// ...
model Interview {
  // ... existing fields ...
  persona String? // New field for interviewer persona
  // ...
}
```

### Step 2: Extend Interview Context in tRPC Router
Create a new tRPC procedure `getWorkerContext` in `src/server/api/routers/interview.ts`. This procedure will allow the Cloudflare Worker to fetch the necessary details (job description, resume, persona) for constructing the system prompt.

```typescript
// File: src/server/api/routers/interview.ts
// ... existing imports and procedures ...

export const interviewRouter = createTRPCRouter({
  // ... existing procedures ...

  getWorkerContext: workerProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const interview = await ctx.db.interview.findUniqueOrThrow({
        where: { id: input.interviewId },
        select: {
          jobDescriptionSnapshot: true,
          resumeSnapshot: true,
          persona: true, // Include the new persona field
        },
      });
      return {
        jobDescription: interview.jobDescriptionSnapshot ?? "",
        resume: interview.resumeSnapshot ?? "",
        persona: interview.persona ?? "professional interviewer", // Default persona if not set
      };
    }),

  // ... rest of the router ...
});
```

### Step 3: Update `IApiClient` Interface
Modify the `IApiClient` interface in `worker/src/interfaces/index.ts` to include the `getInterviewContext` method.

```typescript
// File: worker/src/interfaces/index.ts

// ... existing interfaces ...

/**
 * Interface for API communication with Next.js backend
 */
export interface IApiClient {
  updateStatus(interviewId: string, status: string): Promise<void>;
  submitTranscript(
    interviewId: string,
    transcript: Array<{
      speaker: "USER" | "AI";
      content: string;
      timestamp: string;
    }>,
    endedAt: string
  ): Promise<void>;
  getInterviewContext(interviewId: string): Promise<{
    jobDescription: string;
    resume: string;
    persona: string;
  }>; // New method
}

/**
 * Interface for building the Gemini system prompt
 */
export interface IPromptBuilder {
  build(context: {
    jobDescription: string;
    resume: string;
    persona: string;
  }): string;
}

// ... rest of interfaces ...
```

### Step 4: Implement `PromptBuilder`
Create a new file `worker/src/prompt-builder.ts` and implement the `IPromptBuilder` interface. This class will encapsulate the logic for constructing the dynamic system instruction.

```typescript
// File: worker/src/prompt-builder.ts
// ABOUTME: Service for dynamically building the Gemini Live API system instruction.

import type { IPromptBuilder } from "./interfaces";

/**
 * Service for dynamically building the Gemini Live API system instruction.
 * Constructs the prompt using job description, resume, and interviewer persona.
 */
export class PromptBuilder implements IPromptBuilder {
  /**
   * Builds the system instruction string for the Gemini Live API.
   * @param context An object containing the job description, candidate resume, and interviewer persona.
   * @returns The dynamically generated system instruction string.
   */
  build(context: { jobDescription: string; resume: string; persona: string }): string {
    const jdSection = context.jobDescription
      ? `

JOB DESCRIPTION:
${context.jobDescription}`
      : "";
    const resumeSection = context.resume
      ? `

CANDIDATE RESUME:
${context.resume}`
      : "";

    return `
      You are a ${context.persona}.
      Your goal is to conduct a behavioral interview.
      ${jdSection}
      ${resumeSection}
      Start by introducing yourself and asking the candidate to introduce themselves.
    `.trim();
  }
}
```

### Step 5: Update `ApiClient` Implementation
Modify the `ApiClient` class in `worker/src/api-client.ts` to implement the `getInterviewContext` method.

```typescript
// File: worker/src/api-client.ts
// ... existing imports ...
import type { IApiClient } from "./interfaces"; // Ensure IApiClient is imported

// ... TranscriptEntry interface ...

export class ApiClient implements IApiClient { // Ensure it implements IApiClient
  // ... constructor and existing methods ...

  async getInterviewContext(
    interviewId: string
  ): Promise<{ jobDescription: string; resume: string; persona: string }> {
    const url = `${this.apiUrl}/api/trpc/interview.getWorkerContext`;

    const requestBody = {
      json: { interviewId },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.workerSecret}`,
        },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      console.error(
        `[API] Network error calling getWorkerContext for interview ${interviewId}:`,
        error
      );
      throw new Error(
        `Network error calling getWorkerContext: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[API] getWorkerContext HTTP error details for interview ${interviewId}:`,
        errorText
      );
      throw new Error(
        `HTTP error calling getWorkerContext: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const jsonResponse = await response.json();
    if (jsonResponse.error) {
      const error = jsonResponse.error;
      console.error(
        `[API] getWorkerContext tRPC error for interview ${interviewId}:`,
        error
      );
      throw new Error(
        `tRPC error in getWorkerContext: ${error.json?.message || "Unknown tRPC error"}`
      );
    }

    const result = jsonResponse.result.data;
    console.log(
      `[API] Successfully fetched worker context for interview ${interviewId}:`,
      result
    );
    return result;
  }
}
```

### Step 6: Update `GeminiSession`
Modify `worker/src/gemini-session.ts` to inject the `IPromptBuilder` and use it to dynamically generate the `systemInstruction` when connecting to Gemini.

```typescript
// File: worker/src/gemini-session.ts

// ... existing imports ...
import { PromptBuilder } from "./prompt-builder"; // Import the concrete implementation

// Import new interfaces
import type {
  IPromptBuilder, // Import the new IPromptBuilder interface
} from "./interfaces";

/**
 * Durable Object managing individual Gemini Live API WebSocket sessions
 * Coordinates WebSocket connections, Gemini API interactions, and transcript management
 */
export class GeminiSession implements DurableObject {
  // ... existing properties ...

  // Dependencies
  private transcriptManager: ITranscriptManager;
  private audioConverter: IAudioConverter;
  private apiClient: IApiClient;
  private geminiClient: IGeminiClient;
  private wsMessageHandler: WebSocketMessageHandler;
  private geminiMessageHandler: GeminiMessageHandler;
  private promptBuilder: IPromptBuilder; // New dependency

  constructor(
    private state: DurableObjectState,
    private env: Env
  ) {
    // ... existing service initializations ...
    this.apiClient = new ApiClient(
      env.NEXT_PUBLIC_API_URL,
      env.WORKER_SHARED_SECRET
    );
    this.geminiClient = new GeminiClient(env.GEMINI_API_KEY);

    // Initialize handlers
    this.wsMessageHandler = new WebSocketMessageHandler();
    this.geminiMessageHandler = new GeminiMessageHandler(
      this.transcriptManager,
      this.audioConverter
    );
    this.promptBuilder = new PromptBuilder(); // Initialize PromptBuilder
  }

  // ... existing fetch method ...

  /**
   * Initialize Gemini Live API connection with dynamic system instruction
   */
  private async initializeGemini(ws: WebSocket): Promise<void> {
    try {
      console.log(`[GeminiSession] Connecting to Gemini Live API`);

      // Fetch interview context from the backend
      const interviewContext = await this.apiClient.getInterviewContext(this.interviewId!);

      // Build the dynamic system instruction
      const systemInstruction = this.promptBuilder.build(interviewContext);

      await this.geminiClient.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction, // Use the dynamically generated instruction
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => this.handleGeminiOpen(),
          onmessage: (message: GeminiMessage) => this.handleGeminiMessage(ws, message),
          onerror: (error: Error) => this.handleGeminiError(ws, error),
          onclose: () => this.handleGeminiClose(ws),
        },
      });

      console.log(`[GeminiSession] Gemini connection established`);

      // Send initial greeting to start the interview
      this.geminiClient.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [{ text: "Hello, let's start the interview." }],
            turnComplete: true,
          },
        ],
      });

      console.log("[GeminiSession] Sent initial greeting to Gemini");
    } catch (error) {
      throw new GeminiConnectionError(
        "Failed to initialize Gemini connection",
        error as Error
      );
    }
  }

  // ... rest of the class ...
}
```

### Step 7: Testing
*   **Unit Tests for `PromptBuilder`**: Verify that the `PromptBuilder` correctly constructs the system instruction based on various inputs (JD, resume, persona, or missing fields).
*   **Integration Tests for `ApiClient` (`getInterviewContext`)**: Test that the `ApiClient` can successfully call the new tRPC endpoint and retrieve the interview context.
*   **Integration Tests for `GeminiSession`**: (Requires mocking the `IApiClient` and `IPromptBuilder` dependencies) Verify that `GeminiSession` calls `getInterviewContext` and passes the resulting data to `IPromptBuilder`, and then uses the generated instruction in `geminiClient.connect`.

This new file provides a detailed breakdown for implementing the dynamic prompt feature, aligning with the architectural improvements from the ongoing refactoring.
