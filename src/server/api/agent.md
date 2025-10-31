## Summary of API Endpoints

This document outlines the tRPC API structure, which is divided into two main parts: a public-facing API for the client application and a private, internal API for server-to-server communication.

### Public API (`appRouter`)

This is the main, client-facing router. All procedures are available to the Next.js frontend.

- **`user.getProfile`**: `query` - Gets the current user's data.
- **`user.updateProfile`**: `mutation` - Updates the current user's profile.
- **`interview.createSession`**: `mutation` - Creates a new interview entry before starting.
- **`interview.getCurrent`**: `query` - Gets the active/most recent interview for UI state coordination.
- **`interview.getHistory`**: `query` - Gets a lightweight list of all past interviews.
- **`interview.getById`**: `query` - Gets all details for one interview.
- **`interview.getFeedback`**: `query` - Gets the feedback for an interview.
- **`interview.generateWorkerToken`**: `mutation` - Generates a short-lived JWT to authorize a WebSocket connection to the Cloudflare Worker.

### Internal API (`internalRouter`)

This is a private router, not exposed to the client. It is used for secure communication from the Cloudflare Worker back to the main application.

- **`internal.submitTranscript`**: `mutation` - Allows the Cloudflare Worker to submit the final interview transcript to the database.

---

## 1. Public Routers (`user`, `interview`)

These routers are merged into the main `appRouter` and are accessible by the client.

### `user` Router

Handles user profile management. All procedures are protected and require an authenticated user session.

```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type User } from "@prisma/client";

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.input(z.void()).output(z.custom<User>()).query(/* ... */),
  updateProfile: protectedProcedure
    .input(z.object({ name: z.string().optional(), image: z.string().optional() }))
    .output(z.custom<User>())
    .mutation(/* ... */),
});
```

### `interview` Router

Handles the client-facing lifecycle and data of interview sessions. All procedures are protected.

```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type Interview, type InterviewFeedback, type TranscriptEntry } from "@prisma/client";

export const interviewRouter = createTRPCRouter({
  /**
   * Creates a new interview record. Called when the user starts a new session.
   * Idempotent based on the `idempotencyKey`.
   */
  createSession: protectedProcedure.input(/* ... */).output(z.custom<Interview>()).mutation(/* ... */),

  /**
   * Gets the current active (IN_PROGRESS) interview for the logged-in user.
   */
  getCurrent: protectedProcedure.input(z.void()).output(z.custom<Interview>().nullable()).query(/* ... */),

  /**
   * Fetches a list of all past interviews for the logged-in user.
   */
  getHistory: protectedProcedure.input(z.void()).output(z.array(/* ... */)).query(/* ... */),

  /**
   * Fetches all details for a single, specific interview session.
   */
  getById: protectedProcedure.input(z.object({ id: z.string() })).output(/* ... */).query(/* ... */),

  /**
   * Fetches the feedback for a given interview.
   */
  getFeedback: protectedProcedure.input(z.object({ interviewId: z.string() })).output(/* ... */).query(/* ... */),

  /**
   * Generates a short-lived (5 min) JWT for authenticating a WebSocket connection
   * to the Cloudflare Worker for a specific interview.
   */
  generateWorkerToken: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .output(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Verify interview belongs to ctx.session.user.id
      // 2. Generate JWT with userId and interviewId in claims
      // 3. Sign with JWT_SECRET
      // ...
    }),
});
```

---

## 2. Internal Router (`internal`)

This router is **not** merged into the main `appRouter`. It is exposed on a separate, secure API route (`/api/internal/[trpc]`) and is only intended for server-to-server communication.

### `internal` Router

```typescript
import { z } from "zod";
import { createTRPCRouter, internalProcedure } from "~/server/api/trpc";

export const internalRouter = createTRPCRouter({
  /**
   * Secure endpoint for the Cloudflare Worker to submit the completed
   * interview transcript. Authenticated via a shared secret.
   */
  submitTranscript: internalProcedure
    .input(
      z.object({
        interviewId: z.string(),
        transcript: z.array(
          z.object({
            speaker: z.enum(["USER", "AI"]),
            content: z.string(),
            timestamp: z.date(),
          })
        ),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Authenticated by `internalProcedure` middleware (shared secret)
      // 2. Save transcript entries to the database in a transaction.
      // ...
    }),
});
```

### `internalProcedure` Middleware

To secure the `internalRouter`, a custom `internalProcedure` is created in `src/server/api/trpc.ts`. This middleware rejects any request that does not contain the correct `WORKER_SHARED_SECRET` in the `Authorization` header, ensuring that only our trusted Cloudflare Worker can access these endpoints.
