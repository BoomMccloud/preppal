"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import FeedbackCard from "./FeedbackCard";

interface FeedbackPollingProps {
  interviewId: string;
}

export default function FeedbackPolling({ interviewId }: FeedbackPollingProps) {
  const router = useRouter();

  const { data, error } = api.interview.getById.useQuery(
    {
      id: interviewId,
      includeFeedback: true,
    },
    {
      refetchInterval: 3000, // Poll every 3 seconds
    },
  );

  // Watch for feedback becoming available and refresh
  useEffect(() => {
    if (data?.feedback) {
      router.refresh();
    }
  }, [data, router]);

  // Handle error state
  if (error) {
    console.error("[FeedbackPolling] Error fetching feedback:", error);
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <FeedbackCard title="Error" className="text-center">
          <p className="text-secondary-text text-lg">
            Could not retrieve feedback. Please refresh the page to try again.
          </p>
        </FeedbackCard>
      </div>
    );
  }

  // Show loading state
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <FeedbackCard title="Processing Feedback" className="text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="border-accent h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="text-secondary-text text-lg">
            Your feedback is being generated. This may take a minute...
          </p>
          <p className="text-secondary-text text-sm">
            We're analyzing your interview performance
          </p>
        </div>
      </FeedbackCard>
    </div>
  );
}
