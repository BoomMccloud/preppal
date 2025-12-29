import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const MESSAGES_DIR = path.join(process.cwd(), "messages");

/**
 * Recursively extracts all keys from a JSON object.
 * Returns an array of dot-notation strings (e.g., "common.save").
 */
function getKeys(obj: any, prefix = ""): string[] {
  let keys: string[] = [];
  for (const key in obj) {
    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      keys = keys.concat(getKeys(obj[key], prefix + key + "."));
    } else {
      keys.push(prefix + key);
    }
  }
  return keys;
}

describe("Translation Integrity", () => {
  // 1. Validate en.json exists
  const enPath = path.join(MESSAGES_DIR, "en.json");
  if (!fs.existsSync(enPath)) {
    throw new Error("Critical: en.json source translation file is missing!");
  }

  const enContent = JSON.parse(fs.readFileSync(enPath, "utf-8"));
  const enKeys = getKeys(enContent).sort();

  // 2. Dynamically find all other language files
  const files = fs
    .readdirSync(MESSAGES_DIR)
    .filter((f) => f.endsWith(".json") && f !== "en.json");

  // 3. Generate a test for each language file found
  files.forEach((file) => {
    it(`${file} should have all keys present in en.json`, () => {
      const filePath = path.join(MESSAGES_DIR, file);
      const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const keys = getKeys(content).sort();

      const missingKeys = enKeys.filter((key) => !keys.includes(key));
      
      if (missingKeys.length > 0) {
        console.error(`Missing keys in ${file}:`, missingKeys);
      }

      expect(missingKeys, `Missing ${missingKeys.length} keys in ${file}`).toEqual([]);
    });
  });
});
