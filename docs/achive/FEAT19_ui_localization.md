# FEAT19: UI Localization (Multi-Language Interface)

## Objective

Implement full UI localization for the Preppal application using `next-intl`. This allows users to view the interface in their preferred language (English, Spanish, or Mandarin Chinese) with locale-based URL routing.

## Summary of Decisions

| Decision | Choice |
|----------|--------|
| UI Languages | English (`en`), Spanish (`es`), Mandarin Chinese (`zh`) |
| URL Routing | Locale-based (`/es/dashboard`, `/zh/dashboard`) |
| User Preferences | Saved to User model in database |
| Library | `next-intl` for App Router |

---

## Status Checklist

### Infrastructure (Complete)
- [x] **1.1** Install and configure `next-intl`
- [x] **1.2** Create i18n configuration files
- [x] **1.3** Create middleware for locale-based routing
- [x] **1.4** Update Next.js config for locales
- [x] **1.5** Create translation files (`en.json`, `es.json`, `zh.json`)
- [x] **1.6** Add `uiLanguage` field to User model
- [x] **1.7** Restructure app directory for `[locale]` routing
- [x] **1.8** Create language switcher component
- [x] **1.10** Update user router to handle language preference

### Bug Fixes (Complete)
- [x] **1.12** Fix LanguageSwitcher to use locale-aware router (uses `useRouter` from `~/i18n/navigation`)
- [x] **1.13** Fix `(app)/layout.tsx` redirect to use locale-prefixed path
- [x] **1.14** Fix all pages to use locale-aware `Link` from `~/i18n/navigation` instead of `next/link`

### Core Feature - Translation Integration (Complete)
- [x] **1.9** Replace hardcoded strings with translations in UI components
  - [x] `Navigation.tsx` - nav links, sign out
  - [x] `dashboard/page.tsx` - all dashboard text
  - [x] `create-interview/page.tsx` - form labels and buttons
  - [x] `profile/page.tsx` - profile labels
  - [x] `signin/page.tsx` and `SignInForm.tsx` - auth text
  - [x] `page.tsx` (landing) - hero text, CTAs
  - [x] `lobby/page.tsx` - lobby instructions, checklist, interview details
  - [x] `session/SessionContent.tsx` - session controls, transcript labels
  - [x] `feedback/page.tsx` and feedback components - feedback labels, tabs, actions, polling

### Verification
- [x] **1.11** TypeScript compilation passes

---

## Dependencies

This feature has **no dependencies** on other features and can be implemented independently.

**Dependent features:**
- FEAT20 (Interview Language) - will use the user's UI language as the default interview language

---

## Detailed Implementation Steps

### 1.1 Install `next-intl`

**Terminal Command:**
```bash
pnpm add next-intl
```

**Verify installation:**
```bash
pnpm list next-intl
```

---

### 1.2 Create i18n Configuration Files

**Create folder:** `src/i18n/`

**Create file:** `src/i18n/routing.ts`
```typescript
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
```

**Create file:** `src/i18n/request.ts`
```typescript
/**
 * next-intl request configuration for App Router
 * Provides locale and messages to server components
 */
import { getRequestConfig } from "next-intl/server";
import { routing, type Locale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate locale, fallback to default
  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

**Create file:** `src/i18n/navigation.ts`
```typescript
/**
 * Navigation utilities with locale support
 * Use these instead of next/link and next/navigation
 */
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

---

### 1.3 Create Middleware for Locale-Based Routing

**Create file:** `src/middleware.ts`

> **Note:** If this file already exists with NextAuth logic, you'll need to merge them.

**Option A - New middleware (no existing middleware):**
```typescript
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
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

**Option B - Merge with existing NextAuth middleware:**
```typescript
/**
 * Combined middleware for locale routing and authentication
 */
import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// Public routes that don't require authentication
const publicRoutes = ["/", "/signin", "/privacy", "/terms"];

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle locale routing first
  const response = intlMiddleware(request);

  // Extract locale from pathname for route checking
  const pathnameWithoutLocale = pathname.replace(/^\/(en|es|zh)/, "") || "/";

  // Check if route requires authentication
  const isPublicRoute = publicRoutes.some(
    (route) => pathnameWithoutLocale === route || pathnameWithoutLocale.startsWith(route + "/")
  );

  // Add your existing auth logic here if needed
  // ...

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

---

### 1.4 Update Next.js Config

**Modify file:** `next.config.ts` (or `next.config.js`)

