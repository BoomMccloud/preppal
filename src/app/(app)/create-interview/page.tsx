"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function CreateInterviewPage() {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState("");
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
    });
  };

  const isFormValid = jobDescription.trim() !== "" && resume.trim() !== "";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary-text mb-4">
          Create Interview
        </h1>
        <p className="text-secondary-text text-lg">
          Set up a new interview session
        </p>
      </div>

      <div className="bg-secondary backdrop-blur-sm rounded-lg p-8 border border-secondary-text">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-primary-text text-lg font-medium mb-2">
              Job Description
            </label>
            <textarea
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full bg-secondary border border-secondary-text rounded-md px-4 py-3 text-primary-text placeholder-secondary-text"
              placeholder="Paste the job description here..."
              required
            />
          </div>

          <div>
            <label className="block text-primary-text text-lg font-medium mb-2">
              Your Resume
            </label>
            <textarea
              rows={12}
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              className="w-full bg-secondary border border-secondary-text rounded-md px-4 py-3 text-primary-text placeholder-secondary-text"
              placeholder="Paste your resume content here..."
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-md p-4">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 text-secondary-text hover:text-primary-text transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!isFormValid || createInterviewMutation.isPending}
              className="bg-accent hover:bg-accent/80 text-primary px-8 py-3 rounded-md transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createInterviewMutation.isPending ? "Creating..." : "Create Interview"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
