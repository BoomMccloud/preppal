import Link from "next/link";

export default async function InterviewSessionPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-white">Interview Session</h1>
            <span className="text-white/60">ID: {interviewId}</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-white text-sm">Recording</span>
            </div>
            <div className="text-white font-mono">
              <span className="text-white/60">Time:</span> 15:30
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        {/* AI Interviewer Panel */}
        <div className="max-w-md w-full p-6">
          <div className="bg-black/40 rounded-lg p-8 flex flex-col items-center">
            <div className="w-32 h-32 bg-purple-600 rounded-full flex items-center justify-center mb-6">
              <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-white text-xl font-medium mb-2">AI Interviewer</h3>
            <p className="text-white/60 text-center">Listening...</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black/20 backdrop-blur-sm border-t border-white/10 px-6 py-4">
        <div className="flex justify-center space-x-4">
          <button className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button className="bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
          <Link
            href={`/interview/${interviewId}/feedback`}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md transition-colors font-medium"
          >
            End Interview
          </Link>
        </div>
      </div>
    </div>
  );
}