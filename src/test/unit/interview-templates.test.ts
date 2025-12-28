/**
 * Unit tests for interview template registry.
 * Tests the core getTemplate and listTemplates functionality.
 */

import { describe, it, expect } from "vitest";
import { getTemplate, listTemplates } from "~/lib/interview-templates";

describe("Interview Template Registry", () => {
  it("should return template by id", () => {
    const template = getTemplate("mba-behavioral-v1");

    expect(template).not.toBeNull();
    expect(template?.id).toBe("mba-behavioral-v1");
    expect(template?.name).toBe("MBA Behavioral Interview");
  });

  it("should return null for non-existent template", () => {
    const template = getTemplate("does-not-exist");

    expect(template).toBeNull();
  });

  it("should list all templates", () => {
    const templates = listTemplates();

    expect(templates.length).toBeGreaterThanOrEqual(1);
    expect(templates.some((t) => t.id === "mba-behavioral-v1")).toBe(true);
  });

  it("should have valid block structure", () => {
    const template = getTemplate("mba-behavioral-v1");

    expect(template?.blocks).toBeDefined();
    expect(template?.blocks.length).toBeGreaterThanOrEqual(1);
    expect(template?.blocks[0]?.language).toMatch(/^(en|zh)$/);
    expect(template?.blocks[0]?.durationSec).toBeGreaterThan(0);
    expect(template?.blocks[0]?.questions.length).toBeGreaterThan(0);
  });

  it("should have default answerTimeLimitSec of 180", () => {
    const template = getTemplate("mba-behavioral-v1");

    expect(template?.answerTimeLimitSec).toBe(180);
  });
});
