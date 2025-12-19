"use client";

import { Link } from "~/i18n/navigation";
import { useTranslations } from "next-intl";

interface FeedbackActionsProps {
  isGuest?: boolean;
}

export default function FeedbackActions({ isGuest }: FeedbackActionsProps) {
  const t = useTranslations("interview.feedback");

  // Guests only see a minimal view
  if (isGuest) {
    return null;
  }

  return (
    <div className="mt-6 flex justify-end space-x-4">
      <Link
        href="/dashboard"
        className="text-secondary-text hover:text-primary-text px-6 py-3 transition-colors"
      >
        {t("backToDashboard")}
      </Link>
      <button
        className="text-secondary-text hover:text-primary-text px-6 py-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        disabled
      >
        {t("downloadReport")}
      </button>
      <Link
        href="/create-interview"
        className="bg-accent hover:bg-accent/80 text-primary rounded-md px-6 py-3 transition-colors"
      >
        {t("scheduleAnother")}
      </Link>
    </div>
  );
}
