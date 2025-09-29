"use client";

import { signIn, getProviders } from "next-auth/react";
import { useEffect, useState } from "react";

type Provider = {
  id: string;
  name: string;
  type: string;
};

export default function SignInForm() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null);
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

    fetchProviders();
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
        alert("Sign in failed. Please check your credentials.");
      } else if (result?.ok) {
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.error("Error signing in:", error);
      alert("An error occurred during sign in.");
    } finally {
      setIsSigningIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center text-secondary-text">
        <p>Loading sign-in options...</p>
      </div>
    );
  }

  if (showCredentialsForm) {
    return (
      <div className="space-y-4">
        <form onSubmit={handleCredentialsSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-secondary-text mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-text/20 rounded-md bg-secondary/50 text-primary-text focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="dev1@preppal.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-secondary-text mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-text/20 rounded-md bg-secondary/50 text-primary-text focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="dev123"
              required
            />
          </div>
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={isSigningIn}
              className="flex-1 bg-accent hover:bg-accent/80 disabled:bg-accent/50 text-primary font-medium py-3 px-4 rounded-md transition-colors"
            >
              {isSigningIn ? "Signing in..." : "Sign In"}
            </button>
            <button
              type="button"
              onClick={() => setShowCredentialsForm(false)}
              className="px-4 py-3 border border-secondary-text/20 text-secondary-text hover:bg-secondary/50 rounded-md transition-colors"
            >
              Back
            </button>
          </div>
        </form>
        <div className="text-center text-sm text-secondary-text">
          <p>Development credentials:</p>
          <p>dev1@preppal.com / dev123</p>
          <p>dev2@preppal.com / dev123</p>
          <p>dev3@preppal.com / dev123</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {providers && Object.values(providers).map((provider) => (
        <button
          key={provider.id}
          onClick={() => {
            if (provider.type === "credentials") {
              setShowCredentialsForm(true);
            } else {
              handleSignIn(provider.id);
            }
          }}
          className="w-full bg-accent hover:bg-accent/80 text-primary font-medium py-3 px-4 rounded-md transition-colors"
        >
          Sign in with {provider.name}
        </button>
      ))}

      {(!providers || Object.keys(providers).length === 0) && (
        <div className="text-center text-secondary-text">
          <p className="mb-4">No authentication providers available</p>
          <p className="text-sm">Please check your configuration</p>
        </div>
      )}
    </div>
  );
}