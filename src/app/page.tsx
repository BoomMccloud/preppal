import Link from "next/link";

import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <main className="bg-primary text-primary-text flex min-h-screen flex-col items-center justify-center">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            <span className="text-accent">PrepPal</span>
          </h1>
          <p className="text-secondary-text max-w-2xl text-center text-xl">
            Your AI-powered interview preparation companion. Practice with
            realistic mock interviews and receive detailed feedback to improve
            your performance.
          </p>

          <div className="flex flex-col items-center justify-center gap-4">
            <p className="text-primary-text text-center text-2xl">
              {session && <span>Welcome back, {session.user?.name}!</span>}
            </p>

            {session ? (
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="bg-accent text-primary rounded-full px-10 py-3 text-center font-semibold no-underline transition hover:opacity-90"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href="/create-interview"
                  className="bg-secondary text-primary-text rounded-full px-10 py-3 text-center font-semibold no-underline transition hover:opacity-80"
                >
                  Start Interview
                </Link>
                <Link
                  href="/api/auth/signout"
                  className="bg-secondary text-secondary-text hover:text-primary-text rounded-full px-6 py-3 text-center font-semibold no-underline transition hover:opacity-80"
                >
                  Sign out
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/api/auth/signin"
                  className="bg-accent text-primary rounded-full px-10 py-3 text-center font-semibold no-underline transition hover:opacity-90"
                >
                  Sign in
                </Link>
                <div className="flex gap-4 text-sm">
                  <Link
                    href="/terms"
                    className="text-secondary-text hover:text-primary-text transition-colors"
                  >
                    Terms
                  </Link>
                  <Link
                    href="/privacy"
                    className="text-secondary-text hover:text-primary-text transition-colors"
                  >
                    Privacy
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
