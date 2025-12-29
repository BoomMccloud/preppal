import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const FeedbackSchema = z.object({
  summary: z.string().nullable().transform((v) => v ?? ""),
  strengths: z.string().nullable().transform((v) => v ?? ""),
  contentAndStructure: z.string().nullable().transform((v) => v ?? ""),
  communicationAndDelivery: z.string().nullable().transform((v) => v ?? ""),
  presentation: z.string().nullable().transform((v) => v ?? ""),
});

export type FeedbackData = z.infer<typeof FeedbackSchema>;

/**
 * Generate interview feedback from transcript text.
 * @param transcriptText - Pre-formatted transcript ("SPEAKER: content" per line)
 * @param context - Interview context (job description, resume)
 * @param apiKey - Gemini API key
 */
export async function generateFeedback(
  transcriptText: string,
  context: { jobDescription: string; resume: string },
  apiKey: string,
): Promise<FeedbackData> {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.0-flash"; // Use a stable standard model for feedback

  const prompt = `
You are an expert technical interviewer. Analyze the following transcript of a behavioral interview.
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

Transcript:
${transcriptText}

Output JSON only.
`;

  try {
    const response = await (ai.models as any).generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    // Clean up potential markdown code blocks
    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText
        .replace(/^```(json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const json = JSON.parse(cleanText);
    return FeedbackSchema.parse(json);
  } catch (error) {
    console.error("Error generating feedback:", error);
    throw error;
  }
}
