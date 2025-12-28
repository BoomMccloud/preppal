/**
 * Unit tests for interview template Zod schema validation.
 * Tests the schema definitions for interview templates, blocks, and questions.
 */

import { describe, it, expect } from "vitest";
import {
  LanguageSchema,
  InterviewQuestionSchema,
  InterviewBlockSchema,
  InterviewTemplateSchema,
} from "~/lib/interview-templates/schema";

// =============================================================================
// Unit Tests: Language Schema
// =============================================================================

describe("LanguageSchema", () => {
  it("should accept 'en'", () => {
    const result = LanguageSchema.safeParse("en");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("en");
    }
  });

  it("should accept 'zh'", () => {
    const result = LanguageSchema.safeParse("zh");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("zh");
    }
  });

  it("should reject other language codes", () => {
    const invalidCodes = ["es", "fr", "de", "ja", "EN", "ZH", "english", ""];
    for (const code of invalidCodes) {
      const result = LanguageSchema.safeParse(code);
      expect(result.success).toBe(false);
    }
  });

  it("should reject non-string values", () => {
    const invalidValues = [null, undefined, 123, {}, []];
    for (const value of invalidValues) {
      const result = LanguageSchema.safeParse(value);
      expect(result.success).toBe(false);
    }
  });
});

// =============================================================================
// Unit Tests: Interview Question Schema
// =============================================================================

