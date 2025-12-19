/**
 * Routing configuration for next-intl
 * Defines supported locales and default locale
 */
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es", "zh"],
  defaultLocale: "en",
  localePrefix: "always", // URLs always include locale: /en/dashboard
});

export type Locale = (typeof routing.locales)[number];