```typescript
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your existing config options
};

export default withNextIntl(nextConfig);
```

---

### 1.5 Create Translation Files

**Create folder:** `messages/` (in project root)

**Create file:** `messages/en.json`
```json
{
  "common": {
    "appName": "Preppal",
    "loading": "Loading...",
    "error": "An error occurred",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirm": "Confirm",
    "back": "Back"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "createInterview": "Create Interview",
    "profile": "Profile",
    "signOut": "Sign Out",
    "signIn": "Sign In"
  },
  "landing": {
    "title": "Practice Interviews with AI",
    "subtitle": "Get real-time feedback and improve your interview skills",
    "cta": "Get Started"
  },
  "dashboard": {
    "title": "Your Interviews",
    "noInterviews": "No interviews yet. Create your first one!",
    "createNew": "Create New Interview",
    "status": {
      "pending": "Pending",
      "inProgress": "In Progress",
      "completed": "Completed",
      "error": "Error"
    },
    "actions": {
      "view": "View",
      "delete": "Delete",
      "retry": "Retry"
    }
  },
  "createInterview": {
    "title": "Create New Interview",
    "jobDescription": "Job Description",
    "jobDescriptionPlaceholder": "Paste the job description here...",
    "jobDescriptionHelp": "Paste the full job posting to help the AI ask relevant questions",
    "resume": "Your Resume",
    "resumePlaceholder": "Paste your resume here...",
    "resumeHelp": "Your resume helps personalize the interview experience",
    "persona": "Interviewer Persona",
    "personaPlaceholder": "e.g., Senior Technical Recruiter",
    "personaHelp": "Customize how the AI interviewer behaves",
    "submit": "Start Interview",
    "submitting": "Creating..."
  },
  "interview": {
    "lobby": {
      "title": "Interview Lobby",
      "preparing": "Preparing your interview...",
      "ready": "Ready to begin?",
      "instructions": "Make sure your microphone is working and you're in a quiet environment.",
      "start": "Start Interview",
      "cancel": "Cancel"
    },
    "session": {
      "listening": "Listening...",
      "speaking": "AI is speaking...",
      "thinking": "Processing...",
      "endInterview": "End Interview",
      "mute": "Mute",
      "unmute": "Unmute"
    },
    "feedback": {
      "title": "Interview Feedback",
      "generating": "Generating your feedback...",
      "summary": "Summary",
      "strengths": "Strengths",
      "contentAndStructure": "Content & Structure",
      "communicationAndDelivery": "Communication & Delivery",
      "presentation": "Presentation",
      "improvements": "Areas for Improvement",
      "tryAgain": "Try Another Interview",
      "backToDashboard": "Back to Dashboard"
    }
  },
  "profile": {
    "title": "Your Profile",
    "name": "Name",
    "email": "Email",
    "uiLanguage": "Interface Language",
    "uiLanguageHelp": "Choose your preferred language for the interface",
    "saveChanges": "Save Changes",
    "saving": "Saving..."
  },
  "auth": {
    "signInTitle": "Sign In to Preppal",
    "signInSubtitle": "Practice interviews with AI feedback",
    "signInWithGoogle": "Continue with Google",
    "signInWithGithub": "Continue with GitHub",
    "signOut": "Sign Out",
    "signingOut": "Signing out..."
  },
  "errors": {
    "generic": "Something went wrong. Please try again.",
    "notFound": "Page not found",
    "unauthorized": "Please sign in to continue",
    "networkError": "Network error. Check your connection."
  }
}
```

