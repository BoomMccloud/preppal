import Link from "next/link";

export default async function InterviewSessionPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-8 py-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-medium text-primary-text mb-1">Interview Session</h1>
            <span className="text-secondary-text text-sm">ID: {interviewId}</span>
          </div>
          <div className="bg-secondary/30 rounded-lg px-4 py-2">
            <div className="text-secondary-text text-xs">Total Time</div>
            <div className="text-primary-text font-mono text-lg">15:30</div>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="px-8 flex items-center justify-center py-8">
        <div className="bg-secondary/30 backdrop-blur-sm rounded-2xl relative overflow-hidden mx-auto border border-secondary-text/10" style={{width: '768px', aspectRatio: '16/9'}}>
          {/* Video Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-accent rounded-full flex items-center justify-center mb-4 mx-auto shadow-2xl">
                <svg className="w-16 h-16 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-primary-text text-xl font-medium mb-1">AI Interviewer</h3>
              <p className="text-secondary-text">Listening...</p>
            </div>
          </div>

          {/* Recording Indicator */}
          <div className="absolute top-4 left-4 flex items-center space-x-2 bg-secondary/50 backdrop-blur-sm rounded-full px-3 py-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-primary-text text-xs">Recording</span>
          </div>

        </div>
      </div>

      {/* Bottom Control Panel */}
      <div className="px-8 py-6">
        <div className="flex justify-center items-center space-x-6">
          {/* Microphone Button */}
          <button className="bg-secondary hover:bg-secondary/80 text-primary-text p-4 rounded-full transition-colors border border-secondary-text/10">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          {/* End Call Button */}
          <Link
            href={`/interview/${interviewId}/feedback`}
            className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 21v-4.967a.96.96 0 01.6-.92l1.4-.7a1 1 0 011.394.45l.8 1.6a1 1 0 01-.045 1.177l-1.334 1.49c-.93 1.058-.6 2.79.705 3.695a24.945 24.945 0 004.043 2.515c1.416.524 2.26-.84 2.26-.84l1.334-1.49a1 1 0 011.177-.045l1.6.8a1 1 0 01.45 1.394l-.7 1.4a.96.96 0 01-.92.6H16a8 8 0 01-8-8v-1z" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}