"use client";

import { signIn, getProviders } from "next-auth/react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { OtpVerification } from "./OtpVerification";

type Provider = {
  id: string;
  name: string;
  type: string;
};

// View states for the sign-in flow
type ViewState =
  | { type: "providers" }
  | { type: "credentials" }
  | { type: "email-input" }
  | { type: "otp-verify"; email: string; expiresAt: Date };

export default function SignInForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tProfile = useTranslations("profile");

  const [providers, setProviders] = useState<Record<string, Provider> | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<ViewState>({ type: "providers" });

  // For credentials form (dev only)
  const [email, setEmail] = useState("dev1@preppal.com");
  const [password, setPassword] = useState("dev123");
  const [isSigningIn, setIsSigningIn] = useState(false);

  // For email OTP flow
  const [otpEmail, setOtpEmail] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const sendOtpMutation = api.auth.sendOtp.useMutation();

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const availableProviders = await getProviders();
        setProviders(availableProviders);
      } catch (error) {
        console.error("Error fetching providers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchProviders();
  }, []);

  const handleSignIn = async (providerId: string) => {
    try {
      await signIn(providerId, { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (result?.error) {
        console.error("Sign in failed:", result.error);
        alert(t("signInFailed"));
      } else if (result?.ok) {
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.error("Error signing in:", error);
      alert(t("signInError"));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    try {
      const result = await sendOtpMutation.mutateAsync({ email: otpEmail });
      if (result.success) {
        setView({
          type: "otp-verify",
          email: otpEmail,
          expiresAt: result.expiresAt,
        });
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : t("sendCodeFailed");
      setOtpError(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="text-secondary-text text-center">
        <p>{tCommon("loading")}</p>
      </div>
    );
  }

  // OTP Verification view
  if (view.type === "otp-verify") {
    return (
      <OtpVerification
        email={view.email}
        expiresAt={view.expiresAt}
        onBack={() => setView({ type: "email-input" })}
      />
    );
  }

  // Email input view (for OTP)
  if (view.type === "email-input") {
    return (
      <div className="space-y-4">
        <form onSubmit={(e) => void handleSendOtp(e)} className="space-y-4">
          <div>
            <label
              htmlFor="otp-email"
              className="text-secondary-text mb-2 block text-sm font-medium"
            >
              {tProfile("email")}
            </label>
            <input
              id="otp-email"
              type="email"
              value={otpEmail}
              onChange={(e) => setOtpEmail(e.target.value)}
              className="border-secondary-text/20 bg-secondary/50 text-primary-text focus:ring-accent w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          {otpError && <p className="text-danger text-sm">{otpError}</p>}

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={sendOtpMutation.isPending}
              className="bg-accent hover:bg-accent/80 disabled:bg-accent/50 text-primary flex-1 rounded-md px-4 py-3 font-medium transition-colors"
            >
              {sendOtpMutation.isPending ? t("sending") : t("sendCode")}
            </button>
            <button
              type="button"
              onClick={() => setView({ type: "providers" })}
              className="border-secondary-text/20 text-secondary-text hover:bg-secondary/50 rounded-md border px-4 py-3 transition-colors"
            >
              {tCommon("back")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Dev credentials view
  if (view.type === "credentials") {
    return (
      <div className="space-y-4">
        <form
          onSubmit={(e) => void handleCredentialsSignIn(e)}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="email"
              className="text-secondary-text mb-2 block text-sm font-medium"
            >
              {tProfile("email")}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-secondary-text/20 bg-secondary/50 text-primary-text focus:ring-accent w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
              placeholder="dev1@preppal.com"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-secondary-text mb-2 block text-sm font-medium"
            >
              {t("password")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-secondary-text/20 bg-secondary/50 text-primary-text focus:ring-accent w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
              placeholder="dev123"
              required
            />
          </div>
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={isSigningIn}
              className="bg-accent hover:bg-accent/80 disabled:bg-accent/50 text-primary flex-1 rounded-md px-4 py-3 font-medium transition-colors"
            >
              {isSigningIn ? t("signingIn") : t("signIn")}
            </button>
            <button
              type="button"
              onClick={() => setView({ type: "providers" })}
              className="border-secondary-text/20 text-secondary-text hover:bg-secondary/50 rounded-md border px-4 py-3 transition-colors"
            >
              {tCommon("back")}
            </button>
          </div>
        </form>
        <div className="text-secondary-text text-center text-sm">
          <p>{t("devCredentials")}:</p>
          <p>dev1@preppal.com / dev123</p>
          <p>dev2@preppal.com / dev123</p>
          <p>dev3@preppal.com / dev123</p>
        </div>
      </div>
    );
  }

  // Main providers view
  const hasDevCredentials =
    providers &&
    Object.values(providers).some(
      (p) => p.type === "credentials" && p.id === "credentials",
    );

  return (
    <div className="space-y-4">
      {/* OAuth providers */}
      {providers &&
        Object.values(providers)
          .filter((p) => p.type !== "credentials") // Filter out credential providers
          .map((provider) => (
            <button
              key={provider.id}
              onClick={() => void handleSignIn(provider.id)}
              className="bg-accent hover:bg-accent/80 text-primary w-full rounded-md px-4 py-3 font-medium transition-colors"
            >
              {t("signInWith", { provider: provider.name })}
            </button>
          ))}

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="bg-secondary-text/20 h-px flex-1" />
        <span className="text-secondary-text text-sm">{t("or")}</span>
        <div className="bg-secondary-text/20 h-px flex-1" />
      </div>

      {/* Email OTP button */}
      <button
        onClick={() => setView({ type: "email-input" })}
        className="border-secondary-text/20 text-primary-text hover:bg-secondary/50 w-full rounded-md border px-4 py-3 font-medium transition-colors"
      >
        {t("continueWithEmail")}
      </button>

      {/* Dev credentials (only in development) */}
      {hasDevCredentials && (
        <button
          onClick={() => setView({ type: "credentials" })}
          className="text-secondary-text hover:text-primary-text w-full text-sm underline transition-colors"
        >
          {t("devLogin")}
        </button>
      )}

      {(!providers || Object.keys(providers).length === 0) && (
        <div className="text-secondary-text text-center">
          <p className="mb-4">{t("noProviders")}</p>
          <p className="text-sm">{t("checkConfig")}</p>
        </div>
      )}
    </div>
  );
}