**Create file:** `messages/es.json`
```json
{
  "common": {
    "appName": "Preppal",
    "loading": "Cargando...",
    "error": "Ocurrio un error",
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "confirm": "Confirmar",
    "back": "Volver"
  },
  "navigation": {
    "dashboard": "Panel",
    "createInterview": "Crear Entrevista",
    "profile": "Perfil",
    "signOut": "Cerrar Sesion",
    "signIn": "Iniciar Sesion"
  },
  "landing": {
    "title": "Practica Entrevistas con IA",
    "subtitle": "Obtén retroalimentacion en tiempo real y mejora tus habilidades",
    "cta": "Comenzar"
  },
  "dashboard": {
    "title": "Tus Entrevistas",
    "noInterviews": "Aun no tienes entrevistas. Crea tu primera!",
    "createNew": "Crear Nueva Entrevista",
    "status": {
      "pending": "Pendiente",
      "inProgress": "En Progreso",
      "completed": "Completada",
      "error": "Error"
    },
    "actions": {
      "view": "Ver",
      "delete": "Eliminar",
      "retry": "Reintentar"
    }
  },
  "createInterview": {
    "title": "Crear Nueva Entrevista",
    "jobDescription": "Descripcion del Puesto",
    "jobDescriptionPlaceholder": "Pega la descripcion del puesto aqui...",
    "jobDescriptionHelp": "Pega la oferta de trabajo completa para ayudar a la IA",
    "resume": "Tu Curriculum",
    "resumePlaceholder": "Pega tu curriculum aqui...",
    "resumeHelp": "Tu curriculum ayuda a personalizar la experiencia",
    "persona": "Personalidad del Entrevistador",
    "personaPlaceholder": "ej., Reclutador Tecnico Senior",
    "personaHelp": "Personaliza como se comporta el entrevistador IA",
    "submit": "Iniciar Entrevista",
    "submitting": "Creando..."
  },
  "interview": {
    "lobby": {
      "title": "Sala de Espera",
      "preparing": "Preparando tu entrevista...",
      "ready": "Listo para comenzar?",
      "instructions": "Asegurate de que tu microfono funcione y estes en un lugar tranquilo.",
      "start": "Comenzar Entrevista",
      "cancel": "Cancelar"
    },
    "session": {
      "listening": "Escuchando...",
      "speaking": "La IA esta hablando...",
      "thinking": "Procesando...",
      "endInterview": "Terminar Entrevista",
      "mute": "Silenciar",
      "unmute": "Activar"
    },
    "feedback": {
      "title": "Retroalimentacion",
      "generating": "Generando tu retroalimentacion...",
      "summary": "Resumen",
      "strengths": "Fortalezas",
      "contentAndStructure": "Contenido y Estructura",
      "communicationAndDelivery": "Comunicacion y Entrega",
      "presentation": "Presentacion",
      "improvements": "Areas de Mejora",
      "tryAgain": "Intentar Otra Entrevista",
      "backToDashboard": "Volver al Panel"
    }
  },
  "profile": {
    "title": "Tu Perfil",
    "name": "Nombre",
    "email": "Correo Electronico",
    "uiLanguage": "Idioma de la Interfaz",
    "uiLanguageHelp": "Elige tu idioma preferido para la interfaz",
    "saveChanges": "Guardar Cambios",
    "saving": "Guardando..."
  },
  "auth": {
    "signInTitle": "Iniciar Sesion en Preppal",
    "signInSubtitle": "Practica entrevistas con retroalimentacion de IA",
    "signInWithGoogle": "Continuar con Google",
    "signInWithGithub": "Continuar con GitHub",
    "signOut": "Cerrar Sesion",
    "signingOut": "Cerrando sesion..."
  },
  "errors": {
    "generic": "Algo salio mal. Por favor intenta de nuevo.",
    "notFound": "Pagina no encontrada",
    "unauthorized": "Por favor inicia sesion para continuar",
    "networkError": "Error de red. Verifica tu conexion."
  }
}
```

