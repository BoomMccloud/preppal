/**
 * Zod schemas for interview-related input validation.
 * Extracted from interview router for reusability.
 */
import { z } from "zod";

/** Discriminated union for job description input - either inline text or reference */
export const JobDescriptionInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal("reference"),
    jobDescriptionId: z.string(),
  }),
]);

/** Discriminated union for resume input - either inline text or reference */
export const ResumeInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal("reference"),
    resumeId: z.string(),
  }),
]);

export type JobDescriptionInputType = z.infer<typeof JobDescriptionInput>;
export type ResumeInputType = z.infer<typeof ResumeInput>;
