/**
 * Unit tests for block-specific system prompt builder.
 * Tests the generation of Gemini system prompts for interview blocks.
 */

import { describe, it, expect } from "vitest";
import {
  buildBlockPrompt,
  LANGUAGE_INSTRUCTIONS,
  type BlockContext,
} from "~/lib/interview-templates/prompt";

// =============================================================================
// Test Data
// =============================================================================

const baseContext: BlockContext = {
  blockNumber: 1,
  language: "en",
  durationSec: 600,
  questions: [
    "Tell me about a time you led a team.",
    "What is your greatest achievement?",
    "Where do you see yourself in 10 years?",
  ],
  answerTimeLimitSec: 180,
  jobDescription: "Software Engineer at Google",
  candidateResume: "5 years experience in full-stack development",
  persona: "Senior hiring manager at a top tech company",
};

// =============================================================================
// Unit Tests: Language Instructions
// =============================================================================

describe("LANGUAGE_INSTRUCTIONS", () => {
  it("should have instruction for English", () => {
    expect(LANGUAGE_INSTRUCTIONS.en).toBeDefined();
    expect(LANGUAGE_INSTRUCTIONS.en.toLowerCase()).toContain("english");
  });

  it("should have instruction for Chinese", () => {
    expect(LANGUAGE_INSTRUCTIONS.zh).toBeDefined();
    expect(
      LANGUAGE_INSTRUCTIONS.zh.includes("中文") ||
        LANGUAGE_INSTRUCTIONS.zh.toLowerCase().includes("chinese") ||
        LANGUAGE_INSTRUCTIONS.zh.toLowerCase().includes("mandarin")
    ).toBe(true);
  });
});

// =============================================================================
// Unit Tests: Block Prompt Builder
// =============================================================================

