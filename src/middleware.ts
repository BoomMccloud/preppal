/**
 * Middleware for locale detection and routing
 * Handles locale prefixes in URLs (e.g., /es/dashboard)
 */
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export default intlMiddleware;

export const config = {
  // Match all paths except API routes, static files, etc.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/"],
};
