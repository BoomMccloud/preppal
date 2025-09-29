import Link from "next/link";

export default function CreateInterviewPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Create Interview</h1>
        <p className="text-white/80 text-lg">Set up a new interview session</p>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8">
        <form className="space-y-6">
          <div>
            <label className="block text-white text-lg font-medium mb-2">Interview Type</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 border-2 border-purple-500 rounded-lg p-4 cursor-pointer hover:bg-white/20 transition-colors">
                <h3 className="text-white font-semibold mb-2">Technical</h3>
                <p className="text-white/80 text-sm">Coding challenges and technical questions</p>
              </div>
              <div className="bg-white/10 border-2 border-white/20 rounded-lg p-4 cursor-pointer hover:bg-white/20 transition-colors">
                <h3 className="text-white font-semibold mb-2">Behavioral</h3>
                <p className="text-white/80 text-sm">Situational and behavioral questions</p>
              </div>
              <div className="bg-white/10 border-2 border-white/20 rounded-lg p-4 cursor-pointer hover:bg-white/20 transition-colors">
                <h3 className="text-white font-semibold mb-2">System Design</h3>
                <p className="text-white/80 text-sm">Architecture and design discussions</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-white text-lg font-medium mb-2">Experience Level</label>
            <select className="w-full bg-white/10 border border-white/20 rounded-md px-4 py-3 text-white">
              <option>Entry Level (0-2 years)</option>
              <option>Mid Level (2-5 years)</option>
              <option>Senior Level (5+ years)</option>
            </select>
          </div>

          <div>
            <label className="block text-white text-lg font-medium mb-2">Duration</label>
            <select className="w-full bg-white/10 border border-white/20 rounded-md px-4 py-3 text-white">
              <option>15 minutes</option>
              <option>30 minutes</option>
              <option>45 minutes</option>
              <option>60 minutes</option>
            </select>
          </div>

          <div>
            <label className="block text-white text-lg font-medium mb-2">Additional Notes</label>
            <textarea
              rows={4}
              className="w-full bg-white/10 border border-white/20 rounded-md px-4 py-3 text-white placeholder-white/50"
              placeholder="Any specific topics or requirements for this interview..."
            />
          </div>

          <div className="flex justify-end space-x-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 text-white/80 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <Link
              href="/interview/demo-new/lobby"
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-md transition-colors font-medium"
            >
              Start Interview
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}