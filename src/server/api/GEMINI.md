## Summary of API Endpoints

This defines the following strongly-typed API endpoints optimized for the UI state separation pattern (Zustand handles UI state, tRPC handles business data):

- **`user.getProfile`**: `query` - Gets the current user's data.
- **`user.updateProfile`**: `mutation` - Updates the current user's name/image.
- **`interview.createSession`**: `mutation` - Creates a new interview entry before starting.
- **`interview.getCurrent`**: `query` - Gets the active/most recent interview for UI state coordination.
- **`interview.getHistory`**: `query` - Gets a lightweight list of all past interviews.
- **`interview.getById`**: `query` - Gets all details (including transcript and feedback) for one interview.
- **`interview.getFeedbackStatus`**: `query` - Checks if the results for an interview are ready.

## 1. `user` Router

Handles user profile management. All procedures in this router are protected and require the user to be authenticated.

````typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type User } from "@prisma/client"; // Import Prisma-generated type

export const userRouter = createTRPCRouter({
  /**
   * Fetches the profile of the currently logged-in user.
   */
  getProfile: protectedProcedure
    // No input required, as user is derived from the session context.
    .input(z.void())
    // Returns the full User object.
    .output(z.custom<User>())
    .query(async ({ ctx }) => {
      // Implementation to fetch user from db based on ctx.session.user.id
      // ...
    }),

  /**
   * Updates the profile of the currently logged-in user.
   * Allows updating mutable fields like name or image.
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        image: z.string().url().optional(),
      })
    )
    .output(z.custom<User>())
    .mutation(async ({ ctx, input }) => {
      // Implementation to update the user in the db
      // ...
    }),
});

## 2. `interview` Router

Handles the lifecycle and data of interview sessions. All procedures are protected.

```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  type Interview,
  type InterviewFeedback,
  type TranscriptEntry,
} from "@prisma/client"; // Import Prisma-generated types

// Define a reusable Zod schema for a full interview object
const fullInterviewSchema = z.custom<
  Interview & {
    feedback: InterviewFeedback | null;
    transcript: TranscriptEntry[];
  }
>();

export const interviewRouter = createTRPCRouter({
  /**
   * Creates a new interview record in the database before a live session begins.
   * This is called when the user clicks "Start Interview" for the first time.
   */
  createSession: protectedProcedure
    // No input needed, user is from context.
    .input(z.void())
    // Returns the newly created Interview object.
    .output(z.custom<Interview>())
    .mutation(async ({ ctx }) => {
      // Implementation to create an Interview record with status 'PENDING'
      // linked to the current user.
      // ...
    }),

  /**
   * Gets the current active interview for the logged-in user.
   * Used by UI components to get business data while Zustand manages UI state.
   * Returns the most recent interview that is PENDING or IN_PROGRESS.
   */
  getCurrent: protectedProcedure
    .input(z.void())
    // Returns the current interview or null if none active.
    .output(z.custom<Interview>().nullable())
    .query(async ({ ctx }) => {
      // Implementation to find the most recent interview with status
      // 'PENDING' or 'IN_PROGRESS' for the current user.
      // ...
    }),

  /**
   * Fetches a list of all past interviews for the logged-in user.
   * Used for the user's dashboard or history page. The dashboard page will consume this API to display a list of recent interviews.
   */
  getHistory: protectedProcedure
    .input(z.void())
    // Returns an array of partial Interview objects for display in a list.
    .output(
      z.array(
        z.object({
          id: z.string(),
          createdAt: z.date(),
          status: z.string(),
          // Include a simple feedback summary if available
          feedbackSummary: z.string().optional().nullable(),
        })
      )
    )
    .query(async ({ ctx }) => {
      // Implementation to fetch all interviews for the user,
      // ordered by creation date.
      // ...
    }),

  /**
   * Fetches all details for a single, specific interview session,
   * including its feedback and full transcript.
   * This is used to view the results of a completed interview.
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(), // Ensure the ID is a valid CUID
      })
    )
    // Returns the full interview object, which may or may not have feedback yet.
    .output(fullInterviewSchema.nullable())
    .query(async ({ ctx, input }) => {
      // Implementation to find a specific interview by its ID, ensuring
      // it belongs to the currently logged-in user for security.
      // ...
    }),

  /**
   * (Optional) A procedure for the client to poll to check if feedback
   * for a recently completed interview is ready.
   */
  getFeedbackStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
      })
    )
    .output(
      z.object({
        isReady: z.boolean(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Implementation to check if the InterviewFeedback record exists
      // for the given interview ID.
      // ...
    }),
});
```

## Integration with UI State Management

This API design works seamlessly with the separated UI state pattern:

**UI State (Zustand)**
- Manages view transitions (`Idle`, `Preparing`, `Live`, etc.)
- Handles loading states and reconnection status
- No business data storage

**Business Data (tRPC)**
- `interview.getCurrent` provides the active interview data
- React Query handles caching and synchronization
- Full type safety from database to UI

**Example Integration:**
```typescript
// Component using both systems
function InterviewSession() {
  // UI state from Zustand
  const uiStatus = useInterviewStore(state => state.status);

  // Business data from tRPC
  const { data: currentInterview, isLoading } = api.interview.getCurrent.useQuery();

  if (uiStatus === 'Live' && currentInterview) {
    return <LiveInterviewUI interview={currentInterview} />;
  }

  return <LoadingScreen />;
}
```
