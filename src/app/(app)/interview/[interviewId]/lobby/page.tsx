import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "~/trpc/server";

export default async function InterviewLobbyPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;

  try {
    const interview = await api.interview.getById({
      id: interviewId,
      includeFeedback: false,
    });

    // Handle COMPLETED status with redirect
    if (interview.status === "COMPLETED") {
      redirect(`/interview/${interview.id}/feedback`);
    }

    // Handle IN_PROGRESS status
    if (interview.status === "IN_PROGRESS") {
      return (
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="bg-secondary border-secondary-text rounded-lg border p-6 text-center backdrop-blur-sm">
            <p className="text-primary-text mb-4">
              This interview is already in progress. Please refresh or contact
              support.
            </p>
            <Link
              href="/dashboard"
              className="bg-secondary hover:bg-secondary/80 text-primary-text border-secondary-text/10 inline-block rounded-md border px-6 py-3 font-medium transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      );
    }

    // Handle ERROR status
    if (interview.status === "ERROR") {
      return (
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="bg-secondary border-secondary-text rounded-lg border p-6 text-center backdrop-blur-sm">
            <p className="text-primary-text mb-4">
              This interview has encountered an error. Please contact support.
            </p>
            <Link
              href="/dashboard"
              className="bg-secondary hover:bg-secondary/80 text-primary-text border-secondary-text/10 inline-block rounded-md border px-6 py-3 font-medium transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      );
    }

    // Handle PENDING status - show lobby UI
    const displayDescription = interview.jobDescriptionSnapshot
      ? interview.jobDescriptionSnapshot.length > 100
        ? interview.jobDescriptionSnapshot.substring(0, 100) + "..."
        : interview.jobDescriptionSnapshot
      : "No job description provided";

    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-primary-text mb-4 text-2xl font-semibold">
            Interview Lobby
          </h1>
          <p className="text-secondary-text text-sm">{displayDescription}</p>
        </div>

        <div className="bg-secondary border-secondary-text rounded-lg border p-6 backdrop-blur-sm">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-primary-text mb-6 text-2xl font-semibold">
                Pre-Interview Checklist
              </h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-success flex h-6 w-6 items-center justify-center rounded-full">
                    <svg
                      className="text-primary h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-primary-text">
                    Camera access granted
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-success flex h-6 w-6 items-center justify-center rounded-full">
                    <svg
                      className="text-primary h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-primary-text">
                    Microphone access granted
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-accent flex h-6 w-6 items-center justify-center rounded-full">
                    <span className="text-primary text-sm">!</span>
                  </div>
                  <span className="text-primary-text">
                    Network connection stable
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-primary-text mb-6 text-2xl font-semibold">
                Interview Details
              </h2>
              <div className="space-y-4">
                <div>
                  <span className="text-secondary-text">Type:</span>
                  <span className="text-primary-text ml-2">
                    Technical Interview
                  </span>
                </div>
                <div>
                  <span className="text-secondary-text">Duration:</span>
                  <span className="text-primary-text ml-2">45 minutes</span>
                </div>
                <div>
                  <span className="text-secondary-text">Level:</span>
                  <span className="text-primary-text ml-2">Mid Level</span>
                </div>
                <div>
                  <span className="text-secondary-text">Status:</span>
                  <span className="text-success ml-2">Ready to start</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-secondary-text mt-8 border-t pt-6 text-center">
            <p className="text-secondary-text mb-6">
              Make sure you&apos;re in a quiet environment with good lighting.
              The interview will be recorded for feedback purposes.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/dashboard"
                className="bg-secondary hover:bg-secondary/80 text-primary-text border-secondary-text/10 rounded-md border px-6 py-3 font-medium transition-colors"
              >
                Back to Dashboard
              </Link>
              <Link
                href={`/interview/${interview.id}/session`}
                className="bg-accent hover:bg-accent/80 text-primary rounded-md px-8 py-3 text-lg font-medium transition-colors"
              >
                Start Interview
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  } catch {
    // Handle NOT_FOUND or other errors
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-secondary border-secondary-text rounded-lg border p-6 text-center backdrop-blur-sm">
          <p className="text-primary-text mb-4">
            Interview not found or you don&apos;t have access
          </p>
          <Link
            href="/dashboard"
            className="bg-secondary hover:bg-secondary/80 text-primary-text border-secondary-text/10 inline-block rounded-md border px-6 py-3 font-medium transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }
}
