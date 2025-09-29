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
    <div className="flex h-screen flex-col bg-primary">
      <Navigation userEmail={session.user?.email ?? undefined} />
      <main className="flex-1 overflow-y-auto text-primary-text">{children}</main>
    </div>
  );
}