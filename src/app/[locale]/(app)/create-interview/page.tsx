"use client";

import { useState } from "react";
import { Link, useRouter } from "~/i18n/navigation";
import { api } from "~/trpc/react";

export default function CreateInterviewPage() {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState("");
  const [persona, setPersona] = useState("professional interviewer");
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
      setError("Failed to create interview. Please try again.");
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
    });
  };

  const isFormValid = jobDescription.trim() !== "" && resume.trim() !== "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-primary-text mb-4 text-4xl font-bold">
          Create Interview
        </h1>
        <p className="text-secondary-text text-lg">
          Set up a new interview session
        </p>
      </div>

      <div className="bg-secondary border-secondary-text rounded-lg border p-8 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-primary-text mb-2 block text-lg font-medium">
              Job Description
            </label>
            <textarea
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="bg-secondary border-secondary-text text-primary-text placeholder-secondary-text w-full rounded-md border px-4 py-3"
              placeholder="Paste the job description here..."
              required
            />
          </div>

          <div>
            <label className="text-primary-text mb-2 block text-lg font-medium">
              Your Resume
            </label>
            <textarea
              rows={12}
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              className="bg-secondary border-secondary-text text-primary-text placeholder-secondary-text w-full rounded-md border px-4 py-3"
              placeholder="Paste your resume content here..."
              required
            />
          </div>

          <div>
            <label className="text-primary-text mb-2 block text-lg font-medium">
              Interviewer Persona
            </label>
            <input
              type="text"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="bg-secondary border-secondary-text text-primary-text placeholder-secondary-text w-full rounded-md border px-4 py-3"
              placeholder="e.g., Senior Technical Interviewer, HR Manager"
            />
            <p className="text-secondary-text mt-1 text-sm">
              Customize the interviewer&apos;s role and style
            </p>
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
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!isFormValid || createInterviewMutation.isPending}
              className="bg-accent hover:bg-accent/80 text-primary rounded-md px-8 py-3 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createInterviewMutation.isPending
                ? "Creating..."
                : "Create Interview"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
