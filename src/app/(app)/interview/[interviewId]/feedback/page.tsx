import { api } from "~/trpc/server";
import FeedbackTabs from "./feedback-tabs";
import FeedbackCard from "./_components/FeedbackCard";
import FeedbackActions from "./_components/FeedbackActions";

export default async function InterviewFeedbackPage({
  params,
}: {
  params: { interviewId: string };
}) {
  const { interviewId } = params;
  const interview = await api.interview.getFeedback({ interviewId });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary-text mb-4">
          Interview Feedback
        </h1>
        <p className="text-secondary-text text-lg">Interview ID: {interviewId}</p>
      </div>

      {!interview.feedback ? (
        <FeedbackCard>
          <p className="text-secondary-text text-lg">
            No feedback available for this interview yet.
          </p>
        </FeedbackCard>
      ) : (
        <>
          <FeedbackCard title="Summary" className="mb-8">
            <p className="text-secondary-text text-lg leading-relaxed">
              {interview.feedback.summary}
            </p>
          </FeedbackCard>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <FeedbackCard title="Strengths" className="lg:col-span-1">
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
        </>
      )}
    </div>
  );
}