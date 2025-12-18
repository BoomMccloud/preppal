// ABOUTME: Unit tests for the buildSystemPrompt utility function.

import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../../utils/build-system-prompt";

describe("buildSystemPrompt", () => {
  it("builds prompt with all fields populated", () => {
    const result = buildSystemPrompt({
      jobDescription: "Software Engineer at Acme",
      resume: "5 years experience in TypeScript",
      persona: "Senior Technical Interviewer",
    });

    expect(result).toContain("You are a Senior Technical Interviewer.");
    expect(result).toContain("JOB DESCRIPTION:");
    expect(result).toContain("Software Engineer at Acme");
    expect(result).toContain("CANDIDATE RESUME:");
    expect(result).toContain("5 years experience in TypeScript");
    expect(result).toContain(
      "Start by introducing yourself and asking the candidate to introduce themselves.",
    );
  });

  it("omits job description section when empty", () => {
    const result = buildSystemPrompt({
      jobDescription: "",
      resume: "Some resume content",
      persona: "HR Manager",
    });

    expect(result).toContain("You are a HR Manager.");
    expect(result).not.toContain("JOB DESCRIPTION:");
    expect(result).toContain("CANDIDATE RESUME:");
    expect(result).toContain("Some resume content");
  });

  it("omits resume section when empty", () => {
    const result = buildSystemPrompt({
      jobDescription: "Frontend Developer role",
      resume: "",
      persona: "Engineering Manager",
    });

    expect(result).toContain("You are a Engineering Manager.");
    expect(result).toContain("JOB DESCRIPTION:");
    expect(result).toContain("Frontend Developer role");
    expect(result).not.toContain("CANDIDATE RESUME:");
  });

  it("omits both sections when both are empty", () => {
    const result = buildSystemPrompt({
      jobDescription: "",
      resume: "",
      persona: "Professional Interviewer",
    });

    expect(result).toContain("You are a Professional Interviewer.");
    expect(result).not.toContain("JOB DESCRIPTION:");
    expect(result).not.toContain("CANDIDATE RESUME:");
    expect(result).toContain("Your goal is to conduct a behavioral interview.");
  });

  it("preserves multiline content in job description", () => {
    const multilineJD = `Requirements:
- 5 years experience
- TypeScript proficiency
- Team leadership`;

    const result = buildSystemPrompt({
      jobDescription: multilineJD,
      resume: "",
      persona: "Tech Lead",
    });

    expect(result).toContain("- 5 years experience");
    expect(result).toContain("- TypeScript proficiency");
    expect(result).toContain("- Team leadership");
  });

  it("preserves multiline content in resume", () => {
    const multilineResume = `Experience:
- Company A: 3 years
- Company B: 2 years
Skills: TypeScript, React`;

    const result = buildSystemPrompt({
      jobDescription: "",
      resume: multilineResume,
      persona: "Recruiter",
    });

    expect(result).toContain("- Company A: 3 years");
    expect(result).toContain("- Company B: 2 years");
    expect(result).toContain("Skills: TypeScript, React");
  });
});
