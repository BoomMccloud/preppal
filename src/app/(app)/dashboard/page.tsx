import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary-text mb-4">Dashboard</h1>
        <p className="text-secondary-text text-lg">Welcome to your interview preparation hub</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-secondary/50 backdrop-blur-sm rounded-lg p-6 border border-secondary-text/10">
          <h2 className="text-xl font-semibold text-primary-text mb-2">Quick Start</h2>
          <p className="text-secondary-text mb-4">Start a new interview session</p>
          <Link
            href="/create-interview"
            className="inline-block bg-accent hover:bg-accent/80 text-primary px-4 py-2 rounded-md transition-colors"
          >
            Create Interview
          </Link>
        </div>

        <div className="bg-secondary/50 backdrop-blur-sm rounded-lg p-6 border border-secondary-text/10">
          <h2 className="text-xl font-semibold text-primary-text mb-2">Recent Sessions</h2>
          <p className="text-secondary-text mb-4">Your recent interview sessions will appear here</p>
          <div className="space-y-2">
            <Link
              href="/interview/demo-123/feedback"
              className="block text-accent hover:text-accent/80 text-sm transition-colors"
            >
              Demo Session #123 - View Feedback
            </Link>
            <Link
              href="/interview/demo-456/lobby"
              className="block text-accent hover:text-accent/80 text-sm transition-colors"
            >
              Demo Session #456 - Enter Lobby
            </Link>
          </div>
        </div>

        <div className="bg-secondary/50 backdrop-blur-sm rounded-lg p-6 border border-secondary-text/10">
          <h2 className="text-xl font-semibold text-primary-text mb-2">Performance</h2>
          <p className="text-secondary-text">View your interview performance analytics</p>
        </div>
      </div>
    </div>
  );
}