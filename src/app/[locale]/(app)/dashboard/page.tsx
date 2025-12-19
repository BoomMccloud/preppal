"use client";

import { useTranslations } from "next-intl";
import { Link } from "~/i18n/navigation";
import { api } from "~/trpc/react";
import { useLocale } from "next-intl";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const {
    data: interviews,
    isLoading,
    error,
  } = api.interview.getHistory.useQuery();

  const utils = api.useUtils();
  const deleteInterview = api.interview.delete.useMutation({
    onSuccess: () => {
      void utils.interview.getHistory.invalidate();
    },
  });

  const handleDelete = (id: string) => {
    if (confirm(t("confirmDelete"))) {
      deleteInterview.mutate({ id });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-primary-text mb-4 text-4xl font-bold">
          {t("title")}
        </h1>
        <p className="text-secondary-text text-lg">{t("welcome")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-secondary/50 border-secondary-text/10 rounded-lg border p-6 backdrop-blur-sm">
          <h2 className="text-primary-text mb-2 text-xl font-semibold">
            {t("quickStart")}
          </h2>
          <p className="text-secondary-text mb-4">
            {t("quickStartDescription")}
          </p>
          <Link
            href="/create-interview"
            className="bg-accent hover:bg-accent/80 text-primary inline-block rounded-md px-4 py-2 transition-colors"
          >
            {t("createNew")}
          </Link>
        </div>

        <div className="bg-secondary/50 border-secondary-text/10 rounded-lg border p-6 backdrop-blur-sm">
          <h2 className="text-primary-text mb-2 text-xl font-semibold">
            {t("recentSessions")}
          </h2>

          {isLoading && (
            <p className="text-secondary-text mb-4">{tCommon("loading")}</p>
          )}

          {error && <p className="mb-4 text-red-500">{t("loadError")}</p>}

          {!isLoading && !error && interviews && interviews.length === 0 && (
            <p className="text-secondary-text mb-4">
              {t("recentSessionsEmpty")}
            </p>
          )}

          {!isLoading && !error && interviews && interviews.length > 0 && (
            <div className="space-y-4">
              {interviews.map((interview) => {
                const targetPath =
                  interview.status === "COMPLETED"
                    ? `/interview/${interview.id}/feedback`
                    : `/interview/${interview.id}/lobby`;

                const linkText =
                  interview.status === "COMPLETED"
                    ? t("viewFeedback")
                    : t("enterLobby");

                const formattedDate = new Intl.DateTimeFormat(locale, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }).format(new Date(interview.createdAt));

                return (
                  <div
                    key={interview.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <div className="text-primary-text font-medium">
                        {interview.jobTitleSnapshot}
                      </div>
                      <div className="text-secondary-text text-xs">
                        {formattedDate}
                      </div>
                      <Link
                        href={targetPath}
                        className="text-accent hover:text-accent/80 transition-colors"
                      >
                        {linkText}
                      </Link>
                    </div>
                    <button
                      onClick={() => handleDelete(interview.id)}
                      className="text-red-500 hover:text-red-700"
                      disabled={deleteInterview.isPending}
                    >
                      {tCommon("delete")}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-secondary/50 border-secondary-text/10 rounded-lg border p-6 backdrop-blur-sm">
          <h2 className="text-primary-text mb-2 text-xl font-semibold">
            {t("performance")}
          </h2>
          <p className="text-secondary-text">{t("performanceDescription")}</p>
        </div>
      </div>
    </div>
  );
}
