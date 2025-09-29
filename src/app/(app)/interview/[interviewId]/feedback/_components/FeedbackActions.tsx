import Link from "next/link";

export default function FeedbackActions() {
  return (
    <div className="flex justify-end space-x-4 mt-6">
      <Link
        href="/dashboard"
        className="px-6 py-3 text-secondary-text hover:text-primary-text transition-colors"
      >
        Back to Dashboard
      </Link>
      <button
        className="px-6 py-3 text-secondary-text hover:text-primary-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled
      >
        Download Report
      </button>
      <Link
        href="/create-interview"
        className="bg-accent hover:bg-accent/80 text-slate-700 px-6 py-3 rounded-md transition-colors"
      >
        Schedule Another Interview
      </Link>
    </div>
  );
}