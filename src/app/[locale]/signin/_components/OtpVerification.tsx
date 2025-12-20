/**
 * 6-digit OTP code entry component.
 * Auto-focuses inputs, handles paste, shows countdown timer.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

interface OtpVerificationProps {
  email: string;
  expiresAt: Date;
  onBack: () => void;
}

export function OtpVerification({
  email,
  expiresAt,
  onBack,
}: OtpVerificationProps) {
  const t = useTranslations("auth");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const verifyMutation = api.auth.verifyOtp.useMutation();
  const resendMutation = api.auth.sendOtp.useMutation();

  // Countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      );
      setTimeLeft(remaining);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (newCode.every((d) => d) && newCode.join("").length === 6) {
      void handleSubmit(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace to go to previous input
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      setCode(pasted.split(""));
      void handleSubmit(pasted);
    }
  };

  const handleSubmit = async (codeStr: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifyMutation.mutateAsync({ email, code: codeStr });
      if (result.success) {
        await signIn("email-otp", {
          userId: result.userId,
          callbackUrl: "/dashboard",
        });
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : t("verificationFailed");
      setError(errorMessage);
      // Clear code on error so user can retry
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    try {
      await resendMutation.mutateAsync({ email });
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : t("resendFailed");
      setError(errorMessage);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-primary-text text-xl font-semibold">
          {t("checkYourEmail")}
        </h2>
        <p className="text-secondary-text mt-2">{t("codeSentTo", { email })}</p>
      </div>

      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={isVerifying}
            className="border-secondary-text/20 bg-secondary/50 text-primary-text focus:ring-accent h-12 w-10 rounded-md border text-center text-lg focus:ring-2 focus:outline-none disabled:opacity-50"
            autoFocus={i === 0}
          />
        ))}
      </div>

      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      {isVerifying && (
        <p className="text-secondary-text text-center text-sm">
          {t("verifying")}
        </p>
      )}

      <p className="text-secondary-text text-center text-sm">
        {t("codeExpiresIn", { time: formatTime(timeLeft) })}
      </p>

      <div className="flex flex-col gap-2 text-center text-sm">
        <button
          onClick={() => void handleResend()}
          disabled={resendMutation.isPending}
          className="text-accent hover:underline disabled:opacity-50"
        >
          {resendMutation.isPending ? t("sending") : t("resendCode")}
        </button>
        <button
          onClick={onBack}
          className="text-secondary-text hover:underline"
        >
          {t("useDifferentEmail")}
        </button>
      </div>
    </div>
  );
}
