import Link from "next/link";

export default function InterviewFeedbackPage({
  params,
}: {
  params: { interviewId: string };
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Interview Feedback</h1>
        <p className="text-white/80 text-lg">Interview ID: {params.interviewId}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Overall Score */}
        <div className="lg:col-span-1">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">Overall Score</h2>
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="3"
                  />
                  <path
                    d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeDasharray="75, 100"
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-3xl font-bold text-white">75</div>
                  <div className="text-white/60 text-sm">out of 100</div>
                </div>
              </div>
              <p className="text-green-400 font-medium mt-4">Good Performance</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Key Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/80">Technical Skills</span>
                <span className="text-green-400">8/10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/80">Communication</span>
                <span className="text-blue-400">7/10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/80">Problem Solving</span>
                <span className="text-yellow-400">6/10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/80">Code Quality</span>
                <span className="text-green-400">8/10</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Feedback */}
        <div className="lg:col-span-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-white mb-6">Detailed Analysis</h2>

            <div className="space-y-6">
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-lg font-medium text-green-400 mb-2">Strengths</h3>
                <ul className="text-white/80 space-y-1">
                  <li>• Strong understanding of data structures and algorithms</li>
                  <li>• Clean and readable code structure</li>
                  <li>• Good explanation of thought process</li>
                  <li>• Efficient problem-solving approach</li>
                </ul>
              </div>

              <div className="border-l-4 border-yellow-500 pl-4">
                <h3 className="text-lg font-medium text-yellow-400 mb-2">Areas for Improvement</h3>
                <ul className="text-white/80 space-y-1">
                  <li>• Consider edge cases earlier in the problem-solving process</li>
                  <li>• Practice explaining time and space complexity more clearly</li>
                  <li>• Work on optimization techniques for better performance</li>
                </ul>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-medium text-blue-400 mb-2">Recommendations</h3>
                <ul className="text-white/80 space-y-1">
                  <li>• Practice more dynamic programming problems</li>
                  <li>• Review system design fundamentals</li>
                  <li>• Focus on behavioral interview scenarios</li>
                  <li>• Continue practicing coding problems daily</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Interview Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/60">Duration:</span>
                <span className="text-white ml-2">42 minutes</span>
              </div>
              <div>
                <span className="text-white/60">Questions Asked:</span>
                <span className="text-white ml-2">5</span>
              </div>
              <div>
                <span className="text-white/60">Questions Solved:</span>
                <span className="text-white ml-2">4</span>
              </div>
              <div>
                <span className="text-white/60">Average Response Time:</span>
                <span className="text-white ml-2">3.2 minutes</span>
              </div>
            </div>
          </div>

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