**Create file:** `messages/zh.json`
```json
{
  "common": {
    "appName": "Preppal",
    "loading": "加载中...",
    "error": "发生错误",
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "confirm": "确认",
    "back": "返回"
  },
  "navigation": {
    "dashboard": "控制台",
    "createInterview": "创建面试",
    "profile": "个人资料",
    "signOut": "退出登录",
    "signIn": "登录"
  },
  "landing": {
    "title": "AI模拟面试练习",
    "subtitle": "获得实时反馈，提升面试技能",
    "cta": "立即开始"
  },
  "dashboard": {
    "title": "您的面试",
    "noInterviews": "暂无面试记录。创建您的第一个面试吧！",
    "createNew": "创建新面试",
    "status": {
      "pending": "待处理",
      "inProgress": "进行中",
      "completed": "已完成",
      "error": "错误"
    },
    "actions": {
      "view": "查看",
      "delete": "删除",
      "retry": "重试"
    }
  },
  "createInterview": {
    "title": "创建新面试",
    "jobDescription": "职位描述",
    "jobDescriptionPlaceholder": "在此粘贴职位描述...",
    "jobDescriptionHelp": "粘贴完整的招聘信息，帮助AI提出相关问题",
    "resume": "您的简历",
    "resumePlaceholder": "在此粘贴您的简历...",
    "resumeHelp": "您的简历有助于个性化面试体验",
    "persona": "面试官风格",
    "personaPlaceholder": "例如：高级技术招聘官",
    "personaHelp": "自定义AI面试官的行为方式",
    "submit": "开始面试",
    "submitting": "创建中..."
  },
  "interview": {
    "lobby": {
      "title": "面试大厅",
      "preparing": "正在准备您的面试...",
      "ready": "准备好开始了吗？",
      "instructions": "请确保麦克风正常工作，并处于安静的环境中。",
      "start": "开始面试",
      "cancel": "取消"
    },
    "session": {
      "listening": "正在聆听...",
      "speaking": "AI正在回答...",
      "thinking": "处理中...",
      "endInterview": "结束面试",
      "mute": "静音",
      "unmute": "取消静音"
    },
    "feedback": {
      "title": "面试反馈",
      "generating": "正在生成您的反馈...",
      "summary": "总结",
      "strengths": "优势",
      "contentAndStructure": "内容与结构",
      "communicationAndDelivery": "沟通与表达",
      "presentation": "展示能力",
      "improvements": "改进领域",
      "tryAgain": "再次尝试",
      "backToDashboard": "返回控制台"
    }
  },
  "profile": {
    "title": "您的资料",
    "name": "姓名",
    "email": "电子邮箱",
    "uiLanguage": "界面语言",
    "uiLanguageHelp": "选择您偏好的界面语言",
    "saveChanges": "保存更改",
    "saving": "保存中..."
  },
  "auth": {
    "signInTitle": "登录 Preppal",
    "signInSubtitle": "通过AI反馈练习面试",
    "signInWithGoogle": "使用 Google 账号继续",
    "signInWithGithub": "使用 GitHub 账号继续",
    "signOut": "退出登录",
    "signingOut": "正在退出..."
  },
  "errors": {
    "generic": "出了点问题，请重试。",
    "notFound": "页面未找到",
    "unauthorized": "请登录后继续",
    "networkError": "网络错误，请检查连接。"
  }
}
```

---

### 1.6 Add `uiLanguage` Field to User Model

**Modify file:** `prisma/schema.prisma`

Add field to the `User` model:
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?

  // ADD THIS FIELD
  uiLanguage    String    @default("en")  // UI language preference: en, es, zh

  accounts      Account[]
  sessions      Session[]
  // ... other relations
}
```

**Run migration:**
```bash
pnpm db:push
```

---

### 1.7 Restructure App Directory for Locale Routing

**Current structure:**
```
src/app/
├── (app)/
│   ├── dashboard/page.tsx
│   ├── create-interview/page.tsx
│   ├── profile/page.tsx
│   └── layout.tsx
├── signin/page.tsx
├── layout.tsx
└── page.tsx
```

**New structure with `[locale]`:**
```
src/app/
├── [locale]/
│   ├── (app)/
│   │   ├── dashboard/page.tsx
│   │   ├── create-interview/page.tsx
│   │   ├── profile/page.tsx
│   │   └── layout.tsx
│   ├── signin/page.tsx
│   ├── layout.tsx          # Locale layout with NextIntlClientProvider
│   └── page.tsx             # Landing page
├── api/                     # API routes stay outside [locale]
│   ├── auth/
│   ├── trpc/
│   └── worker/
├── layout.tsx               # Root layout (html, body tags only)
└── globals.css
```

**Move files:**
1. Move `src/app/(app)/` to `src/app/[locale]/(app)/`
2. Move `src/app/signin/` to `src/app/[locale]/signin/`
3. Move `src/app/page.tsx` to `src/app/[locale]/page.tsx`
4. Keep `src/app/api/` in place (API routes don't need localization)

**Create file:** `src/app/[locale]/layout.tsx`
```typescript
/**
 * Locale-aware layout that provides translations to all child pages
 * Wraps children with NextIntlClientProvider for client-side translations
 */
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```

**Update file:** `src/app/layout.tsx` (root layout - minimal)
```typescript
/**
 * Root layout - contains only html and body tags
 * Locale-specific content is in [locale]/layout.tsx
 */
import "./globals.css";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Preppal",
  description: "Practice interviews with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```

---

### 1.8 Create Language Switcher Component

