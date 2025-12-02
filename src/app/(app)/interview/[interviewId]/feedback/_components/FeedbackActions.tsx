import Link from "next/link";

export default function FeedbackActions() {
  return (
    <div className="mt-6 flex justify-end space-x-4">
      <Link
        href="/dashboard"
        className="text-secondary-text hover:text-primary-text px-6 py-3 transition-colors"
      >
        Back to Dashboard
      </Link>
      <button
        className="text-secondary-text hover:text-primary-text px-6 py-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        disabled
      >
        Download Report
      </button>
      <Link
        href="/create-interview"
        className="bg-accent hover:bg-accent/80 text-primary rounded-md px-6 py-3 transition-colors"
      >
        Schedule Another Interview
      </Link>
    </div>
  );
}
