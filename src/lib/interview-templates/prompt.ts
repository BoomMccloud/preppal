/**
 * Block-specific system prompt builder for Gemini Live API.
 * Generates prompts that instruct the AI to conduct structured interview blocks.
 */

import type { Language } from "./schema";

/** Context required to build a block-specific prompt */
export interface BlockContext {
  blockNumber: number;
  language: Language;
  durationSec: number;
  questions: string[];
  answerTimeLimitSec: number;
  jobDescription: string;
  candidateResume: string;
  persona: string;
}

/** Language-specific instructions for the AI interviewer */
export const LANGUAGE_INSTRUCTIONS: Record<Language, string> = {
  en: "Conduct this entire block in English only.",
  zh: "Conduct this entire block in Mandarin Chinese only (全程使用中文).",
} as const;

/**
 * Builds a system prompt for a specific interview block.
 * The prompt instructs Gemini to ask questions in order and respect time limits.
 */
export function buildBlockPrompt(ctx: BlockContext): string {
  const languageInstruction = LANGUAGE_INSTRUCTIONS[ctx.language];
  const questionList = ctx.questions
    .map((q, i) => `${i + 1}. "${q}"`)
    .join("\n");

  return `You are a ${ctx.persona}.
${languageInstruction}

This is block ${ctx.blockNumber} of a structured interview.
You have ${Math.floor(ctx.durationSec / 60)} minutes for this block.

## Your Questions (ask in order)
${questionList}

## Per-Answer Time Limit
Each answer is limited to ${Math.floor(ctx.answerTimeLimitSec / 60)} minutes.
When you receive a message saying "time's up", acknowledge briefly and move to the next question.

## Interview Flow
1. Greet the candidate (first block only)
2. Ask Question 1
3. Listen to answer, ask 1-2 brief follow-up questions if needed
4. When signaled OR answer is complete, move to Question 2
5. Repeat for remaining questions
6. When all questions are done, thank the candidate

## Candidate Context
Position: ${ctx.jobDescription}
Background: ${ctx.candidateResume}

## Important Rules
- Stay focused on the assigned questions
- Ask questions in the specified order
- Keep follow-ups brief and relevant
- Be encouraging but professional
- When told time is up, move on promptly

Begin by greeting the candidate and asking the first question.`;
}
