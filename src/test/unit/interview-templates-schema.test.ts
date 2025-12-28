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
});
