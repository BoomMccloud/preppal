// DEV ONLY: Transcript viewer for debugging
// Displays interview transcripts in human-readable format

import { notFound, redirect } from "next/navigation";
import { api } from "~/trpc/server";

interface PageProps {
  params: Promise<{ interviewId: string; locale: string }>;
}

export default async function TranscriptViewerPage({ params }: PageProps) {
  const { interviewId, locale } = await params;

  // Redirect to dashboard in production
  if (process.env.NODE_ENV === "production") {
    redirect(`/${locale}/dashboard`);
  }

  try {
    const data = await api.interview.getTranscript({ interviewId });

    return (
      <div className="min-h-screen bg-gray-50 p-8 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
              Transcript Viewer (DEV)
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Interview ID:{" "}
              <code className="rounded bg-gray-200 px-2 py-1 dark:bg-gray-800">
                {interviewId}
              </code>
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Total turns: {data.turns.length}
            </p>
          </div>

          {/* Transcript Display */}
          <div className="space-y-4">
            {data.turns.map((turn, index) => (
              <div
                key={index}
                className={`rounded-lg p-4 ${
                  turn.speaker === "USER"
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "bg-green-50 dark:bg-green-900/20"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`font-semibold ${
                      turn.speaker === "USER"
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-green-700 dark:text-green-300"
                    }`}
                  >
                    {turn.speaker}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {turn.timestamp.toLocaleString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  {turn.content}
                </p>
              </div>
            ))}
          </div>

          {/* Plain Text Export */}
          <div className="mt-8">
            <details className="rounded-lg bg-white p-4 dark:bg-gray-800">
              <summary className="cursor-pointer font-semibold text-gray-900 dark:text-white">
                Plain Text Export
              </summary>
              <pre className="mt-4 overflow-x-auto rounded bg-gray-100 p-4 text-sm whitespace-pre-wrap text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                {data.plainText}
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Failed to load transcript:", error);
    notFound();
  }
}
