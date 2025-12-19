/**
 * Layout for interview routes - allows both authenticated users and guests.
 * Does not force authentication redirect; pages handle access control via tokens.
 */
import { auth } from "~/server/auth";
import Navigation from "../../_components/Navigation";

export default async function InterviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Show navigation for authenticated users, hide for guests
  return (
    <div className="bg-primary flex h-screen flex-col">
      {session && <Navigation userEmail={session.user?.email ?? undefined} />}
      <main className="text-primary-text flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
