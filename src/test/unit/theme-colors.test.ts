/**
 * Theme color lint test.
 * Ensures all UI components use theme colors instead of hardcoded Tailwind colors.
 * This prevents inconsistent styling and ensures dark mode works correctly.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const SRC_DIR = path.join(process.cwd(), "src");

// Allowed theme colors (from globals.css)
const ALLOWED_COLORS = [
  "primary",
  "secondary",
  "primary-text",
  "secondary-text",
  "accent",
  "success",
  "danger",
  "warning",
  "info",
  "transparent",
  "current",
  "inherit",
  "white",
  "black",
];

// Hardcoded Tailwind color patterns to forbid
// Matches: red-500, blue-100, gray-900, teal-500/20, etc.
const HARDCODED_COLOR_PATTERN =
  /\b(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}(\/\d+)?\b/g;

// Files/directories to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.test\.(ts|tsx)$/,
  /\.d\.ts$/,
  /proto.*\.ts$/,
  /\/dev\//, // Skip dev pages (internal tools)
  /raw-worker-test/, // Skip test pages
];

// Legacy files with known violations - to be cleaned up over time
// All files migrated as of FEAT33 theme color migration
const LEGACY_FILES = new Set<string>([]);

function shouldSkip(filePath: string): boolean {
  if (SKIP_PATTERNS.some((pattern) => pattern.test(filePath))) {
    return true;
  }
  const relativePath = path.relative(process.cwd(), filePath);
  return LEGACY_FILES.has(relativePath);
}

function getAllTsxFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          walk(fullPath);
        }
      } else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

interface Violation {
  file: string;
  line: number;
  color: string;
  context: string;
}

function findHardcodedColors(filePath: string): Violation[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations: Violation[] = [];

  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) {
      return;
    }

    const matches = line.matchAll(HARDCODED_COLOR_PATTERN);
    for (const match of matches) {
      violations.push({
        file: path.relative(process.cwd(), filePath),
        line: index + 1,
        color: match[0],
        context: line.trim().substring(0, 80),
      });
    }
  });

  return violations;
}

describe("Theme Colors", () => {
  it("should not use hardcoded Tailwind colors in app components", () => {
    const files = getAllTsxFiles(path.join(SRC_DIR, "app"));
    const allViolations: Violation[] = [];

    for (const file of files) {
      if (shouldSkip(file)) continue;
      const violations = findHardcodedColors(file);
      allViolations.push(...violations);
    }

    if (allViolations.length > 0) {
      const message = [
        "\nHardcoded Tailwind colors found. Use theme colors instead:",
        "",
        "Allowed: primary, secondary, primary-text, secondary-text, accent, success, danger, warning, info",
        "",
        "Violations:",
        ...allViolations.map(
          (v) => `  ${v.file}:${v.line} - "${v.color}" in: ${v.context}`,
        ),
      ].join("\n");

      expect.fail(message);
    }
  });

  it("tracks legacy files needing migration", () => {
    // This test tracks how many legacy files still have violations
    // As files are migrated, remove them from LEGACY_FILES and this count should decrease
    const legacyViolationCount = LEGACY_FILES.size;

    // Log progress for visibility
    console.log(`\n📊 Theme color migration progress:`);
    console.log(`   ${legacyViolationCount} files still need migration`);
    console.log(`   Files to migrate:`);
    LEGACY_FILES.forEach((f) => console.log(`     - ${f}`));

    // This will pass but serves as documentation
    expect(legacyViolationCount).toBeGreaterThanOrEqual(0);
  });

  it("documents allowed theme colors", () => {
    // This test documents what colors are allowed
    expect(ALLOWED_COLORS).toContain("primary");
    expect(ALLOWED_COLORS).toContain("secondary");
    expect(ALLOWED_COLORS).toContain("accent");
    expect(ALLOWED_COLORS).toContain("danger");
    expect(ALLOWED_COLORS).toContain("success");
    expect(ALLOWED_COLORS).toContain("warning");
    expect(ALLOWED_COLORS).toContain("info");
  });
});
