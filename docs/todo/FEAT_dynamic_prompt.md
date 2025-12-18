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

### Step 3: Update `InterviewContext` Interface
Modify the `InterviewContext` interface in `worker/src/interfaces/index.ts` to include the `persona` field. The `IApiClient.getContext()` method already exists and returns `InterviewContext`.

```typescript
// File: worker/src/interfaces/index.ts

// ... existing interfaces ...

/**
 * Interview context containing job description, resume, and persona
 * Used for personalized interview questions and feedback generation
 */
export interface InterviewContext {
  jobDescription: string;
  resume: string;
  persona: string; // New field for interviewer persona
}

// IApiClient already has getContext() which returns InterviewContext
// No changes needed to IApiClient interface
```

> **Note**: We intentionally avoid creating an `IPromptBuilder` interface here. The prompt building logic is simple string concatenation that doesn't warrant abstraction. A plain function is sufficient (see Step 4).

### Step 4: Create `buildSystemPrompt` Utility Function
Create a new file `worker/src/utils/build-system-prompt.ts` with a simple function for constructing the dynamic system instruction. Following KISS principles, we use a plain function instead of a class with interface.

This function will be called from `GeminiStreamHandler.connect()` (see Step 6).

```typescript
// File: worker/src/utils/build-system-prompt.ts
// ABOUTME: Utility function for dynamically building the Gemini Live API system instruction.

import type { InterviewContext } from "../interfaces";

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
The `ApiClient` class in `worker/src/api-client.ts` already has a `getContext()` method that calls `interview.getContext`. No code changes needed here - the tRPC endpoint (Step 2) will be updated to return the `persona` field, and the `InterviewContext` type (Step 3) will include it.

```typescript
// File: worker/src/api-client.ts
// The existing getContext() method already handles this:

async getContext(interviewId: string): Promise<InterviewContext> {
  // ... existing implementation ...
  // Will automatically include persona once tRPC endpoint is updated
}
```

> **Note**: If the existing `getContext` method doesn't exist yet, create it following the same pattern as `updateStatus` and `submitTranscript`.

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

### Step 7: Minimal E2E Verification via Raw Worker Test Page

Before integrating into the production app, verify the dynamic prompt works end-to-end using the existing debug page at `src/app/(app)/raw-worker-test/page.tsx`. This provides a minimal, isolated test environment.

**Modifications to raw-worker-test page:**
1. Add textarea inputs for Job Description and Resume
2. Add a text input for Persona (with default value)
3. Pass these values to the worker via query params or WebSocket message
4. Worker uses these to build the system prompt via `buildSystemPrompt`

```typescript
// File: src/app/(app)/raw-worker-test/page.tsx
// Add state for the dynamic prompt inputs
const [jobDescription, setJobDescription] = useState("");
const [resume, setResume] = useState("");
const [persona, setPersona] = useState("professional interviewer");

// Modify connect to pass context via query params
const connect = useCallback(() => {
  setError(null);
  const workerUrl = (
    process.env.NEXT_PUBLIC_WORKER_URL ?? "ws://localhost:8787"
  ).replace(/^http/, "ws");

  // Encode context as query params for debug endpoint
  const params = new URLSearchParams({
    jobDescription,
    resume,
    persona,
  });
  const wsUrl = `${workerUrl}/debug/live-audio?${params.toString()}`;

  console.log(`Connecting to raw endpoint: ${wsUrl}`);
  void clientRef.current?.connect(wsUrl);
}, [jobDescription, resume, persona]);

// Add UI inputs (before the connect button)
<div className="space-y-4">
  <div>
    <label className="block font-medium">Persona</label>
    <input
      type="text"
      value={persona}
      onChange={(e) => setPersona(e.target.value)}
      className="w-full rounded border p-2"
      placeholder="e.g., Senior Technical Interviewer"
    />
  </div>
  <div>
    <label className="block font-medium">Job Description</label>
    <textarea
      value={jobDescription}
      onChange={(e) => setJobDescription(e.target.value)}
      className="w-full rounded border p-2"
      rows={4}
      placeholder="Paste job description here..."
    />
  </div>
  <div>
    <label className="block font-medium">Resume</label>
    <textarea
      value={resume}
      onChange={(e) => setResume(e.target.value)}
      className="w-full rounded border p-2"
      rows={4}
      placeholder="Paste resume here..."
    />
  </div>
</div>
```

**Worker debug endpoint modification** (`worker/src/index.ts`):
Update the `/debug/live-audio` endpoint to read query params and pass them to GeminiSession.

```typescript
// In the debug endpoint handler
const url = new URL(request.url);
const context = {
  jobDescription: url.searchParams.get("jobDescription") ?? "",
  resume: url.searchParams.get("resume") ?? "",
  persona: url.searchParams.get("persona") ?? "professional interviewer",
};

// Pass context to the Durable Object (via query params or separate method)
```

**Verification checklist:**
- [ ] Enter a job description and resume in the test page
- [ ] Connect to the worker
- [ ] Verify in worker logs that `buildSystemPrompt` receives the correct context
- [ ] Verify the AI interviewer's behavior reflects the provided JD/resume

### Step 8: Integrate into Production App

Once Step 7 verification passes, integrate the dynamic prompt into the production interview flow.

**Files to update:**
1. **Interview start flow** - Ensure `persona` is set when creating an interview
2. **Worker session endpoint** - The production `/session` endpoint should use `getInterviewContext` (already covered in Step 6)
3. **Frontend interview page** - No changes needed if context is fetched server-side by worker

The production flow is:
1. User starts interview → Interview record created with JD/resume snapshots
2. Frontend connects to worker with `interviewId`
3. Worker calls `apiClient.getInterviewContext(interviewId)`
4. Worker uses `buildSystemPrompt(context)` to generate system instruction
5. Gemini session starts with dynamic prompt

### Step 9: Testing

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

## Summary

This document provides a 9-step implementation plan for the dynamic prompt feature:

| Step | Description | Scope |
|------|-------------|-------|
| 1 | Database schema update | Backend |
| 2 | tRPC `getWorkerContext` procedure | Backend |
| 3 | Update `IApiClient` interface | Worker |
| 4 | Create `buildSystemPrompt` function | Worker |
| 5 | Update `ApiClient` implementation | Worker |
| 6 | Update `GeminiSession` | Worker |
| 7 | **Minimal E2E verification** (raw-worker-test) | Frontend + Worker |
| 8 | Integrate into production app | Frontend |
| 9 | Unit and integration tests | All |

The plan follows KISS principles by avoiding unnecessary abstraction layers (no `IPromptBuilder` interface, just a simple function).
