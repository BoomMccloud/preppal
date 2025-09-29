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
    <nav className="bg-secondary backdrop-blur-sm border-b border-secondary-text/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-accent hover:opacity-80 transition-colors">
              PrepPal
            </Link>

            <div className="hidden md:flex space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
                    isActive(link.href)
                      ? "text-primary bg-accent border-accent font-semibold"
                      : "text-secondary-text hover:text-primary-text hover:bg-accent/10 border-transparent hover:border-accent/20"
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
              <span className="text-secondary-text text-sm hidden sm:block">
                {userEmail}
              </span>
            )}
            <Link
              href="/api/auth/signout"
              className="text-secondary-text hover:text-primary-text transition-colors text-sm"
            >
              Sign Out
            </Link>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden pb-4">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
                  isActive(link.href)
                    ? "text-primary bg-accent border-accent font-semibold"
                    : "text-secondary-text hover:text-primary-text hover:bg-accent/10 border-transparent hover:border-accent/20"
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