/**
 * next-intl request configuration for App Router
 * Provides locale and messages to server components
 */
import { getRequestConfig } from "next-intl/server";
import { routing, type Locale } from "./routing";

// Import messages statically for type safety
import enMessages from "../../messages/en.json";
import esMessages from "../../messages/es.json";
import zhMessages from "../../messages/zh.json";

const messagesMap = {
  en: enMessages,
  es: esMessages,
  zh: zhMessages,
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate locale, fallback to default
  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: messagesMap[locale as Locale],
  };
});
