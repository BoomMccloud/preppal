/**
 * Unit tests for interview template loading and caching utilities.
 * Tests the template loading from config files and in-memory caching.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  getTemplate,
  listTemplates,
  _clearCache,
  _getCache,
} from "~/lib/interview-templates/loader";
import type { InterviewTemplate } from "~/lib/interview-templates/schema";

// =============================================================================
// Mock Data
// =============================================================================

const mockTemplateV1: InterviewTemplate = {
  id: "mba-behavioral-v1",
  name: "MBA Behavioral Interview",
  description: "Standard MBA admissions behavioral interview",
  persona: "Senior admissions officer",
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
      ],
    },
    {
      language: "en",
      durationSec: 600,
      questions: [{ content: "What is your greatest achievement?" }],
    },
  ],
};

const mockTemplateV2: InterviewTemplate = {
  id: "software-engineer-v1",
  name: "Software Engineer Interview",
  answerTimeLimitSec: 180,
  blocks: [
    {
      language: "en",
      durationSec: 900,
      questions: [
        { content: "Describe a challenging technical problem you solved." },
      ],
    },
  ],
};

// =============================================================================
// Unit Tests: Template Loading
// =============================================================================

describe("Interview Template Loading", () => {
  beforeEach(() => {
    _clearCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getTemplate", () => {
    it("should return template by id", () => {
      // Mock fs to return our test templates
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue([
        "mba-behavioral-v1.json",
      ] as unknown as fs.Dirent[]);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        JSON.stringify(mockTemplateV1)
      );

      const template = getTemplate("mba-behavioral-v1");

      expect(template).not.toBeNull();
      expect(template?.id).toBe("mba-behavioral-v1");
      expect(template?.name).toBe("MBA Behavioral Interview");
      expect(template?.blocks).toHaveLength(2);
    });

    it("should return null for non-existent template", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue([
        "mba-behavioral-v1.json",
      ] as unknown as fs.Dirent[]);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        JSON.stringify(mockTemplateV1)
      );

      const template = getTemplate("non-existent-template");

      expect(template).toBeNull();
    });

    it("should cache templates after first load", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      const readdirSpy = vi
        .spyOn(fs, "readdirSync")
        .mockReturnValue([
          "mba-behavioral-v1.json",
        ] as unknown as fs.Dirent[]);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        JSON.stringify(mockTemplateV1)
      );

      // First call loads from disk
      getTemplate("mba-behavioral-v1");
      expect(readdirSpy).toHaveBeenCalledTimes(1);

      // Second call should use cache
      getTemplate("mba-behavioral-v1");
      expect(readdirSpy).toHaveBeenCalledTimes(1); // Still 1, not 2

      // Cache should be populated
      const cache = _getCache();
      expect(cache).not.toBeNull();
      expect(cache?.size).toBe(1);
    });

    it("should handle missing templates directory gracefully", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false);

      const template = getTemplate("any-template");

      expect(template).toBeNull();
    });

    it("should validate template against schema", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue([
        "invalid.json",
      ] as unknown as fs.Dirent[]);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        JSON.stringify({
          id: "invalid",
          // Missing required 'name' and 'blocks'
        })
      );

      // Should throw or return null for invalid templates
      expect(() => getTemplate("invalid")).toThrow();
    });
  });

  describe("listTemplates", () => {
    it("should return all templates", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue([
        "mba-behavioral-v1.json",
        "software-engineer-v1.json",
      ] as unknown as fs.Dirent[]);
      vi.spyOn(fs, "readFileSync").mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes("mba-behavioral")) {
          return JSON.stringify(mockTemplateV1);
        }
        return JSON.stringify(mockTemplateV2);
      });

      const templates = listTemplates();

      expect(templates).toHaveLength(2);
      expect(templates.map((t) => t.id)).toContain("mba-behavioral-v1");
      expect(templates.map((t) => t.id)).toContain("software-engineer-v1");
    });

    it("should return empty array if no templates exist", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue([]);

      const templates = listTemplates();

      expect(templates).toEqual([]);
    });

    it("should return empty array if templates directory does not exist", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false);

      const templates = listTemplates();

      expect(templates).toEqual([]);
    });

    it("should only load .json files", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue([
        "mba-behavioral-v1.json",
        "README.md",
        ".gitkeep",
        "backup.json.bak",
      ] as unknown as fs.Dirent[]);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        JSON.stringify(mockTemplateV1)
      );

      const templates = listTemplates();

      expect(templates).toHaveLength(1);
      expect(templates[0]?.id).toBe("mba-behavioral-v1");
    });

    it("should use cached templates on subsequent calls", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      const readdirSpy = vi
        .spyOn(fs, "readdirSync")
        .mockReturnValue([
          "mba-behavioral-v1.json",
        ] as unknown as fs.Dirent[]);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        JSON.stringify(mockTemplateV1)
      );

      // First call
      listTemplates();
      expect(readdirSpy).toHaveBeenCalledTimes(1);

      // Second call should use cache
      listTemplates();
      expect(readdirSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("_clearCache", () => {
    it("should clear the template cache", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue([
        "mba-behavioral-v1.json",
      ] as unknown as fs.Dirent[]);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        JSON.stringify(mockTemplateV1)
      );

      // Load templates
      getTemplate("mba-behavioral-v1");
      expect(_getCache()?.size).toBe(1);

      // Clear cache
      _clearCache();
      expect(_getCache()).toBeNull();
    });
  });
});

// =============================================================================
// Unit Tests: Template File Path Resolution
// =============================================================================

describe("Template File Path Resolution", () => {
  beforeEach(() => {
    _clearCache();
    vi.restoreAllMocks();
  });

  it("should look for templates in config/interview-templates directory", () => {
    const existsSpy = vi.spyOn(fs, "existsSync").mockReturnValue(false);

    listTemplates();

    // Should check for the templates directory
    expect(existsSpy).toHaveBeenCalled();
    const calledPath = existsSpy.mock.calls[0]?.[0]?.toString() ?? "";
    expect(calledPath).toContain("config");
    expect(calledPath).toContain("interview-templates");
  });
});
