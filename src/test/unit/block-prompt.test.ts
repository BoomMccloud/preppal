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
  totalBlocks: 6,
  language: "en",
  question: "Tell me about yourself",
  answerTimeLimitSec: 180,
  jobDescription: "Software Engineer at Google",
  candidateResume: "5 years experience",
  persona: "Senior hiring manager",
};

describe("buildBlockPrompt", () => {
  it("should include the question", () => {
    const prompt = buildBlockPrompt(baseContext);

    expect(prompt).toContain("Tell me about yourself");
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

  it("should indicate block number and total", () => {
    const prompt = buildBlockPrompt({
      ...baseContext,
      blockNumber: 2,
      totalBlocks: 6,
    });

    expect(prompt).toContain("2");
    expect(prompt).toContain("6");
  });

  it("should include candidate context", () => {
    const prompt = buildBlockPrompt(baseContext);

    expect(prompt).toContain("Software Engineer at Google");
    expect(prompt).toContain("5 years experience");
  });
});
