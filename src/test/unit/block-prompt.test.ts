/**
 * Unit tests for block-specific system prompt builder.
 * Tests essential behavior without brittle substring matching.
 */

import { describe, it, expect } from "vitest";
import {
  buildBlockPrompt,
  type BlockContext,
} from "~/lib/interview-templates/prompt";

const baseContext: BlockContext = {
  blockNumber: 1,
  language: "en",
  durationSec: 600,
  questions: ["Question 1?", "Question 2?", "Question 3?"],
  answerTimeLimitSec: 180,
  jobDescription: "Software Engineer at Google",
  candidateResume: "5 years experience",
  persona: "Senior hiring manager",
};

describe("buildBlockPrompt", () => {
  it("should include all questions", () => {
    const prompt = buildBlockPrompt(baseContext);

    expect(prompt).toContain("Question 1?");
    expect(prompt).toContain("Question 2?");
    expect(prompt).toContain("Question 3?");
  });

  it("should include English instruction for en language", () => {
    const prompt = buildBlockPrompt({ ...baseContext, language: "en" });

    expect(prompt.toLowerCase()).toContain("english");
  });

  it("should include Chinese instruction for zh language", () => {
    const prompt = buildBlockPrompt({ ...baseContext, language: "zh" });

    // Could be "Chinese", "Mandarin", or "中文"
    const hasChinese =
      prompt.toLowerCase().includes("chinese") ||
      prompt.toLowerCase().includes("mandarin") ||
      prompt.includes("中文");

    expect(hasChinese).toBe(true);
  });
});
