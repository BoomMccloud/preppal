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
