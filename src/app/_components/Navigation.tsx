"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

interface NavigationProps {
  userEmail?: string;
}

export default function Navigation({ userEmail }: NavigationProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/dashboard" && pathname === "/dashboard") return true;
    if (path !== "/dashboard" && pathname.startsWith(path)) return true;
    return false;
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/create-interview", label: "Create Interview" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <nav className="bg-secondary border-secondary-text/20 border-b backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex items-center space-x-8">
            <Link
              href="/dashboard"
              className="text-accent text-xl font-bold transition-colors hover:opacity-80"
            >
              PrepPal
            </Link>

            <div className="hidden space-x-6 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "text-primary bg-accent border-accent font-semibold"
                      : "text-secondary-text hover:text-primary-text hover:bg-accent/10 hover:border-accent/20 border-transparent"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {userEmail && (
              <span className="text-secondary-text hidden text-sm sm:block">
                {userEmail}
              </span>
            )}
            <Link
              href="/api/auth/signout"
              className="text-secondary-text hover:text-primary-text text-sm transition-colors"
            >
              Sign Out
            </Link>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="pb-4 md:hidden">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "text-primary bg-accent border-accent font-semibold"
                    : "text-secondary-text hover:text-primary-text hover:bg-accent/10 hover:border-accent/20 border-transparent"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
