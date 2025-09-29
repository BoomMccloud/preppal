import Link from "next/link";

export default async function InterviewLobbyPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-primary-text mb-4">Interview Lobby</h1>
        <p className="text-secondary-text text-sm">Interview ID: {interviewId}</p>
      </div>

      <div className="bg-secondary backdrop-blur-sm rounded-lg p-6 border border-secondary-text">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold text-primary-text mb-6">Pre-Interview Checklist</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-success rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-primary-text">Camera access granted</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-success rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-primary-text">Microphone access granted</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                  <span className="text-primary text-sm">!</span>
                </div>
                <span className="text-primary-text">Network connection stable</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-primary-text mb-6">Interview Details</h2>
            <div className="space-y-4">
              <div>
                <span className="text-secondary-text">Type:</span>
                <span className="text-primary-text ml-2">Technical Interview</span>
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

        <div className="mt-8 pt-6 border-t border-secondary-text text-center">
          <p className="text-secondary-text mb-6">
            Make sure you&apos;re in a quiet environment with good lighting.
            The interview will be recorded for feedback purposes.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/dashboard"
              className="bg-secondary hover:bg-secondary/80 text-primary-text px-6 py-3 rounded-md transition-colors font-medium border border-secondary-text/10"
            >
              Back to Dashboard
            </Link>
            <Link
              href={`/interview/${interviewId}/session`}
              className="bg-accent hover:bg-accent/80 text-primary px-8 py-3 rounded-md transition-colors font-medium text-lg"
            >
              Start Interview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}