**Create file:** `src/app/_components/LanguageSwitcher.tsx`
```typescript
/**
 * Language switcher dropdown for UI language selection
 * Updates URL locale and optionally saves preference to user profile
 */
"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTransition } from "react";

const UI_LANGUAGES = [
  { code: "en", label: "English", flag: "EN" },
  { code: "es", label: "Espanol", flag: "ES" },
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
      className="appearance-none bg-transparent border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
```

**Add to Navigation:** `src/app/_components/Navigation.tsx`

```typescript
// Add import at top
import { LanguageSwitcher } from "./LanguageSwitcher";

// Add in the nav bar JSX (e.g., next to ThemeToggle)
<LanguageSwitcher />
```

---

### 1.12 Fix LanguageSwitcher to Use Locale-Aware Router

**Problem:** Current implementation uses `window.location.href` which causes a full page reload.

**Current (broken):** `src/app/_components/LanguageSwitcher.tsx`
```typescript
import { usePathname } from "next/navigation";  // WRONG

const handleChange = (newLocale: string) => {
  // ...
  window.location.href = newPath;  // Full page reload
};
```

**Fix:** Use locale-aware navigation from `~/i18n/navigation`
```typescript
import { usePathname, useRouter } from "~/i18n/navigation";
import { useTransition } from "react";

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
  // ...
}
```

---

### 1.13 Fix (app)/layout.tsx Redirect to Use Locale-Aware Redirect

**Problem:** When an unauthenticated user accesses a protected route, they are redirected to `/signin` without the locale prefix, breaking the locale context.

**Current (broken):** `src/app/[locale]/(app)/layout.tsx`
```typescript
import { redirect } from "next/navigation";  // WRONG - not locale-aware

if (!session) {
  redirect("/signin");  // Goes to /signin, not /en/signin
}
```

**Fix:** Use locale-aware redirect from `~/i18n/navigation`
```typescript
import { redirect } from "~/i18n/navigation";

if (!session) {
  redirect("/signin");  // Now correctly goes to /en/signin, /es/signin, etc.
}
```

---

### 1.14 Fix All Pages to Use Locale-Aware Link

**Problem:** Pages using `next/link` directly will lose the locale prefix when navigating.

**Files to update:**
- `src/app/[locale]/(app)/dashboard/page.tsx`
- `src/app/[locale]/page.tsx` (landing)
- Any other page using `import Link from "next/link"`

**Current (broken):**
```typescript
import Link from "next/link";  // WRONG

<Link href="/create-interview">Create Interview</Link>
// Goes to /create-interview instead of /en/create-interview
```

**Fix:**
```typescript
import { Link } from "~/i18n/navigation";

<Link href="/create-interview">Create Interview</Link>
// Now correctly goes to /en/create-interview, /es/create-interview, etc.
```

---

### 1.9 Replace Hardcoded Strings with Translations

> **IMPORTANT:** This is a core requirement, not optional. Without this step, users will not see the UI in their selected language.

**For Client Components** (most pages in this app):
```typescript
"use client";

import { useTranslations } from "next-intl";

export function MyClientComponent() {
  const t = useTranslations("common");
  const tNav = useTranslations("navigation");

  return (
    <div>
      <button>{t("save")}</button>
      <span>{tNav("dashboard")}</span>
    </div>
  );
}
```

**For Server Components** (async components):
```typescript
import { getTranslations } from "next-intl/server";

export default async function MyServerComponent() {
  const t = await getTranslations("dashboard");

  return <h1>{t("title")}</h1>;
}
```

---

#### Files to Update (Priority Order)

**1. Navigation.tsx** - `src/app/_components/Navigation.tsx`
```typescript
// Add at top
import { useTranslations } from "next-intl";

// In component
const t = useTranslations("navigation");

// Replace hardcoded labels
const navLinks = [
  { href: "/dashboard", label: t("dashboard") },
  { href: "/create-interview", label: t("createInterview") },
  { href: "/profile", label: t("profile") },
];

// Replace "Sign Out" with {t("signOut")}
```

**2. Landing page** - `src/app/[locale]/page.tsx`
```typescript
// Server component - use getTranslations
import { getTranslations } from "next-intl/server";

const t = await getTranslations("landing");
const tNav = await getTranslations("navigation");
const tAuth = await getTranslations("auth");

// Replace:
// "PrepPal" -> {t("common.appName")} or keep as brand name
// "Your AI-powered interview preparation..." -> {t("subtitle")}
// "Go to Dashboard" -> {tNav("dashboard")}
// "Start Interview" -> {tNav("createInterview")}
// "Sign in" -> {tNav("signIn")}
// "Sign out" -> {tAuth("signOut")}
```

