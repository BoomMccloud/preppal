export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Dashboard</h1>
        <p className="text-white/80 text-lg">Welcome to your interview preparation hub</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Quick Start</h2>
          <p className="text-white/80 mb-4">Start a new interview session</p>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors">
            Create Interview
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Recent Sessions</h2>
          <p className="text-white/80">Your recent interview sessions will appear here</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Performance</h2>
          <p className="text-white/80">View your interview performance analytics</p>
        </div>
      </div>
    </div>
  );
}