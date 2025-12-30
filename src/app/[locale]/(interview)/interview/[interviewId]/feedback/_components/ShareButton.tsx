"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

interface ShareButtonProps {
  interviewId: string;
}

export default function ShareButton({ interviewId }: ShareButtonProps) {
  const t = useTranslations("interview.feedback");
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const createGuestLink = api.interview.createGuestLink.useMutation();

  const handleShare = async () => {
    setShowModal(true);
    if (!createGuestLink.data) {
      await createGuestLink.mutateAsync({ interviewId });
    }
  };

  const guestUrl = createGuestLink.data
    ? `${window.location.origin}${window.location.pathname}?token=${createGuestLink.data.token}`
    : null;

  const expiryDate = createGuestLink.data?.expiresAt.toLocaleString() ?? "";

  const handleCopy = async () => {
    if (guestUrl) {
      await navigator.clipboard.writeText(guestUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <button
        onClick={handleShare}
        className="bg-secondary hover:bg-secondary/80 text-primary-text border-secondary-text/10 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
      >
        {t("share")}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-primary mx-4 w-full max-w-md rounded-lg p-6 shadow-xl">
            <h3 className="text-primary-text mb-4 text-lg font-semibold">
              {t("shareTitle")}
            </h3>

            {createGuestLink.isPending && (
              <p className="text-secondary-text">{t("generatingLink")}</p>
            )}

            {createGuestLink.error && (
              <p className="text-danger">{t("shareError")}</p>
            )}

            {guestUrl && (
              <div className="space-y-4">
                <p className="text-secondary-text text-sm">
                  {t("shareDescription")}
                </p>
                <div className="bg-secondary flex items-center gap-2 rounded-md p-3">
                  <input
                    type="text"
                    value={guestUrl}
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
                <p className="text-secondary-text text-xs">
                  {t("linkExpiry", { date: expiryDate })}
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
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
