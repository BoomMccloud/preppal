/**
 * Language switcher dropdown for UI language selection
 * Updates URL locale using locale-aware navigation (no page reload)
 */
"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "~/i18n/navigation";
import { useTransition } from "react";

const UI_LANGUAGES = [
  { code: "en", label: "English", flag: "EN" },
  { code: "es", label: "Español", flag: "ES" },
  { code: "zh", label: "中文", flag: "中" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleChange = (newLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <select
      value={locale}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isPending}
      className="bg-secondary text-secondary-text hover:text-primary-text border-secondary-text/20 focus:ring-accent cursor-pointer appearance-none rounded-md border px-2 py-1 text-sm transition-colors focus:ring-2 focus:outline-none disabled:opacity-50"
      aria-label="Select language"
    >
      {UI_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.label}
        </option>
      ))}
    </select>
  );
}
