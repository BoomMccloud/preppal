"use client";

import { signIn, getProviders } from "next-auth/react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Provider = {
  id: string;
  name: string;
  type: string;
};

export default function SignInForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tProfile = useTranslations("profile");

  const [providers, setProviders] = useState<Record<string, Provider> | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [email, setEmail] = useState("dev1@preppal.com");
  const [password, setPassword] = useState("dev123");
  const [isSigningIn, setIsSigningIn] = useState(false);

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

  if (isLoading) {
    return (
      <div className="text-secondary-text text-center">
        <p>{tCommon("loading")}</p>
      </div>
    );
  }

  if (showCredentialsForm) {
    return (
      <div className="space-y-4">
        <form onSubmit={handleCredentialsSignIn} className="space-y-4">
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
              onClick={() => setShowCredentialsForm(false)}
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

  return (
    <div className="space-y-4">
      {providers &&
        Object.values(providers).map((provider) => (
          <button
            key={provider.id}
            onClick={() => {
              if (provider.type === "credentials") {
                setShowCredentialsForm(true);
              } else {
                void handleSignIn(provider.id);
              }
            }}
            className="bg-accent hover:bg-accent/80 text-primary w-full rounded-md px-4 py-3 font-medium transition-colors"
          >
            {t("signInWith", { provider: provider.name })}
          </button>
        ))}

      {(!providers || Object.keys(providers).length === 0) && (
        <div className="text-secondary-text text-center">
          <p className="mb-4">{t("noProviders")}</p>
          <p className="text-sm">{t("checkConfig")}</p>
        </div>
      )}
    </div>
  );
}
