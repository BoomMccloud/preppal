import Link from "next/link";

export default function CreateInterviewPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-theme-primary mb-4">Create Interview</h1>
        <p className="text-theme-secondary text-lg">Set up a new interview session</p>
      </div>

      <div className="bg-theme-secondary backdrop-blur-sm rounded-lg p-8 border border-theme-secondary opacity-50">
        <form className="space-y-6">
          <div>
            <label className="block text-theme-primary text-lg font-medium mb-2">Job Description</label>
            <textarea
              rows={8}
              className="w-full bg-theme-secondary border border-theme-secondary rounded-md px-4 py-3 text-theme-primary placeholder-theme-secondary"
              placeholder="Paste the job description here..."
              required
            />
          </div>

          <div>
            <label className="block text-theme-primary text-lg font-medium mb-2">Your Resume</label>
            <textarea
              rows={12}
              className="w-full bg-theme-secondary border border-theme-secondary rounded-md px-4 py-3 text-theme-primary placeholder-theme-secondary"
              placeholder="Paste your resume content here..."
              required
            />
          </div>


          <div className="flex justify-end space-x-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 text-theme-secondary hover:text-theme-primary transition-colors"
            >
              Cancel
            </Link>
            <Link
              href="/interview/demo-new/lobby"
              className="bg-theme-accent hover:bg-theme-accent text-white px-8 py-3 rounded-md transition-colors font-medium hover:opacity-90"
            >
              Start Interview
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}