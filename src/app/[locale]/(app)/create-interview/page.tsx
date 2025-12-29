"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "~/i18n/navigation";
import { api } from "~/trpc/react";

export default function CreateInterviewPage() {
  const t = useTranslations("createInterview");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");

  const router = useRouter();
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState("");
  const [persona, setPersona] = useState("professional interviewer");
  const [duration, setDuration] = useState<"SHORT" | "STANDARD" | "EXTENDED">(
    "STANDARD",
  );
  const [useTemplate, setUseTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate idempotency key once when component mounts
  const [idempotencyKey] = useState(() => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  });

  const createInterviewMutation = api.interview.createSession.useMutation({
    onSuccess: (interview) => {
      // Navigate to the interview lobby page on success
      router.push(`/interview/${interview.id}/lobby`);
    },
    onError: (error) => {
      // Log error to console
      console.error("Failed to create interview:", error);

      // Display inline error message
      setError(tErrors("generic"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any previous errors
    setError(null);

    // Call the mutation with discriminated union structure
    createInterviewMutation.mutate({
      jobDescription: {
        type: "text",
        content: jobDescription,
      },
      resume: {
        type: "text",
        content: resume,
      },
      idempotencyKey,
      persona: persona.trim() || undefined,
      duration,
      templateId: useTemplate ? "mba-behavioral-v1" : undefined,
    });
  };

  const isFormValid = jobDescription.trim() !== "" && resume.trim() !== "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-primary-text mb-4 text-4xl font-bold">
          {t("title")}
        </h1>
        <p className="text-secondary-text text-lg">{t("subtitle")}</p>
      </div>

      <div className="bg-secondary border-secondary-text rounded-lg border p-8 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-primary-text mb-2 block text-lg font-medium">
              {t("jobDescription")}
            </label>
            <textarea
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="bg-secondary border-secondary-text text-primary-text placeholder-secondary-text w-full rounded-md border px-4 py-3"
              placeholder={t("jobDescriptionPlaceholder")}
              required
            />
          </div>

          <div>
            <label className="text-primary-text mb-2 block text-lg font-medium">
              {t("resume")}
            </label>
            <textarea
              rows={12}
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              className="bg-secondary border-secondary-text text-primary-text placeholder-secondary-text w-full rounded-md border px-4 py-3"
              placeholder={t("resumePlaceholder")}
              required
            />
          </div>

          <div>
            <label className="text-primary-text mb-2 block text-lg font-medium">
              {t("persona")}
            </label>
            <input
              type="text"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="bg-secondary border-secondary-text text-primary-text placeholder-secondary-text w-full rounded-md border px-4 py-3"
              placeholder={t("personaPlaceholder")}
            />
            <p className="text-secondary-text mt-1 text-sm">
              {t("personaHelp")}
            </p>
          </div>

          <div>
            <label className="text-primary-text mb-2 block text-lg font-medium">
              {t("duration")}
            </label>
            <div className="flex gap-3">
              {(["SHORT", "STANDARD", "EXTENDED"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex-1 rounded-md px-4 py-3 font-medium transition-colors ${
                    duration === d
                      ? "bg-accent text-primary"
                      : "bg-secondary border-secondary-text text-primary-text hover:bg-opacity-80 border"
                  }`}
                >
                  {t(`duration${d}`)}
                </button>
              ))}
            </div>
            <p className="text-secondary-text mt-1 text-sm">
              {t("durationHelp")}
            </p>
          </div>

          {/* Block-based interview toggle */}
          <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={useTemplate}
                onChange={(e) => setUseTemplate(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-primary-text font-medium">
                  MBA Behavioral Interview (Block-based)
                </span>
                <p className="text-secondary-text text-sm">
                  2 blocks: 10 min Chinese + 10 min English, 3 min per answer
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="rounded-md border border-red-500/50 bg-red-500/10 p-4">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <Link
              href="/dashboard"
              className="text-secondary-text hover:text-primary-text px-6 py-3 transition-colors"
            >
              {tCommon("cancel")}
            </Link>
            <button
              type="submit"
              disabled={!isFormValid || createInterviewMutation.isPending}
              className="bg-accent hover:bg-accent/80 text-primary rounded-md px-8 py-3 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createInterviewMutation.isPending
                ? t("submitting")
                : t("submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
