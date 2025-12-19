/**
 * Interview duration constants - Maps Prisma enum values to milliseconds.
 *
 * These values must match the InterviewDuration enum in prisma/schema.prisma
 * and the duration handling in worker/src/gemini-session.ts.
 */
export const INTERVIEW_DURATION_MS = {
  SHORT: 10 * 60 * 1000, // 10 minutes
  STANDARD: 30 * 60 * 1000, // 30 minutes
  EXTENDED: 60 * 60 * 1000, // 60 minutes
} as const;

export type InterviewDuration = keyof typeof INTERVIEW_DURATION_MS;

/**
 * Grace period for client-side safety timeout.
 * The client timeout is set to durationMs + SAFETY_TIMEOUT_GRACE_MS
 * to ensure the worker's timeout fires first (authoritative).
 */
export const SAFETY_TIMEOUT_GRACE_MS = 60 * 1000; // 1 minute

/**
 * Custom WebSocket close codes (4000-4999 range is application-defined).
 * These provide atomic signaling of session end reason, avoiding race conditions
 * between message events and close events.
 *
 * Must match the values in worker/src/constants.ts
 */
export const WS_CLOSE_USER_INITIATED = 4001;
export const WS_CLOSE_TIMEOUT = 4002;
export const WS_CLOSE_GEMINI_ENDED = 4003;
export const WS_CLOSE_ERROR = 4004;
