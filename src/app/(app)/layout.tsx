import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

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
    <div className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c]">
      <nav className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">PrepPal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white/80">Welcome, {session.user?.name}</span>
              <Link
                href="/api/auth/signout"
                className="text-white/80 hover:text-white transition-colors"
              >
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="text-white">{children}</main>
    </div>
  );
}