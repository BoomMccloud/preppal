/**
 * Zod schemas for interview template validation.
 * Templates define block-based interview structure with language-specific blocks.
 */
import { z } from "zod";

/** Supported interview languages */
export const LanguageSchema = z.enum(["en", "zh"]);

/** Single interview question with optional translation */
export const InterviewQuestionSchema = z.object({
  content: z.string(),
  translation: z.string().optional(),
});

/** Interview block - a segment with specific language and questions */
export const InterviewBlockSchema = z.object({
  language: LanguageSchema,
  durationSec: z.number().int().positive(),
  questions: z.array(InterviewQuestionSchema),
});

/** Complete interview template definition */
export const InterviewTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  persona: z.string().optional(),
  answerTimeLimitSec: z.number().int().positive().default(180),
  blocks: z.array(InterviewBlockSchema).min(1),
});

export type Language = z.infer<typeof LanguageSchema>;
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;
export type InterviewBlock = z.infer<typeof InterviewBlockSchema>;
export type InterviewTemplate = z.infer<typeof InterviewTemplateSchema>;
