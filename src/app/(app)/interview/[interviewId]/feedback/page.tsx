import Link from "next/link";
import { api } from "~/trpc/server";
import FeedbackTabs from "./feedback-tabs";

export default async function InterviewFeedbackPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;

  const interview = await api.interview.getFeedback({ interviewId });

  if (!interview.feedback) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Interview Feedback</h1>
          <p className="text-white/80 text-lg">Interview ID: {interviewId}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <p className="text-white/80">No feedback available for this interview yet.</p>
        </div>
      </div>
    );
  }

  const { feedback } = interview;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Interview Feedback</h1>
        <p className="text-white/80 text-lg">Interview ID: {interviewId}</p>
      </div>

      {/* Summary Section */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Summary</h2>
        <p className="text-white/90 text-lg leading-relaxed">{feedback.summary}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Strengths Section */}
        <div className="lg:col-span-1">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">Strengths</h2>
            <div className="text-white/90 whitespace-pre-wrap">
              {feedback.strengths}
            </div>
          </div>
        </div>

        {/* Detailed Feedback Tabs */}
        <div className="lg:col-span-2">
          <FeedbackTabs
            contentAndStructure={feedback.contentAndStructure}
            communicationAndDelivery={feedback.communicationAndDelivery}
            presentation={feedback.presentation}
          />

          <div className="flex justify-end space-x-4 mt-6">
            <Link
              href="/dashboard"
              className="px-6 py-3 text-white/80 hover:text-white transition-colors"
            >
              Back to Dashboard
            </Link>
            <button className="px-6 py-3 text-white/80 hover:text-white transition-colors">
              Download Report
            </button>
            <Link
              href="/create-interview"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-md transition-colors"
            >
              Schedule Another Interview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}