import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import Navigation from "../_components/Navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="min-h-screen bg-primary">
      <Navigation userEmail={session.user?.email ?? undefined} />
      <main className="text-primary-text">{children}</main>
    </div>
  );
}