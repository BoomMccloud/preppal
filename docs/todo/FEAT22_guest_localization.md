# Feature Specification: Guest Localization & Shared Links

## 1. Overview
This feature aims to improve the internationalization (i18n) experience for guest users accessing Preppal via shared interview links. It ensures that guests land on the correct localized version of the application and have the ability to switch languages without losing access to their session.

## 2. Problem Statement
Currently, the guest experience has three main internationalization friction points:
1.  **Shared Links Default to English:** Links generated in `LobbyActions.tsx` are absolute URLs without a locale prefix (e.g., `domain.com/interview/...`). The middleware defaults these to English, ignoring the language the sender was using.
2.  **No Language Switcher for Guests:** The `Navigation` component (which contains the `LanguageSwitcher`) is completely hidden for unauthenticated users in `InterviewLayout`. Guests are "stuck" in the default language.
3.  **Language Switching Breaks Access:** Even if a guest could access the switcher, the current `LanguageSwitcher` implementation performs a route transition that drops query parameters. Since guests rely on the `?token=...` parameter for access, switching languages would effectively lock them out of the interview.

## 3. Solution Design

### 3.1 Localized Share Links
**Goal:** When a user shares a link, it should respect their current active locale.

**Changes:**
- Update `LobbyActions.tsx` to retrieve the current locale using `useLocale()`.
- Construct the shared URL by injecting the locale into the path: `${origin}/${locale}/interview/${interviewId}/lobby?token=${token}`.

### 3.2 Token-Preserving Language Switcher
**Goal:** Switching languages should persist the `token` (and other query parameters) to maintain the user's session context.

**Changes:**
- Update `LanguageSwitcher.tsx` to read the current `searchParams` using `useSearchParams`.
- When constructing the new route, merge the existing search parameters with the new locale change.
- Ensure the `router.replace` or `router.push` call includes these parameters.

### 3.3 Guest Navigation Header
**Goal:** Provide guests with basic UI controls (Language, Theme) without exposing authenticated-only features.

**Changes:**
- Refactor `InterviewLayout` (`src/app/[locale]/(interview)/layout.tsx`).
- Instead of hiding `Navigation` entirely for null sessions, render a "Guest Mode" version of the navigation bar.
- **Guest Mode Navigation:**
    - Shows the "PrepPal" Logo.
    - Hides: Dashboard, Create Interview, Profile, Sign Out links.
    - Shows: `LanguageSwitcher`, `ThemeToggle`.

## 4. Implementation Details

### Files to Modify
1.  `src/app/[locale]/(interview)/interview/[interviewId]/lobby/_components/LobbyActions.tsx`
    - Import `useLocale` from `next-intl`.
    - Update `getGuestUrl` logic.

2.  `src/app/_components/LanguageSwitcher.tsx`
    - Import `useSearchParams` from `next/navigation`.
    - Update `handleChange` to reconstruct the query string.

3.  `src/app/_components/Navigation.tsx`
    - Add a `isGuest` prop.
    - Conditionally render links based on this prop.

4.  `src/app/[locale]/(interview)/layout.tsx`
    - Render `<Navigation isGuest={true} />` when `session` is null.

## 5. Verification Plan

### Manual Testing
1.  **Link Generation:**
    - Log in as a user, switch language to Spanish (`es`).
    - Go to an interview lobby.
    - Click "Copy Link".
    - Paste the link: Verify it contains `/es/`.

2.  **Guest Access:**
    - Open the copied link in an incognito window.
    - Verify the UI loads in Spanish.
    - Verify the "Guest Token" is present in the URL.
    - Verify the Navigation bar is visible but simplified (no Dashboard links).

3.  **Language Switching:**
    - In the guest view, use the dropdown to switch to Chinese (`zh`).
    - Verify the page reloads in Chinese.
    - **Critical:** Verify the `?token=...` parameter is still present in the URL.
    - Verify the interview content still loads (user is not kicked out).