describe("InterviewQuestionSchema", () => {
  it("should require content field", () => {
    const result = InterviewQuestionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should accept valid question with content only", () => {
    const result = InterviewQuestionSchema.safeParse({
      content: "Tell me about yourself.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("Tell me about yourself.");
      expect(result.data.translation).toBeUndefined();
    }
  });

  it("should accept optional translation field", () => {
    const result = InterviewQuestionSchema.safeParse({
      content: "Tell me about yourself.",
      translation: "请介绍一下你自己。",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("Tell me about yourself.");
      expect(result.data.translation).toBe("请介绍一下你自己。");
    }
  });

  it("should reject empty content", () => {
    const result = InterviewQuestionSchema.safeParse({
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("should accept long content", () => {
    const longContent = "A".repeat(1000);
    const result = InterviewQuestionSchema.safeParse({
      content: longContent,
    });
    expect(result.success).toBe(true);
  });

  it("should accept content with special characters", () => {
    const result = InterviewQuestionSchema.safeParse({
      content: "Why do you want to pursue an MBA? What's your 5-year plan?",
    });
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Unit Tests: Interview Block Schema
// =============================================================================

describe("InterviewBlockSchema", () => {
  const validQuestion = { content: "Test question?" };

  it("should require language, durationSec, and questions", () => {
    const result = InterviewBlockSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should accept valid block with all required fields", () => {
    const result = InterviewBlockSchema.safeParse({
      language: "en",
      durationSec: 600,
      questions: [validQuestion],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe("en");
      expect(result.data.durationSec).toBe(600);
      expect(result.data.questions).toHaveLength(1);
    }
  });

  it("should require positive integer for durationSec", () => {
    const invalidDurations = [0, -1, -100, 1.5, 600.5];
    for (const duration of invalidDurations) {
      const result = InterviewBlockSchema.safeParse({
        language: "en",
        durationSec: duration,
        questions: [validQuestion],
      });
      expect(result.success).toBe(false);
    }
  });

  it("should accept positive integer durationSec", () => {
    const validDurations = [1, 60, 600, 1800, 3600];
    for (const duration of validDurations) {
      const result = InterviewBlockSchema.safeParse({
        language: "en",
        durationSec: duration,
        questions: [validQuestion],
      });
      expect(result.success).toBe(true);
    }
  });

  it("should require at least one question", () => {
    const result = InterviewBlockSchema.safeParse({
      language: "en",
      durationSec: 600,
      questions: [],
    });
    expect(result.success).toBe(false);
  });

  it("should accept multiple questions", () => {
    const result = InterviewBlockSchema.safeParse({
      language: "zh",
      durationSec: 600,
      questions: [
        { content: "Question 1?" },
        { content: "Question 2?" },
        { content: "Question 3?" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.questions).toHaveLength(3);
    }
  });

  it("should reject invalid language", () => {
    const result = InterviewBlockSchema.safeParse({
      language: "es",
      durationSec: 600,
      questions: [validQuestion],
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Unit Tests: Interview Template Schema
// =============================================================================

describe("InterviewTemplateSchema", () => {
  const validBlock = {
    language: "en" as const,
    durationSec: 600,
    questions: [{ content: "Test question?" }],
  };

  const minimalValidTemplate = {
    id: "test-template-v1",
    name: "Test Template",
    blocks: [validBlock],
  };

  it("should validate a complete valid template", () => {
    const fullTemplate = {
      id: "mba-behavioral-v1",
      name: "MBA Behavioral Interview",
      description: "Standard MBA admissions behavioral interview",
      persona:
        "Senior admissions officer at a top-10 MBA program. Professional, warm.",
      answerTimeLimitSec: 180,
      blocks: [
        {
          language: "zh",
          durationSec: 600,
          questions: [
            {
              content: "Tell me about a time you led a team.",
              translation: "请描述一次你带领团队的经历。",
            },
            { content: "Describe a failure and what you learned." },
          ],
        },
        {
          language: "en",
          durationSec: 600,
          questions: [
            { content: "What is your greatest achievement?" },
            { content: "Where do you see yourself in 10 years?" },
          ],
        },
      ],
    };

    const result = InterviewTemplateSchema.safeParse(fullTemplate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("mba-behavioral-v1");
      expect(result.data.name).toBe("MBA Behavioral Interview");
      expect(result.data.description).toBe(
        "Standard MBA admissions behavioral interview"
      );
      expect(result.data.persona).toContain("Senior admissions officer");
      expect(result.data.answerTimeLimitSec).toBe(180);
      expect(result.data.blocks).toHaveLength(2);
    }
  });

  it("should reject template without id", () => {
    const result = InterviewTemplateSchema.safeParse({
      name: "Test Template",
      blocks: [validBlock],
    });
    expect(result.success).toBe(false);
  });

  it("should reject template without name", () => {
    const result = InterviewTemplateSchema.safeParse({
      id: "test-v1",
      blocks: [validBlock],
    });
    expect(result.success).toBe(false);
  });

  it("should require at least one block", () => {
    const result = InterviewTemplateSchema.safeParse({
      id: "test-v1",
      name: "Test Template",
      blocks: [],
    });
    expect(result.success).toBe(false);
  });

  it("should default answerTimeLimitSec to 180", () => {
    const result = InterviewTemplateSchema.safeParse(minimalValidTemplate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.answerTimeLimitSec).toBe(180);
    }
  });

  it("should accept custom answerTimeLimitSec", () => {
    const result = InterviewTemplateSchema.safeParse({
      ...minimalValidTemplate,
      answerTimeLimitSec: 120,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.answerTimeLimitSec).toBe(120);
    }
  });

  it("should reject non-positive answerTimeLimitSec", () => {
    const invalidLimits = [0, -1, -180];
    for (const limit of invalidLimits) {
      const result = InterviewTemplateSchema.safeParse({
        ...minimalValidTemplate,
        answerTimeLimitSec: limit,
      });
      expect(result.success).toBe(false);
    }
  });

  it("should accept template with optional fields omitted", () => {
    const result = InterviewTemplateSchema.safeParse(minimalValidTemplate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
      expect(result.data.persona).toBeUndefined();
    }
  });

  it("should reject empty id", () => {
    const result = InterviewTemplateSchema.safeParse({
      id: "",
      name: "Test Template",
      blocks: [validBlock],
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty name", () => {
    const result = InterviewTemplateSchema.safeParse({
      id: "test-v1",
      name: "",
      blocks: [validBlock],
    });
    expect(result.success).toBe(false);
  });

  it("should validate nested block questions", () => {
    const result = InterviewTemplateSchema.safeParse({
      id: "test-v1",
      name: "Test",
      blocks: [
        {
          language: "en",
          durationSec: 600,
          questions: [{ content: "" }], // Empty content should fail
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
