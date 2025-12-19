"use client";

import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");

  const { data: profile, isLoading } = api.user.getProfile.useQuery();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-primary-text">{tCommon("loading")}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-primary-text mb-4 text-4xl font-bold">
          {t("title")}
        </h1>
        <p className="text-secondary-text text-lg">{t("subtitle")}</p>
      </div>

      <div className="bg-secondary border-secondary rounded-lg border p-8 backdrop-blur-sm">
        <h2 className="text-primary-text mb-4 text-2xl font-semibold">
          {t("personalInfo")}
        </h2>
        <div className="max-w-md space-y-4">
          <div>
            <label className="text-secondary-text mb-2 block text-sm font-medium">
              {t("name")}
            </label>
            <input
              type="text"
              className="bg-secondary border-secondary-text text-primary-text placeholder-secondary-text hover:border-accent/20 w-full rounded-md border px-3 py-2 transition-colors"
              placeholder={t("name")}
              value={profile?.name ?? ""}
              readOnly
            />
          </div>
          <div>
            <label className="text-secondary-text mb-2 block text-sm font-medium">
              {t("email")}
            </label>
            <input
              type="email"
              className="bg-secondary border-secondary-text text-primary-text placeholder-secondary-text hover:border-accent/20 w-full rounded-md border px-3 py-2 transition-colors"
              placeholder="your.email@example.com"
              value={profile?.email ?? ""}
              readOnly
            />
          </div>
        </div>
      </div>
    </div>
  );
}
