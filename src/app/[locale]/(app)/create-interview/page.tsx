"use client";

/**
 * Create Interview Page - Two-path flow for starting interviews.
 * Users choose between pre-configured templates or custom interview setup.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "~/i18n/navigation";
import { api } from "~/trpc/react";
import { listTemplates } from "~/lib/interview-templates";
import type { InterviewTemplate } from "~/lib/interview-templates/schema";

type FlowPath = "initial" | "templates" | "custom";

const TEMPLATES = listTemplates();

export default function CreateInterviewPage() {
  const t = useTranslations("createInterview");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");

  const router = useRouter();
  const [flowPath, setFlowPath] = useState<FlowPath>("initial");
  const [selectedTemplate, setSelectedTemplate] =
    useState<InterviewTemplate | null>(null);

  // Form state
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState("");
  const [persona, setPersona] = useState("professional interviewer");
  const [duration, setDuration] = useState<"SHORT" | "STANDARD" | "EXTENDED">(
    "STANDARD",
  );
  const [error, setError] = useState<string | null>(null);

  // Generate idempotency key once when component mounts
  const [idempotencyKey] = useState(() => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  });

  const createInterviewMutation = api.interview.createSession.useMutation({
    onSuccess: (interview) => {
      router.push(`/interview/${interview.id}/lobby`);
    },
    onError: (error) => {
      console.error("Failed to create interview:", error);
      setError(tErrors("generic"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    createInterviewMutation.mutate({
      jobDescription: { type: "text", content: jobDescription },
      resume: { type: "text", content: resume },
      idempotencyKey,
      persona: selectedTemplate?.persona ?? (persona.trim() || undefined),
      duration: selectedTemplate ? "STANDARD" : duration,
      templateId: selectedTemplate?.id ?? undefined,
    });
  };

  const isFormValid = jobDescription.trim() !== "" && resume.trim() !== "";

  const handleBack = () => {
    if (selectedTemplate) {
      setSelectedTemplate(null);
    } else {
      setFlowPath("initial");
    }
  };

  // Calculate template stats for display
  const getTemplateStats = (template: InterviewTemplate) => {
    const totalQuestions = template.blocks.reduce(
      (acc, b) => acc + b.questions.length,
      0,
    );
    const languages = [...new Set(template.blocks.map((b) => b.language))];
    const totalDuration = template.blocks.reduce(
      (acc, b) => acc + b.durationSec,
      0,
    );
    return { totalQuestions, languages, totalDuration };
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-primary-text mb-2 text-3xl font-bold tracking-tight">
          {flowPath === "initial"
            ? t("title")
            : selectedTemplate
              ? selectedTemplate.name
              : flowPath === "templates"
                ? "Choose a Template"
                : "Custom Interview"}
        </h1>
        <p className="text-secondary-text">
          {flowPath === "initial"
            ? t("subtitle")
            : selectedTemplate
              ? selectedTemplate.description
              : flowPath === "templates"
                ? "Select a pre-configured interview format"
                : "Configure your interview from scratch"}
        </p>
      </div>

      {/* Back button when not on initial */}
      {flowPath !== "initial" && (
        <button
          onClick={handleBack}
          className="text-secondary-text hover:text-primary-text mb-6 flex items-center gap-2 text-sm transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
      )}

      {/* Initial Path Selection */}
      {flowPath === "initial" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Templates Card */}
          <button
            onClick={() => setFlowPath("templates")}
            className="group border-accent/20 from-accent/5 to-accent/10 hover:border-accent/40 hover:shadow-accent/5 relative overflow-hidden rounded-xl border bg-gradient-to-br p-8 text-left transition-all hover:shadow-lg"
          >
            <div className="bg-accent/10 text-accent absolute top-4 right-4 rounded-full px-3 py-1 text-xs font-medium">
              Recommended
            </div>
            <div className="bg-accent/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
              <svg
                className="text-accent h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-primary-text mb-2 text-xl font-semibold">
              Use a Template
            </h2>
            <p className="text-secondary-text mb-4 text-sm">
              Pre-configured interview formats for common scenarios. Perfect for
              MBA admissions, language tests, and more.
            </p>
            <div className="text-secondary-text flex items-center gap-2 text-sm">
              <span className="text-primary-text font-medium">
                {TEMPLATES.length} templates
              </span>
              <span>available</span>
            </div>
            <div className="text-accent absolute right-6 bottom-6 transition-transform group-hover:translate-x-1">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>

          {/* Custom Interview Card */}
          <button
            onClick={() => setFlowPath("custom")}
            className="group border-secondary-text/20 from-secondary/50 to-secondary/30 hover:border-secondary-text/40 relative overflow-hidden rounded-xl border bg-gradient-to-br p-8 text-left transition-all hover:shadow-lg"
          >
            <div className="bg-secondary mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
              <svg
                className="text-secondary-text h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <h2 className="text-primary-text mb-2 text-xl font-semibold">
              Custom Interview
            </h2>
            <p className="text-secondary-text mb-4 text-sm">
              Fully customizable experience. Set your own persona, duration, and
              let AI generate questions based on your materials.
            </p>
            <div className="text-secondary-text text-sm">
              <span className="text-primary-text font-medium">
                Full control
              </span>{" "}
              over your interview
            </div>
            <div className="text-secondary-text absolute right-6 bottom-6 transition-transform group-hover:translate-x-1">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* Template Selection */}
      {flowPath === "templates" && !selectedTemplate && (
        <div className="grid gap-4 sm:grid-cols-2">
          {TEMPLATES.map((template) => {
            const stats = getTemplateStats(template);
            return (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className="group border-secondary-text/20 bg-secondary/30 hover:border-accent/40 hover:bg-secondary/50 relative overflow-hidden rounded-xl border p-6 text-left transition-all"
              >
                <h3 className="text-primary-text mb-2 text-lg font-semibold">
                  {template.name}
                </h3>
                <p className="text-secondary-text mb-4 line-clamp-2 text-sm">
                  {template.description}
                </p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="bg-secondary rounded-full px-2.5 py-1">
                    {template.blocks.length} blocks
                  </span>
                  <span className="bg-secondary rounded-full px-2.5 py-1">
                    {stats.totalQuestions} questions
                  </span>
                  <span className="bg-secondary rounded-full px-2.5 py-1">
                    {stats.languages.map((l) => l.toUpperCase()).join(" + ")}
                  </span>
                  <span className="bg-secondary rounded-full px-2.5 py-1">
                    {template.answerTimeLimitSec}s/answer
                  </span>
                </div>
                <div className="text-accent absolute right-4 bottom-4 opacity-0 transition-all group-hover:opacity-100">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Template Form (simplified) */}
      {flowPath === "templates" && selectedTemplate && (
        <div className="border-secondary-text/20 bg-secondary/30 rounded-xl border p-6 backdrop-blur-sm">
          {/* Template Details */}
          <div className="bg-secondary/50 mb-6 rounded-lg p-4">
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              {(() => {
                const stats = getTemplateStats(selectedTemplate);
                return (
                  <>
                    <span className="bg-accent/10 text-accent rounded-full px-2.5 py-1">
                      {selectedTemplate.blocks.length} blocks
                    </span>
                    <span className="bg-accent/10 text-accent rounded-full px-2.5 py-1">
                      {stats.totalQuestions} questions
                    </span>
                    <span className="bg-accent/10 text-accent rounded-full px-2.5 py-1">
                      {stats.languages.map((l) => l.toUpperCase()).join(" + ")}
                    </span>
                    <span className="bg-accent/10 text-accent rounded-full px-2.5 py-1">
                      {selectedTemplate.answerTimeLimitSec}s per answer
                    </span>
                  </>
                );
              })()}
            </div>
            <p className="text-secondary-text text-sm">
              <strong className="text-primary-text">Interviewer:</strong>{" "}
              {selectedTemplate.persona}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-primary-text mb-2 block font-medium">
                {t("jobDescription")}
              </label>
              <textarea
                rows={6}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="bg-primary border-secondary-text/30 text-primary-text placeholder-secondary-text focus:border-accent w-full rounded-lg border px-4 py-3 transition-colors focus:outline-none"
                placeholder={t("jobDescriptionPlaceholder")}
                required
              />
            </div>

            <div>
              <label className="text-primary-text mb-2 block font-medium">
                {t("resume")}
              </label>
              <textarea
                rows={8}
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                className="bg-primary border-secondary-text/30 text-primary-text placeholder-secondary-text focus:border-accent w-full rounded-lg border px-4 py-3 transition-colors focus:outline-none"
                placeholder={t("resumePlaceholder")}
                required
              />
            </div>

            {error && (
              <div className="border-danger/30 bg-danger/10 rounded-lg border p-4">
                <p className="text-danger text-sm">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Link
                href="/dashboard"
                className="text-secondary-text hover:text-primary-text rounded-lg px-5 py-2.5 transition-colors"
              >
                {tCommon("cancel")}
              </Link>
              <button
                type="submit"
                disabled={!isFormValid || createInterviewMutation.isPending}
                className="bg-accent hover:bg-accent/90 text-primary rounded-lg px-6 py-2.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createInterviewMutation.isPending
                  ? t("submitting")
                  : "Start Interview"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Interview Form (full) */}
      {flowPath === "custom" && (
        <div className="border-secondary-text/20 bg-secondary/30 rounded-xl border p-6 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-primary-text mb-2 block font-medium">
                {t("jobDescription")}
              </label>
              <textarea
                rows={6}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="bg-primary border-secondary-text/30 text-primary-text placeholder-secondary-text focus:border-accent w-full rounded-lg border px-4 py-3 transition-colors focus:outline-none"
                placeholder={t("jobDescriptionPlaceholder")}
                required
              />
            </div>

            <div>
              <label className="text-primary-text mb-2 block font-medium">
                {t("resume")}
              </label>
              <textarea
                rows={8}
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                className="bg-primary border-secondary-text/30 text-primary-text placeholder-secondary-text focus:border-accent w-full rounded-lg border px-4 py-3 transition-colors focus:outline-none"
                placeholder={t("resumePlaceholder")}
                required
              />
            </div>

            <div>
              <label className="text-primary-text mb-2 block font-medium">
                {t("persona")}
              </label>
              <input
                type="text"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                className="bg-primary border-secondary-text/30 text-primary-text placeholder-secondary-text focus:border-accent w-full rounded-lg border px-4 py-3 transition-colors focus:outline-none"
                placeholder={t("personaPlaceholder")}
              />
              <p className="text-secondary-text mt-1.5 text-sm">
                {t("personaHelp")}
              </p>
            </div>

            <div>
              <label className="text-primary-text mb-2 block font-medium">
                {t("duration")}
              </label>
              <div className="flex gap-3">
                {(["SHORT", "STANDARD", "EXTENDED"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`flex-1 rounded-lg px-4 py-3 font-medium transition-all ${
                      duration === d
                        ? "bg-accent text-primary shadow-sm"
                        : "bg-primary border-secondary-text/30 text-primary-text hover:border-accent/50 border"
                    }`}
                  >
                    {t(`duration${d}`)}
                  </button>
                ))}
              </div>
              <p className="text-secondary-text mt-1.5 text-sm">
                {t("durationHelp")}
              </p>
            </div>

            {error && (
              <div className="border-danger/30 bg-danger/10 rounded-lg border p-4">
                <p className="text-danger text-sm">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Link
                href="/dashboard"
                className="text-secondary-text hover:text-primary-text rounded-lg px-5 py-2.5 transition-colors"
              >
                {tCommon("cancel")}
              </Link>
              <button
                type="submit"
                disabled={!isFormValid || createInterviewMutation.isPending}
                className="bg-accent hover:bg-accent/90 text-primary rounded-lg px-6 py-2.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createInterviewMutation.isPending
                  ? t("submitting")
                  : t("submit")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
