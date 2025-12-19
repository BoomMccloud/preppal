import { Link } from "~/i18n/navigation";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { api } from "~/trpc/server";
import FeedbackTabs from "./feedback-tabs";
import FeedbackCard from "./_components/FeedbackCard";
import FeedbackActions from "./_components/FeedbackActions";
import FeedbackPolling from "./_components/FeedbackPolling";

interface PageProps {
  params: Promise<{ interviewId: string; locale: string }>;
}

export default async function InterviewFeedbackPage({ params }: PageProps) {
  const { interviewId, locale } = await params;
  const t = await getTranslations("interview.feedback");

  try {
    const interview = await api.interview.getById({
      id: interviewId,
      includeFeedback: true,
    });

    // Handle non-COMPLETED status:
    // If it's still IN_PROGRESS, the worker might be currently saving the transcript.
    // Show polling state instead of redirecting immediately.
    if (
      interview.status !== "COMPLETED" &&
      interview.status !== "IN_PROGRESS"
    ) {
      console.warn(
        `[Feedback Page] User attempted to access feedback for non-relevant status - interviewId: ${interviewId}, status: ${interview.status}`,
      );
      redirect(`/${locale}/interview/${interviewId}/lobby`);
    }

    // Handle COMPLETED but feedback still processing, or still IN_PROGRESS (transitioning)
    if (interview.feedback === null) {
      return <FeedbackPolling interviewId={interviewId} />;
    }

    // Render feedback results
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-primary-text mb-4 text-4xl font-bold">
            {t("title")}
          </h1>
          <p className="text-secondary-text text-lg">
            {t("interviewId", { id: interviewId })}
          </p>
        </div>

        <FeedbackCard title={t("summary")} className="mb-8">
          <p className="text-secondary-text text-lg leading-relaxed">
            {interview.feedback.summary}
          </p>
        </FeedbackCard>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <FeedbackCard title={t("strengths")} className="lg:col-span-1">
            <div className="text-secondary-text whitespace-pre-wrap">
              {interview.feedback.strengths}
            </div>
          </FeedbackCard>

          <div className="lg:col-span-2">
            <FeedbackTabs
              contentAndStructure={interview.feedback.contentAndStructure}
              communicationAndDelivery={
                interview.feedback.communicationAndDelivery
              }
              presentation={interview.feedback.presentation}
            />
            <FeedbackActions />
          </div>
        </div>
      </div>
    );
  } catch {
    // Handle NOT_FOUND or other errors
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-secondary border-secondary-text rounded-lg border p-6 text-center backdrop-blur-sm">
          <p className="text-primary-text mb-4">{t("notFound")}</p>
          <Link
            href="/dashboard"
            className="bg-secondary hover:bg-secondary/80 text-primary-text border-secondary-text/10 inline-block rounded-md border px-6 py-3 font-medium transition-colors"
          >
            {t("returnToDashboard")}
          </Link>
        </div>
      </div>
    );
  }
}
