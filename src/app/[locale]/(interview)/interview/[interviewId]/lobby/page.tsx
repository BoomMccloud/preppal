import { Link } from "~/i18n/navigation";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { api } from "~/trpc/server";
import LobbyActions from "./_components/LobbyActions";

export default async function InterviewLobbyPage({
  params,
  searchParams,
}: {
  params: Promise<{ interviewId: string; locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { interviewId, locale } = await params;
  const { token } = await searchParams;
  const t = await getTranslations("interview.lobby");

  try {
    const interview = await api.interview.getById({
      id: interviewId,
      token,
      includeFeedback: false,
    });

    const isGuest = interview.isGuest;

    // Handle COMPLETED status with redirect
    if (interview.status === "COMPLETED") {
      const redirectUrl = token
        ? `/${locale}/interview/${interview.id}/feedback?token=${token}`
        : `/${locale}/interview/${interview.id}/feedback`;
      redirect(redirectUrl);
    }

    // Handle IN_PROGRESS status
    if (interview.status === "IN_PROGRESS") {
      return (
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="bg-secondary border-secondary-text rounded-lg border p-6 text-center backdrop-blur-sm">
            <p className="text-primary-text mb-4">
              {isGuest ? t("inProgressGuest") : t("inProgressError")}
            </p>
            {!isGuest && (
              <Link
                href="/dashboard"
                className="bg-secondary hover:bg-secondary/80 text-primary-text border-secondary-text/10 inline-block rounded-md border px-6 py-3 font-medium transition-colors"
              >
                {t("returnToDashboard")}
              </Link>
            )}
          </div>
        </div>
      );
    }

    // Handle ERROR status
    if (interview.status === "ERROR") {
      return (
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="bg-secondary border-secondary-text rounded-lg border p-6 text-center backdrop-blur-sm">
            <p className="text-primary-text mb-4">{t("errorState")}</p>
            {!isGuest && (
              <Link
                href="/dashboard"
                className="bg-secondary hover:bg-secondary/80 text-primary-text border-secondary-text/10 inline-block rounded-md border px-6 py-3 font-medium transition-colors"
              >
                {t("returnToDashboard")}
              </Link>
            )}
          </div>
        </div>
      );
    }

    // Handle PENDING status - show lobby UI
    const displayDescription = interview.jobDescriptionSnapshot
      ? interview.jobDescriptionSnapshot.length > 100
        ? interview.jobDescriptionSnapshot.substring(0, 100) + "..."
        : interview.jobDescriptionSnapshot
      : t("noJobDescription");

    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-primary-text mb-4 text-2xl font-semibold">
            {isGuest ? t("guestTitle") : t("title")}
          </h1>
          {isGuest && (
            <p className="text-accent mb-2 text-sm">{t("guestSubtitle")}</p>
          )}
          <p className="text-secondary-text text-sm">{displayDescription}</p>
        </div>

        <div className="bg-secondary border-secondary-text rounded-lg border p-6 backdrop-blur-sm">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-primary-text mb-6 text-2xl font-semibold">
                {t("checklist")}
              </h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-success flex h-6 w-6 items-center justify-center rounded-full">
                    <svg
                      className="text-primary h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-primary-text">
                    {t("cameraGranted")}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-success flex h-6 w-6 items-center justify-center rounded-full">
                    <svg
                      className="text-primary h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-primary-text">
                    {t("microphoneGranted")}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-accent flex h-6 w-6 items-center justify-center rounded-full">
                    <span className="text-primary text-sm">!</span>
                  </div>
                  <span className="text-primary-text">
                    {t("networkStable")}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-primary-text mb-6 text-2xl font-semibold">
                {t("details")}
              </h2>
              <div className="space-y-4">
                <div>
                  <span className="text-secondary-text">{t("type")}:</span>
                  <span className="text-primary-text ml-2">
                    {t("technicalInterview")}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-text">{t("duration")}:</span>
                  <span className="text-primary-text ml-2">
                    {t("minutes", { count: 45 })}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-text">{t("level")}:</span>
                  <span className="text-primary-text ml-2">
                    {t("midLevel")}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-text">{t("status")}:</span>
                  <span className="text-success ml-2">{t("readyToStart")}</span>
                </div>
              </div>
            </div>
          </div>

          <LobbyActions
            interviewId={interview.id}
            isGuest={isGuest}
            guestToken={"guestToken" in interview ? interview.guestToken : null}
            guestExpiresAt={
              "guestExpiresAt" in interview ? interview.guestExpiresAt : null
            }
            urlToken={token}
          />
        </div>
      </div>
    );
  } catch {
    // Handle NOT_FOUND or other errors (including expired/invalid token)
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-secondary border-secondary-text rounded-lg border p-6 text-center backdrop-blur-sm">
          <p className="text-primary-text mb-4">
            {token ? t("linkExpiredOrInvalid") : t("notFound")}
          </p>
          {!token && (
            <Link
              href="/dashboard"
              className="bg-secondary hover:bg-secondary/80 text-primary-text border-secondary-text/10 inline-block rounded-md border px-6 py-3 font-medium transition-colors"
            >
              {t("returnToDashboard")}
            </Link>
          )}
        </div>
      </div>
    );
  }
}
