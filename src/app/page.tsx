import Link from "next/link";

import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-theme-primary text-theme-primary">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            <span className="text-theme-accent">PrepPal</span>
          </h1>
          <p className="text-xl text-center max-w-2xl text-theme-secondary">
            Your AI-powered interview preparation companion. Practice with realistic mock interviews
            and receive detailed feedback to improve your performance.
          </p>

          <div className="flex flex-col items-center justify-center gap-4">
            <p className="text-center text-2xl text-theme-primary">
              {session && <span>Welcome back, {session.user?.name}!</span>}
            </p>

            {session ? (
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/dashboard"
                  className="rounded-full bg-theme-accent hover:bg-theme-accent text-white px-10 py-3 font-semibold no-underline transition text-center"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href="/create-interview"
                  className="rounded-full bg-theme-secondary hover:opacity-80 text-theme-primary px-10 py-3 font-semibold no-underline transition text-center"
                >
                  Start Interview
                </Link>
                <Link
                  href="/api/auth/signout"
                  className="rounded-full bg-theme-secondary hover:opacity-80 text-theme-secondary hover:text-theme-primary px-6 py-3 font-semibold no-underline transition text-center"
                >
                  Sign out
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/api/auth/signin"
                  className="rounded-full bg-theme-accent hover:bg-theme-accent text-white px-10 py-3 font-semibold no-underline transition text-center"
                >
                  Sign in
                </Link>
                <div className="flex gap-4 text-sm">
                  <Link
                    href="/terms"
                    className="text-theme-secondary hover:text-theme-primary transition-colors"
                  >
                    Terms
                  </Link>
                  <Link
                    href="/privacy"
                    className="text-theme-secondary hover:text-theme-primary transition-colors"
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
