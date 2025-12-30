/**
 * Interview template registry.
 * Provides getTemplate() and listTemplates() for accessing template definitions.
 */
import type { InterviewTemplate } from "./schema";
import { languageTransitionTestV1 } from "./definitions/language-transition-test-v1";
import { mbaBehavioralV1 } from "./definitions/mba-behavioral-v1";

// Build registry from all template definitions
const TEMPLATES = new Map<string, InterviewTemplate>([
  [mbaBehavioralV1.id, mbaBehavioralV1],
  [languageTransitionTestV1.id, languageTransitionTestV1],
]);

/**
 * Get a template by ID.
 * @returns The template if found, null otherwise.
 */
export function getTemplate(id: string): InterviewTemplate | null {
  return TEMPLATES.get(id) ?? null;
}

/**
 * List all available templates.
 * @returns Array of all registered templates.
 */
export function listTemplates(): InterviewTemplate[] {
  return Array.from(TEMPLATES.values());
}
