"use client";

/**
 * LobbyActions - Client component for lobby page interactive actions.
 * Handles share link generation, copying, and start interview button.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

interface LobbyActionsProps {
  interviewId: string;
  isGuest: boolean;
  guestToken?: string | null;
  guestExpiresAt?: Date | null;
  /** Guest token from URL for guest users to start interview */
  urlToken?: string;
}

export default function LobbyActions({
  interviewId,
  isGuest,
  guestToken,
  guestExpiresAt,
  urlToken,
}: LobbyActionsProps) {
  const t = useTranslations("interview.lobby");
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const createGuestLink = api.interview.createGuestLink.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  const hasActiveGuestLink =
    guestToken && guestExpiresAt && new Date(guestExpiresAt) > new Date();

  const getGuestUrl = () => {
    if (!guestToken) return null;
    const baseUrl = window.location.origin;
    return `${baseUrl}/interview/${interviewId}/lobby?token=${guestToken}`;
  };

  const getTimeRemaining = () => {
    if (!guestExpiresAt) return "";
    const now = new Date();
    const expiry = new Date(guestExpiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    if (diffMs <= 0) return t("linkExpired");
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return t("expiresIn", { hours, minutes });
  };

  const handleCopy = async () => {
    const url = getGuestUrl();
    if (url) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    await createGuestLink.mutateAsync({ interviewId });
  };

  const handleShareClick = async () => {
    if (hasActiveGuestLink) {
      setShowShareModal(true);
    } else {
      await createGuestLink.mutateAsync({ interviewId });
      setShowShareModal(true);
    }
  };

  const getSessionUrl = () => {
    const base = `/interview/${interviewId}/session`;
    if (isGuest && urlToken) {
      return `${base}?token=${urlToken}`;
    }
    return base;
  };

  // Guest view - simplified UI
  if (isGuest) {
    return (
      <div className="border-secondary-text mt-8 border-t pt-6 text-center">
        <p className="text-secondary-text mb-6">{t("guestInstructions")}</p>
        <button
          onClick={() => router.push(getSessionUrl())}
          className="bg-accent hover:bg-accent/80 text-primary rounded-md px-8 py-3 text-lg font-medium transition-colors"
        >
          {t("start")}
        </button>
      </div>
    );
  }

  // Owner view with active guest link
  if (hasActiveGuestLink) {
    return (
      <>
        <div className="border-secondary-text mt-8 border-t pt-6">
          <div className="bg-accent/10 border-accent mb-6 rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-accent text-lg">⚠️</span>
              <span className="text-primary-text font-medium">
                {t("sharedWarningTitle")}
              </span>
            </div>
            <p className="text-secondary-text mb-3 text-sm">
              {getTimeRemaining()}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopy}
                className="bg-secondary hover:bg-secondary/80 text-primary-text border-secondary-text/10 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
              >
                {copied ? t("copied") : t("copyLink")}
              </button>
              <button
                onClick={handleRegenerate}
                disabled={createGuestLink.isPending}
                className="bg-secondary hover:bg-secondary/80 text-primary-text border-secondary-text/10 rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {createGuestLink.isPending ? t("regenerating") : t("regenerate")}
              </button>
            </div>
          </div>
          <div className="text-center">
            <p className="text-secondary-text mb-4 text-sm">
              {t("startAnywayWarning")}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="bg-secondary hover:bg-secondary/80 text-primary-text border-secondary-text/10 rounded-md border px-6 py-3 font-medium transition-colors"
              >
                {t("returnToDashboard")}
              </button>
              <button
                onClick={() => router.push(getSessionUrl())}
                className="bg-accent hover:bg-accent/80 text-primary rounded-md px-8 py-3 font-medium transition-colors"
              >
                {t("startAnyway")}
              </button>
            </div>
          </div>
        </div>

        {/* Share Modal for copying link */}
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-primary mx-4 w-full max-w-md rounded-lg p-6 shadow-xl">
              <h3 className="text-primary-text mb-4 text-lg font-semibold">
                {t("shareLinkTitle")}
              </h3>
              <div className="bg-secondary flex items-center gap-2 rounded-md p-3">
                <input
                  type="text"
                  value={getGuestUrl() ?? ""}
                  readOnly
                  className="text-primary-text flex-1 bg-transparent text-sm outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="bg-accent hover:bg-accent/80 text-primary shrink-0 rounded px-3 py-1 text-sm font-medium transition-colors"
                >
                  {copied ? t("copied") : t("copy")}
                </button>
              </div>
              <p className="text-secondary-text mt-2 text-xs">
                {getTimeRemaining()}
              </p>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-secondary-text hover:text-primary-text px-4 py-2 transition-colors"
                >
                  {t("close")}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Owner view without guest link
  return (
    <div className="border-secondary-text mt-8 border-t pt-6 text-center">
      <p className="text-secondary-text mb-6">{t("instructions")}</p>
      <div className="flex justify-center gap-4">
        <button
          onClick={() => router.push("/dashboard")}
          className="bg-secondary hover:bg-secondary/80 text-primary-text border-secondary-text/10 rounded-md border px-6 py-3 font-medium transition-colors"
        >
          {t("returnToDashboard")}
        </button>
        <button
          onClick={handleShareClick}
          disabled={createGuestLink.isPending}
          className="bg-secondary hover:bg-secondary/80 text-primary-text border-secondary-text/10 rounded-md border px-6 py-3 font-medium transition-colors disabled:opacity-50"
        >
          {createGuestLink.isPending ? t("generating") : t("shareLink")}
        </button>
        <button
          onClick={() => router.push(getSessionUrl())}
          className="bg-accent hover:bg-accent/80 text-primary rounded-md px-8 py-3 text-lg font-medium transition-colors"
        >
          {t("start")}
        </button>
      </div>
    </div>
  );
}
