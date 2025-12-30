/**
 * Block-specific system prompt builder for Gemini Live API.
 * Generates prompts that instruct the AI to conduct structured interview blocks.
 * Each block contains exactly one question.
 */

import type { Language } from "./schema";

/** Context required to build a block-specific prompt */
export interface BlockContext {
  blockNumber: number;
  totalBlocks: number;
  language: Language;
  question: string; // Single question per block
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
 * The prompt instructs Gemini to ask the single question and respect time limits.
 */
export function buildBlockPrompt(ctx: BlockContext): string {
  const languageInstruction = LANGUAGE_INSTRUCTIONS[ctx.language];
  const isFirstBlock = ctx.blockNumber === 1;
  const isLastBlock = ctx.blockNumber === ctx.totalBlocks;

  return `You are a ${ctx.persona}.
${languageInstruction}

This is question ${ctx.blockNumber} of ${ctx.totalBlocks} in this interview.
The candidate has ${Math.floor(ctx.answerTimeLimitSec / 60)} minutes to answer.

## Your Question
"${ctx.question}"

## Interview Flow
${isFirstBlock ? "1. Greet the candidate briefly\n2. " : "1. "}Ask the question above
${isFirstBlock ? "3" : "2"}. Listen to the answer, ask 1-2 brief follow-up questions if needed
${isFirstBlock ? "4" : "3"}. When signaled that time is up OR the answer is complete, wrap up${isLastBlock ? " and thank the candidate" : ""}

## Candidate Context
Position: ${ctx.jobDescription}
Background: ${ctx.candidateResume}

## Important Rules
- Stay focused on the assigned question
- Keep follow-ups brief and relevant
- Be encouraging but professional
- When told time is up, acknowledge and wrap up promptly

${isFirstBlock ? "Begin by greeting the candidate and asking the question." : "Begin by asking the question."}`;
}
