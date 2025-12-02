import Link from "next/link";

type InterviewControlsProps = {
  interviewId: string;
  onEndCall: () => void;
  onToggleMute: () => void;
};

export function InterviewControls({
  interviewId,
  onEndCall,
  onToggleMute,
}: InterviewControlsProps) {
  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-center space-x-6">
        {/* Microphone Button */}
        <button
          onClick={onToggleMute}
          className="bg-secondary hover:bg-secondary/80 text-primary-text border-secondary-text/10 rounded-full border p-4 transition-colors"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </button>

        {/* End Call Button */}
        <Link
          href={`/interview/${interviewId}/feedback`}
          onClick={onEndCall}
          className="bg-accent hover:bg-accent/80 text-primary rounded-full p-4 transition-colors"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 21v-4.967a.96.96 0 01.6-.92l1.4-.7a1 1 0 011.394.45l.8 1.6a1 1 0 01-.045 1.177l-1.334 1.49c-.93 1.058-.6 2.79.705 3.695a24.945 24.945 0 004.043 2.515c1.416.524 2.26-.84 2.26-.84l1.334-1.49a1 1 0 011.177-.045l1.6.8a1 1 0 01.45 1.394l-.7 1.4a.96.96 0 01-.92.6H16a8 8 0 01-8-8v-1z"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
