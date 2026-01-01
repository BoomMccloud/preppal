// ABOUTME: Server-side Gemini API client for feedback generation
// ABOUTME: Follows pattern from worker/src/utils/feedback.ts

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env } from "~/env";

// Schema for block-level feedback
const BlockFeedbackSchema = z.object({
  summary: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
  strengths: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
  areasForImprovement: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
});

export type BlockFeedbackData = z.infer<typeof BlockFeedbackSchema>;

// Schema for interview-level feedback (matches existing InterviewFeedback model)
const InterviewFeedbackSchema = z.object({
  summary: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
  strengths: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
  contentAndStructure: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
  communicationAndDelivery: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
  presentation: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
});

export type InterviewFeedbackData = z.infer<typeof InterviewFeedbackSchema>;

/**
 * Call Gemini API to generate content.
 * Handles the API quirks and returns the response text.
 */
async function callGemini(
  ai: GoogleGenAI,
  model: string,
  prompt: string,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const response = await (ai.models as any).generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const text: string = response.text?.trim() ?? "";

  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  // Clean up potential markdown code blocks
  let cleanText = text;
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
  }

  return cleanText;
}

/**
 * Generate feedback for a single block's transcript.
 */
export async function callGeminiForBlockFeedback(
  transcriptText: string,
  context: { jobDescription: string; resume: string },
): Promise<BlockFeedbackData> {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const model = "gemini-2.0-flash";

  const prompt = `
You are an expert interviewer. Analyze this interview block transcript.
Output JSON matching: { "summary": string, "strengths": string, "areasForImprovement": string }

Context:
Job Description: ${context.jobDescription || "Not provided"}
Candidate Resume: ${context.resume || "Not provided"}

Transcript:
${transcriptText}

Provide concise, actionable feedback. Output JSON only.
`;

  try {
    const responseText = await callGemini(ai, model, prompt);
    return BlockFeedbackSchema.parse(JSON.parse(responseText));
  } catch (error) {
    console.error("[GeminiClient] Block feedback generation failed:", error);
    throw error;
  }
}

/**
 * Generate holistic feedback for the entire interview based on all block feedbacks.
 */
export async function callGeminiForInterviewFeedback(
  blockFeedbacks: Array<{
    summary: string;
    strengths: string;
    areasForImprovement: string;
  }>,
  context: { jobDescription: string; resume: string },
): Promise<InterviewFeedbackData> {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const model = "gemini-2.0-flash";

  const blockSummaries = blockFeedbacks
    .map(
      (bf, i) =>
        `Block ${i + 1}:\nSummary: ${bf.summary}\nStrengths: ${bf.strengths}\nAreas: ${bf.areasForImprovement}`,
    )
    .join("\n\n");

  const prompt = `
You are an expert interviewer. Based on the feedback from each interview block, provide holistic interview feedback.
Output JSON matching:
{
  "summary": "Overall interview summary",
  "strengths": "Key strengths across all blocks",
  "contentAndStructure": "Feedback on substance and organization of answers",
  "communicationAndDelivery": "Feedback on verbal communication style, pacing, clarity",
  "presentation": "Feedback on professional presence and non-verbal cues"
}

Context:
Job Description: ${context.jobDescription || "Not provided"}
Candidate Resume: ${context.resume || "Not provided"}

Block Feedbacks:
${blockSummaries}

Synthesize the block feedbacks into comprehensive interview feedback. Output JSON only.
`;

  try {
    const responseText = await callGemini(ai, model, prompt);
    return InterviewFeedbackSchema.parse(JSON.parse(responseText));
  } catch (error) {
    console.error(
      "[GeminiClient] Interview feedback generation failed:",
      error,
    );
    throw error;
  }
}
