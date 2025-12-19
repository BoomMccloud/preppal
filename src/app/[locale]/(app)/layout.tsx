import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import Navigation from "../../_components/Navigation";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  const { locale } = await params;

  if (!session) {
    redirect(`/${locale}/signin`);
  }

  return (
    <div className="bg-primary flex h-screen flex-col">
      <Navigation userEmail={session.user?.email ?? undefined} />
      <main className="text-primary-text flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
