"use client";

import { useEffect, useState } from "react";
import { useRouter } from "~/i18n/navigation";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import FeedbackCard from "./FeedbackCard";

interface FeedbackPollingProps {
  interviewId: string;
}

export default function FeedbackPolling({ interviewId }: FeedbackPollingProps) {
  const router = useRouter();
  const t = useTranslations("interview.feedback");
  const [shouldPoll, setShouldPoll] = useState(true);

  const { data, error } = api.interview.getById.useQuery(
    {
      id: interviewId,
      includeFeedback: true,
    },
    {
      refetchInterval: shouldPoll ? 3000 : false, // Poll every 3 seconds
      retry: false, // Don't retry on error (like 404)
    },
  );

  // Stop polling if we have feedback or an error
  useEffect(() => {
    if (error || data?.feedback) {
      setShouldPoll(false);
    }
  }, [error, data?.feedback]);

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
        <FeedbackCard title={t("errorTitle")} className="text-center">
          <p className="text-secondary-text text-lg">{t("errorMessage")}</p>
        </FeedbackCard>
      </div>
    );
  }

  // Show loading state
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <FeedbackCard title={t("processingTitle")} className="text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="border-accent h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="text-secondary-text text-lg">
            {t("processingMessage")}
          </p>
          <p className="text-secondary-text text-sm">
            {t("analyzingPerformance")}
          </p>
        </div>
      </FeedbackCard>
    </div>
  );
}