describe("buildBlockPrompt", () => {
  describe("Language Instructions", () => {
    it("should include language instruction for English", () => {
      const prompt = buildBlockPrompt({ ...baseContext, language: "en" });

      expect(prompt.toLowerCase()).toContain("english");
    });

    it("should include language instruction for Chinese", () => {
      const prompt = buildBlockPrompt({ ...baseContext, language: "zh" });

      expect(
        prompt.includes("中文") ||
          prompt.toLowerCase().includes("chinese") ||
          prompt.toLowerCase().includes("mandarin")
      ).toBe(true);
    });
  });

  describe("Questions", () => {
    it("should include all questions in order", () => {
      const prompt = buildBlockPrompt(baseContext);

      // Check all questions are present
      for (const question of baseContext.questions) {
        expect(prompt).toContain(question);
      }

      // Check ordering (question 1 appears before question 2, etc.)
      const q1Index = prompt.indexOf(baseContext.questions[0]!);
      const q2Index = prompt.indexOf(baseContext.questions[1]!);
      const q3Index = prompt.indexOf(baseContext.questions[2]!);

      expect(q1Index).toBeLessThan(q2Index);
      expect(q2Index).toBeLessThan(q3Index);
    });

    it("should number questions", () => {
      const prompt = buildBlockPrompt(baseContext);

      expect(prompt).toMatch(/1\.\s*["']?Tell me about a time you led a team/);
      expect(prompt).toMatch(/2\.\s*["']?What is your greatest achievement/);
      expect(prompt).toMatch(/3\.\s*["']?Where do you see yourself/);
    });

    it("should handle single question", () => {
      const singleQuestionContext: BlockContext = {
        ...baseContext,
        questions: ["Only one question here?"],
      };

      const prompt = buildBlockPrompt(singleQuestionContext);

      expect(prompt).toContain("Only one question here?");
      expect(prompt).toMatch(/1\.\s*["']?Only one question/);
    });
  });

  describe("Persona", () => {
    it("should include persona", () => {
      const prompt = buildBlockPrompt(baseContext);

      expect(prompt).toContain(baseContext.persona);
    });

    it("should handle empty persona gracefully", () => {
      const noPersonaContext: BlockContext = {
        ...baseContext,
        persona: "",
      };

      // Should not throw
      const prompt = buildBlockPrompt(noPersonaContext);
      expect(prompt).toBeDefined();
    });
  });

  describe("Block Number", () => {
    it("should include block number", () => {
      const prompt = buildBlockPrompt(baseContext);

      expect(prompt).toContain("block 1");
    });

    it("should handle different block numbers", () => {
      const block2Context: BlockContext = {
        ...baseContext,
        blockNumber: 2,
      };

      const prompt = buildBlockPrompt(block2Context);

      expect(prompt).toContain("block 2");
    });
  });

  describe("Time Limits", () => {
    it("should include answer time limit", () => {
      const prompt = buildBlockPrompt(baseContext);

      // 180 seconds = 3 minutes
      expect(
        prompt.includes("3 minute") || prompt.includes("180 second")
      ).toBe(true);
    });

    it("should include block duration", () => {
      const prompt = buildBlockPrompt(baseContext);

      // 600 seconds = 10 minutes
      expect(
        prompt.includes("10 minute") || prompt.includes("600 second")
      ).toBe(true);
    });

    it("should handle different time limits", () => {
      const customTimesContext: BlockContext = {
        ...baseContext,
        durationSec: 900, // 15 minutes
        answerTimeLimitSec: 120, // 2 minutes
      };

      const prompt = buildBlockPrompt(customTimesContext);

      expect(
        prompt.includes("15 minute") || prompt.includes("900")
      ).toBe(true);
      expect(
        prompt.includes("2 minute") || prompt.includes("120")
      ).toBe(true);
    });
  });

  describe("Candidate Context", () => {
    it("should include job description", () => {
      const prompt = buildBlockPrompt(baseContext);

      expect(prompt).toContain(baseContext.jobDescription);
    });

    it("should include candidate resume", () => {
      const prompt = buildBlockPrompt(baseContext);

      expect(prompt).toContain(baseContext.candidateResume);
    });

    it("should handle long job descriptions", () => {
      const longJDContext: BlockContext = {
        ...baseContext,
        jobDescription: "A".repeat(5000),
      };

      const prompt = buildBlockPrompt(longJDContext);

      expect(prompt).toContain("A".repeat(5000));
    });
  });

  describe("Time's Up Instructions", () => {
    it("should include instructions for handling time up messages", () => {
      const prompt = buildBlockPrompt(baseContext);

      expect(prompt.toLowerCase()).toContain("time");
      expect(
        prompt.toLowerCase().includes("move") ||
          prompt.toLowerCase().includes("next question") ||
          prompt.toLowerCase().includes("proceed")
      ).toBe(true);
    });
  });

  describe("Interview Flow", () => {
    it("should include greeting instruction for first block", () => {
      const prompt = buildBlockPrompt(baseContext);

      expect(prompt.toLowerCase()).toContain("greet");
    });

    it("should include instruction to ask questions in order", () => {
      const prompt = buildBlockPrompt(baseContext);

      expect(prompt.toLowerCase()).toContain("order");
    });

    it("should include follow-up question guidance", () => {
      const prompt = buildBlockPrompt(baseContext);

      expect(prompt.toLowerCase()).toContain("follow");
    });
  });

  describe("Output Format", () => {
    it("should return a non-empty string", () => {
      const prompt = buildBlockPrompt(baseContext);

      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("should be properly formatted with sections", () => {
      const prompt = buildBlockPrompt(baseContext);

      // Should have some structure (headers, sections, etc.)
      expect(
        prompt.includes("##") ||
          prompt.includes("---") ||
          prompt.includes(":")
      ).toBe(true);
    });
  });
});

// =============================================================================
// Unit Tests: Edge Cases
// =============================================================================

describe("buildBlockPrompt Edge Cases", () => {
  it("should handle special characters in questions", () => {
    const specialCharsContext: BlockContext = {
      ...baseContext,
      questions: [
        'What\'s your approach to "pair programming"?',
        "How do you handle <script> injection & XSS?",
        "Explain the O(n²) complexity issue.",
      ],
    };

    const prompt = buildBlockPrompt(specialCharsContext);

    expect(prompt).toContain('What\'s your approach to "pair programming"?');
    expect(prompt).toContain("<script>");
    expect(prompt).toContain("O(n²)");
  });

  it("should handle Unicode characters in context", () => {
    const unicodeContext: BlockContext = {
      ...baseContext,
      persona: "高级面试官 (Senior Interviewer)",
      jobDescription: "软件工程师 at 谷歌",
      candidateResume: "5年全栈开发经验",
    };

    const prompt = buildBlockPrompt(unicodeContext);

    expect(prompt).toContain("高级面试官");
    expect(prompt).toContain("软件工程师");
    expect(prompt).toContain("5年全栈开发经验");
  });

  it("should handle very long question lists", () => {
    const manyQuestionsContext: BlockContext = {
      ...baseContext,
      questions: Array.from({ length: 20 }, (_, i) => `Question ${i + 1}?`),
    };

    const prompt = buildBlockPrompt(manyQuestionsContext);

    expect(prompt).toContain("Question 1?");
    expect(prompt).toContain("Question 20?");
  });
});
