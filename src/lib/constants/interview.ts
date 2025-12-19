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
