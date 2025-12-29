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

  it("should return null for empty string template id", () => {
    const template = getTemplate("");

    expect(template).toBeNull();
  });

  it("should have no duplicate template IDs in registry", () => {
    const templates = listTemplates();
    const ids = templates.map((t) => t.id);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
  });

  // Note: Block structure validation is handled by schema tests
  // Template-specific values are configuration, not logic to test
});
