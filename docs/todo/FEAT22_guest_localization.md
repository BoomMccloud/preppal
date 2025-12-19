# Feature Specification: Guest Localization & Shared Links

## 1. Overview

This feature improves the internationalization (i18n) experience for guest users accessing Preppal via shared interview links. It ensures guests can use their preferred UI language without losing access to their session.

**Key Principle:** UI language is the *recipient's* preference, not the sender's. Interview content language is a separate concern (stored in the interview record).

## 2. Problem Statement

The guest experience has two internationalization friction points:

1. **No Language Switcher for Guests:** The `Navigation` component is hidden for unauthenticated users in `InterviewLayout`. Guests cannot change their UI language.

2. **Language Switching Breaks Access:** The `LanguageSwitcher` uses `router.replace(pathname, { locale })` which drops query parameters. Guests rely on `?token=...` for access, so switching languages locks them out.

### Non-Issue: Shared Links "Default to English"

The `next-intl` middleware already:
- Preserves query parameters during locale redirects
- Detects recipient's `Accept-Language` header
- Uses priority: URL prefix → cookie → Accept-Language → default

Locale-less share URLs are correct - they respect recipient preferences.

## 3. Solution Design

### 3.1 Token-Preserving Language Switcher

**Goal:** Language switching preserves `?token=...` and other query parameters.

**Change:** Update `LanguageSwitcher.tsx` to include searchParams in the new URL.

### 3.2 Guest Header

**Goal:** Provide guests with Language and Theme controls.

**Change:** Render a minimal inline header in `InterviewLayout` for guests. Do not modify `Navigation.tsx`.

## 4. Implementation Details

### Files to Modify

1. **`src/app/_components/LanguageSwitcher.tsx`**

   Update `handleChange` to preserve query params using `window.location.search`:
   ```typescript
   const handleChange = (newLocale: string) => {
     startTransition(() => {
       const params = window.location.search;
       const newPath = params ? `${pathname}${params}` : pathname;
       router.replace(newPath, { locale: newLocale });
     });
   };
   ```

   **Why `window.location.search` instead of `useSearchParams`?**
   - No new imports or Suspense boundaries required
   - Handler only runs on click events, so `window` is always available
   - Simpler change with identical behavior

2. **`src/app/[locale]/(interview)/layout.tsx`**
   ```tsx
   import { LanguageSwitcher } from "~/app/_components/LanguageSwitcher";
   import { ThemeToggle } from "~/app/_components/ThemeToggle";
   import { Link } from "~/i18n/navigation"; // Locale-aware Link preserves guest's language choice

   export default async function InterviewLayout({ children }) {
     const session = await auth();

     return (
       <div className="bg-primary flex h-screen flex-col">
         {session ? (
           <Navigation userEmail={session.user?.email} />
         ) : (
           <header className="bg-secondary flex items-center justify-between px-4 py-2">
             <Link href="/" className="text-primary-text font-semibold">
               PrepPal
             </Link>
             <div className="flex items-center gap-2">
               <LanguageSwitcher />
               <ThemeToggle />
             </div>
           </header>
         )}
         <main className="text-primary-text flex-1 overflow-y-auto">
           {children}
         </main>
       </div>
     );
   }
   ```

### Files NOT to Modify

- **`Navigation.tsx`** - No changes needed. Keep it focused on authenticated users.
- **`LobbyActions.tsx`** - Middleware handles locale detection for internal navigation.

## 5. Verification Plan

1. **Accept-Language Detection:**
   - Set browser to Spanish, open share link in incognito
   - Verify redirect to `/es/...?token=...` with token preserved

2. **Guest Header:**
   - As guest, verify header shows Logo, LanguageSwitcher, ThemeToggle
   - Verify no Dashboard/Profile links visible

3. **Language Switching (Critical):**
   - As guest on `/es/...?token=...`, switch to Chinese
   - Verify URL becomes `/zh/...?token=...`
   - Verify interview still loads

4. **Session Navigation:**
   - Click "Start Interview" as guest
   - Verify session loads (middleware handles locale redirect)

## 6. Technical Notes

### Why This Works

The `next-intl` middleware preserves query params during redirects:
```typescript
response = redirect(
  formatPathname(pathname, localePrefix, request.nextUrl.search)
);
```

Internal navigation without locale prefix works because middleware:
1. Intercepts the locale-less URL
2. Reads locale cookie (set when guest switched language) or Accept-Language
3. Redirects with token preserved

### Why We Don't Modify Navigation.tsx

Adding an `isGuest` prop would scatter conditionals throughout Navigation. A 5-line inline header is simpler and maintains clear separation:
- `Navigation` = authenticated users only
- Inline header = guests only

## 7. References

- [next-intl Issue #550 - Persisting searchParams](https://github.com/amannn/next-intl/issues/550)
- [next-intl middleware documentation](https://next-intl.dev/docs/routing/middleware)
