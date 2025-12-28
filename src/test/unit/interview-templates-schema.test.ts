/**
 * Unit tests for interview template Zod schema validation.
 * Tests only the essential validation behavior, not Zod internals.
 */

import { describe, it, expect } from "vitest";
import { InterviewTemplateSchema } from "~/lib/interview-templates/schema";

describe("InterviewTemplateSchema", () => {
  const validTemplate = {
    id: "mba-behavioral-v1",
    name: "MBA Behavioral Interview",
    blocks: [
      {
        language: "zh",
        durationSec: 600,
        questions: [{ content: "Tell me about yourself." }],
      },
      {
        language: "en",
        durationSec: 600,
        questions: [{ content: "What is your greatest achievement?" }],
      },
    ],
  };

  it("should parse a valid template", () => {
    const result = InterviewTemplateSchema.safeParse(validTemplate);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("mba-behavioral-v1");
      expect(result.data.blocks).toHaveLength(2);
    }
  });

  it("should reject template missing required fields", () => {
    const invalid = { id: "test" }; // missing name and blocks

    const result = InterviewTemplateSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it("should apply default answerTimeLimitSec of 180", () => {
    const result = InterviewTemplateSchema.safeParse(validTemplate);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.answerTimeLimitSec).toBe(180);
    }
  });

  it("should reject invalid language codes", () => {
    const invalid = {
      ...validTemplate,
      blocks: [
        { language: "fr", durationSec: 600, questions: [{ content: "Q" }] },
      ],
    };

    const result = InterviewTemplateSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it("should preserve custom answerTimeLimitSec", () => {
    const custom = {
      ...validTemplate,
      answerTimeLimitSec: 120,
    };

    const result = InterviewTemplateSchema.safeParse(custom);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.answerTimeLimitSec).toBe(120);
    }
  });

  it("should reject template with empty blocks array", () => {
    const invalid = {
      id: "test",
      name: "Test Template",
      blocks: [],
    };

    const result = InterviewTemplateSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it("should reject block with empty questions array", () => {
    const invalid = {
      ...validTemplate,
      blocks: [{ language: "en", durationSec: 600, questions: [] }],
    };

    const result = InterviewTemplateSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it("should reject negative durationSec", () => {
    const invalid = {
      ...validTemplate,
      blocks: [
        { language: "en", durationSec: -100, questions: [{ content: "Q" }] },
      ],
    };

    const result = InterviewTemplateSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it("should reject zero durationSec", () => {
    const invalid = {
      ...validTemplate,
      blocks: [
        { language: "en", durationSec: 0, questions: [{ content: "Q" }] },
      ],
    };

    const result = InterviewTemplateSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it("should reject template with empty id", () => {
    const invalid = { ...validTemplate, id: "" };

    const result = InterviewTemplateSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it("should reject template with empty name", () => {
    const invalid = { ...validTemplate, name: "" };

    const result = InterviewTemplateSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });
});
