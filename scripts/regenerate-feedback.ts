// ABOUTME: Script to regenerate feedback for an interview that failed silently
// Usage: npx tsx scripts/regenerate-feedback.ts <interviewId>

import { db } from "../src/server/db";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const FeedbackSchema = z.object({
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

async function regenerateFeedback(interviewId: string) {
  console.log(`Regenerating feedback for interview ${interviewId}...`);

  // Get interview context
  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    include: { feedback: true },
  });

  if (!interview) {
    console.log("Interview not found");
    return;
  }

  if (interview.feedback) {
    console.log("Feedback already exists:", interview.feedback.id);
    return;
  }

  const context = {
    jobDescription: interview.jobDescriptionSnapshot || "",
    resume: interview.resumeSnapshot || "",
  };

  console.log("Context:", context);

  // Generate feedback using Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("GEMINI_API_KEY not set");
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an expert technical interviewer. Generate a brief interview feedback for a short test interview.
Force your output to be a valid JSON object matching this schema:
{
  "summary": "High-level summary of the interview",
  "strengths": "Markdown list of strengths",
  "contentAndStructure": "Detailed feedback on the substance and organization of answers",
  "communicationAndDelivery": "Feedback on verbal communication style, pacing, and clarity",
  "presentation": "Feedback on non-verbal cues and professional presence"
}

Context:
Job Description: ${context.jobDescription || "Not provided"}
Candidate Resume: ${context.resume || "Not provided"}

Note: This was a very brief test interview. Generate appropriate feedback based on the context.

Output JSON only.
`;

  try {
    const response = await (ai.models as any).generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    console.log("Raw response:", text);

    if (!text) {
      throw new Error("Empty response");
    }

    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText
        .replace(/^```(json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const json = JSON.parse(cleanText);
    const feedback = FeedbackSchema.parse(json);

    console.log("Parsed feedback:", feedback);

    // Save to database
    const saved = await db.interviewFeedback.create({
      data: {
        interviewId,
        ...feedback,
      },
    });

    console.log("Feedback saved with id:", saved.id);
  } catch (error) {
    console.error("Error:", error);
  }
}

const interviewId = process.argv[2];
if (!interviewId) {
  console.log("Usage: npx tsx scripts/regenerate-feedback.ts <interviewId>");
  process.exit(1);
}

regenerateFeedback(interviewId).catch(console.error);