**3. Dashboard page** - `src/app/[locale]/(app)/dashboard/page.tsx`
```typescript
"use client";
import { useTranslations } from "next-intl";

const t = useTranslations("dashboard");
const tCommon = useTranslations("common");

// Replace:
// "Dashboard" -> {t("title")}
// "Welcome to your interview preparation hub" -> custom key needed
// "Quick Start" -> custom key needed
// "Start a new interview session" -> custom key needed
// "Create Interview" -> {t("createNew")}
// "Recent Sessions" -> custom key needed
// "Loading sessions..." -> {tCommon("loading")}
// "View Feedback" / "Enter Lobby" -> {t("actions.view")}
// "Delete" -> {tCommon("delete")}
// Confirmation dialog text
```

**4. Create Interview page** - `src/app/[locale]/(app)/create-interview/page.tsx`
```typescript
const t = useTranslations("createInterview");

// Replace all form labels, placeholders, help text, and buttons
```

**5. Profile page** - `src/app/[locale]/(app)/profile/page.tsx`
```typescript
const t = useTranslations("profile");
```

**6. Sign In page** - `src/app/[locale]/signin/page.tsx` and `SignInForm.tsx`
```typescript
const t = useTranslations("auth");
```

**7. Lobby page** - `src/app/[locale]/(app)/interview/[interviewId]/lobby/page.tsx`
```typescript
const t = useTranslations("interview.lobby");
```

**8. Session page** - `src/app/[locale]/(app)/interview/[interviewId]/session/SessionContent.tsx`
```typescript
const t = useTranslations("interview.session");
```

**9. Feedback page** - `src/app/[locale]/(app)/interview/[interviewId]/feedback/page.tsx` and components
```typescript
const t = useTranslations("interview.feedback");
```

---

#### Additional Translation Keys Needed

Some strings in the current UI don't have corresponding translation keys. Add these to all three message files:

```json
{
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome to your interview preparation hub",
    "quickStart": "Quick Start",
    "quickStartDescription": "Start a new interview session",
    "recentSessions": "Recent Sessions",
    "recentSessionsEmpty": "Your recent interview sessions will appear here",
    "performance": "Performance",
    "performanceDescription": "View your interview performance analytics",
    "viewFeedback": "View Feedback",
    "enterLobby": "Enter Lobby",
    "confirmDelete": "Are you sure you want to delete this session?",
    "loadError": "Failed to load sessions. Please try again."
  }
}
```

---

### 1.10 Update User Router to Handle Language Preference

**Modify file:** `src/server/api/routers/user.ts`

```typescript
export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        name: true,
        email: true,
        uiLanguage: true,  // ADD THIS
      },
    });

    return {
      name: user?.name ?? null,
      email: user?.email ?? null,
      uiLanguage: user?.uiLanguage ?? "en",  // ADD THIS
    };
  }),

  // ADD THIS PROCEDURE
  updateLanguage: protectedProcedure
    .input(z.object({ uiLanguage: z.enum(["en", "es", "zh"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { uiLanguage: input.uiLanguage },
      });
      return { success: true };
    }),
});
```

---

### 1.11 Update Navigation Links

**Modify file:** `src/app/_components/Navigation.tsx`

Replace `next/link` with locale-aware `Link`:
```typescript
// Change this import
import Link from "next/link";

// To this
import { Link } from "@/i18n/navigation";
```

The `Link` component from `@/i18n/navigation` automatically handles locale prefixes.

---

## Testing Checklist

### Manual Tests
- [ ] Visit `/` - should redirect to `/en`
- [ ] Visit `/en/dashboard` - should show English UI
- [ ] Visit `/es/dashboard` - should show Spanish UI
- [ ] Visit `/zh/dashboard` - should show Chinese UI
- [ ] Language switcher changes URL and UI language instantly
- [ ] Navigation links preserve current locale
- [ ] Invalid locale (e.g., `/fr/dashboard`) shows 404
- [ ] API routes (`/api/trpc`, `/api/auth`) still work (no locale prefix)
- [ ] User language preference saves to database
- [ ] Refresh page - language persists via URL

### Automated Tests (optional)
```typescript
// Example test for locale routing
describe("Locale routing", () => {
  it("redirects / to /en", async () => {
    const response = await fetch("/");
    expect(response.url).toContain("/en");
  });

  it("loads Spanish translations at /es", async () => {
    const response = await fetch("/es/dashboard");
    expect(await response.text()).toContain("Tus Entrevistas");
  });
});
```

