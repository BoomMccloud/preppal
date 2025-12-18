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

// ... rest of interfaces ...
```

> **Note**: We intentionally avoid creating an `IPromptBuilder` interface here. The prompt building logic is simple string concatenation that doesn't warrant abstraction. A plain function is sufficient (see Step 4).

### Step 4: Create `buildSystemPrompt` Utility Function
Create a new file `worker/src/utils/build-system-prompt.ts` with a simple function for constructing the dynamic system instruction. Following KISS principles, we use a plain function instead of a class with interface.

```typescript
// File: worker/src/utils/build-system-prompt.ts
// ABOUTME: Utility function for dynamically building the Gemini Live API system instruction.

export interface InterviewContext {
  jobDescription: string;
  resume: string;
  persona: string;
}

/**
 * Builds the system instruction string for the Gemini Live API.
 */
export function buildSystemPrompt(context: InterviewContext): string {
  const jdSection = context.jobDescription
    ? `\n\nJOB DESCRIPTION:\n${context.jobDescription}`
    : "";
  const resumeSection = context.resume
    ? `\n\nCANDIDATE RESUME:\n${context.resume}`
    : "";

  return `You are a ${context.persona}.
Your goal is to conduct a behavioral interview.${jdSection}${resumeSection}

Start by introducing yourself and asking the candidate to introduce themselves.`;
}
```

> **Design Decision**: A simple exported function is preferred over a class because:
> - The logic is pure string concatenation with no state
> - No dependency injection is needed for this simple operation
> - Easier to test (just call the function with inputs)
> - Reduces boilerplate and cognitive overhead

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
Modify `worker/src/gemini-session.ts` to import and use the `buildSystemPrompt` function when connecting to Gemini. No class instantiation or dependency injection needed.

```typescript
// File: worker/src/gemini-session.ts

// ... existing imports ...
import { buildSystemPrompt } from "./utils/build-system-prompt";

/**
 * Durable Object managing individual Gemini Live API WebSocket sessions
 * Coordinates WebSocket connections, Gemini API interactions, and transcript management
 */
export class GeminiSession implements DurableObject {
  // ... existing properties and constructor (no changes needed) ...

  /**
   * Initialize Gemini Live API connection with dynamic system instruction
   */
  private async initializeGemini(ws: WebSocket): Promise<void> {
    try {
      console.log(`[GeminiSession] Connecting to Gemini Live API`);

      // Fetch interview context from the backend
      const interviewContext = await this.apiClient.getInterviewContext(this.interviewId!);

      // Build the dynamic system instruction using simple utility function
      const systemInstruction = buildSystemPrompt(interviewContext);

      await this.geminiClient.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction,
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

> **Simplification**: Note that we no longer need to:
> - Add a `promptBuilder` property to the class
> - Initialize a `PromptBuilder` instance in the constructor
> - Import any interface for the prompt builder
>
> The function is simply imported and called where needed.

### Step 7: Testing

**Unit Tests for `buildSystemPrompt`** (`worker/src/__tests__/utils/build-system-prompt.test.ts`):
Testing a pure function is straightforward - no mocking required.

```typescript
import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../../utils/build-system-prompt";

describe("buildSystemPrompt", () => {
  it("builds prompt with all fields populated", () => {
    const result = buildSystemPrompt({
      jobDescription: "Software Engineer at Acme",
      resume: "5 years experience...",
      persona: "Senior Technical Interviewer",
    });

    expect(result).toContain("Senior Technical Interviewer");
    expect(result).toContain("JOB DESCRIPTION:");
    expect(result).toContain("Software Engineer at Acme");
    expect(result).toContain("CANDIDATE RESUME:");
    expect(result).toContain("5 years experience");
  });

  it("omits job description section when empty", () => {
    const result = buildSystemPrompt({
      jobDescription: "",
      resume: "Some resume",
      persona: "HR Manager",
    });

    expect(result).not.toContain("JOB DESCRIPTION:");
    expect(result).toContain("CANDIDATE RESUME:");
  });

  it("omits resume section when empty", () => {
    const result = buildSystemPrompt({
      jobDescription: "Some JD",
      resume: "",
      persona: "HR Manager",
    });

    expect(result).toContain("JOB DESCRIPTION:");
    expect(result).not.toContain("CANDIDATE RESUME:");
  });
});
```

**Integration Tests for `ApiClient.getInterviewContext`**: Test that the `ApiClient` can successfully call the new tRPC endpoint and retrieve the interview context.

**Integration Tests for `GeminiSession`**: Verify that `GeminiSession` calls `getInterviewContext` and uses the result to build the system instruction via `buildSystemPrompt`.

---

This document provides a simplified implementation plan for the dynamic prompt feature, following KISS principles by avoiding unnecessary abstraction layers.