---

## Files Summary

### Infrastructure (Complete)
| File | Action | Status | Description |
|------|--------|--------|-------------|
| `package.json` | Modify | ✅ | Add `next-intl` dependency |
| `next.config.js` | Modify | ✅ | Add `next-intl` plugin wrapper |
| `src/middleware.ts` | Create | ✅ | Locale routing middleware |
| `src/i18n/routing.ts` | Create | ✅ | Routing configuration |
| `src/i18n/request.ts` | Create | ✅ | Server request config |
| `src/i18n/navigation.ts` | Create | ✅ | Navigation utilities |
| `messages/en.json` | Create | ✅ | English translations |
| `messages/es.json` | Create | ✅ | Spanish translations |
| `messages/zh.json` | Create | ✅ | Chinese translations |
| `prisma/schema.prisma` | Modify | ✅ | Add `uiLanguage` to User |
| `src/app/[locale]/layout.tsx` | Create | ✅ | Locale layout wrapper |
| `src/app/layout.tsx` | Modify | ✅ | Simplify to root layout |
| `src/server/api/routers/user.ts` | Modify | ✅ | Add uiLanguage to profile |

### Bug Fixes (Complete)
| File | Action | Status | Description |
|------|--------|--------|-------------|
| `src/app/_components/LanguageSwitcher.tsx` | Fix | ✅ | Uses `useRouter` from `~/i18n/navigation` for SPA navigation |
| `src/app/[locale]/(app)/layout.tsx` | Fix | ✅ | Uses `redirect` with locale-prefixed path |
| `src/app/[locale]/(app)/dashboard/page.tsx` | Fix | ✅ | Uses `Link` from `~/i18n/navigation` |
| `src/app/[locale]/page.tsx` | Fix | ✅ | Uses `Link` from `~/i18n/navigation` |

### Core Feature - Replace Hardcoded Strings (Complete)
| File | Action | Status | Description |
|------|--------|--------|-------------|
| `src/app/_components/Navigation.tsx` | Modify | ✅ | Translations for nav links, sign out |
| `src/app/[locale]/page.tsx` | Modify | ✅ | Translations for landing page |
| `src/app/[locale]/(app)/dashboard/page.tsx` | Modify | ✅ | Translations for dashboard |
| `src/app/[locale]/(app)/create-interview/page.tsx` | Modify | ✅ | Translations for form |
| `src/app/[locale]/(app)/profile/page.tsx` | Modify | ✅ | Translations for profile |
| `src/app/[locale]/signin/page.tsx` | Modify | ✅ | Translations for sign in |
| `src/app/[locale]/signin/_components/SignInForm.tsx` | Modify | ✅ | Translations for auth buttons |
| `src/app/[locale]/(app)/interview/[interviewId]/lobby/page.tsx` | Modify | ✅ | Translations for lobby, checklist, details |
| `src/app/[locale]/(app)/interview/[interviewId]/session/SessionContent.tsx` | Modify | ✅ | Translations for session, transcript labels |
| `src/app/[locale]/(app)/interview/[interviewId]/feedback/page.tsx` | Modify | ✅ | Translations for feedback |
| `src/app/[locale]/(app)/interview/[interviewId]/feedback/feedback-tabs.tsx` | Modify | ✅ | Translations for tabs |
| `src/app/[locale]/(app)/interview/[interviewId]/feedback/_components/FeedbackActions.tsx` | Modify | ✅ | Translations for actions |
| `src/app/[locale]/(app)/interview/[interviewId]/feedback/_components/FeedbackPolling.tsx` | Modify | ✅ | Translations for polling state |
| `messages/*.json` | Modify | ✅ | Added all required translation keys |

---

## Estimated Effort

| Task | Complexity |
|------|------------|
| Install & configure next-intl | Low |
| Create translation files | Medium (manual translation work) |
| Restructure app directory | Medium (careful file moves) |
| Create LanguageSwitcher | Low |
| Refactor all UI strings | High (many files to update) |
| Testing | Medium |

---

## Reference

- **next-intl Documentation:** https://next-intl-docs.vercel.app/
- **App Router Setup Guide:** https://next-intl-docs.vercel.app/docs/getting-started/app-router
- **Navigation API:** https://next-intl-docs.vercel.app/docs/routing/navigation
