# Feature Specification: Email One-Time Code Login

## Implementation Status

> **Branch:** `feat/email-otp-utils`
> **Last Updated:** 2025-12-20

| Phase | Status | Notes |
|-------|--------|-------|
| **Phase 1: Setup** | ✅ Complete | Env vars, Prisma schema, resend package |
| **Phase 2: Backend** | ✅ Complete | Rate limiter, OTP utils, email service, auth router |
| **Phase 3: Frontend** | ⬜ Pending | OtpVerification.tsx, SignInForm.tsx updates |
| **Phase 4: Translations** | ⬜ Pending | en.json, es.json, zh.json |
| **Phase 5: Testing** | 🔶 Partial | Unit tests done, integration tests need tRPC calls |

### Completed Files

| File | Description |
|------|-------------|
| `src/server/lib/rate-limit.ts` | In-memory rate limiter (5 attempts/15 min) |
| `src/server/lib/otp.ts` | OTP generation, SHA-256 hashing, constant-time verification |
| `src/server/lib/email.ts` | Resend email service (logs to console in dev) |
| `src/server/api/routers/auth.ts` | `sendOtp` and `verifyOtp` tRPC procedures |
| `src/server/auth/config.ts` | Added `email-otp` credentials provider |
| `src/server/api/root.ts` | Registered auth router |
| `src/env.js` | Added `RESEND_API_KEY`, `EMAIL_FROM` |
| `prisma/schema.prisma` | Added `EmailVerification` model |
| `src/test/unit/otp-utils.test.ts` | Unit tests for rate limiting and OTP utils |
| `src/test/integration/otp.test.ts` | Integration tests for EmailVerification model |

### Remaining Work

1. Run `pnpm db:push` to sync database schema
2. Create `OtpVerification.tsx` component (skeleton in Section 12.3)
3. Update `SignInForm.tsx` with email input flow (skeleton in Section 12.3)
4. Add translation keys to all locale files (Section 12.8 Phase 4)
5. Update integration tests to call actual tRPC procedures

---

## 1. Overview

A passwordless authentication experience using email-based one-time codes (OTP). Users receive a secure, time-limited code via email to sign in without managing passwords.

This feature provides an alternative authentication method alongside existing OAuth providers (Google, GitHub).

## 2. Problem Statement

Current authentication requires Google or GitHub OAuth. This blocks users in regions where these services are inaccessible (e.g., China) or unreliable.

**The core insight:** Email works everywhere. It's the lowest common denominator for digital identity — accessible regardless of region, platform, or corporate policy.

**Why OTP over magic links?** Users expect a code-based flow — it's the familiar pattern from banking apps, 2FA, and other services. Magic links can feel unfamiliar and create friction (opens new tab, "did it work?" uncertainty).

## 3. Design Principles

1. **Minimal friction** — Email entry → code entry → done
2. **Secure by default** — Short-lived codes, rate limiting, no password storage
3. **Familiar UX** — Users understand "enter code from email" from other apps
4. **Non-breaking** — Adds to existing auth, doesn't replace OAuth options

## 4. Solution Design

### 4.1 Authentication Flow

```
┌─────────────────────────────────────────────────────┐
│  Sign In                                            │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ [Continue with Google]                        │  │
│  │ [Continue with GitHub]                        │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ────────────── or ──────────────                   │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ Email address                                 │  │
│  │ [you@example.com                           ]  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [Send Code]                                        │
└─────────────────────────────────────────────────────┘
```

### 4.2 Code Entry Screen

```
┌─────────────────────────────────────────────────────┐
│  Check your email                                   │
│                                                     │
│  We sent a code to you@example.com                  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │         [1] [2] [3] [4] [5] [6]               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Code expires in 9:45                               │
│                                                     │
│  Didn't receive it? [Resend code]                   │
│                                                     │
│  [← Use different email]                            │
└─────────────────────────────────────────────────────┘
```

### 4.3 Email Template

```
Subject: Your Preppal sign-in code

Hi there,

Your one-time sign-in code is:

    847291

This code expires in 10 minutes.

If you didn't request this code, you can safely ignore this email.

— The Preppal Team
```

## 5. User Flow

```
[User visits /sign-in]
        ↓
[Enters email address]
        ↓
[Server generates OTP, stores hash, sends email]
        ↓
[User receives email with 6-digit code]
        ↓
[User enters code on verification screen]
        ↓
[Server validates code]
        ↓
    ┌───┴───┐
    ↓       ↓
[Valid]  [Invalid]
    ↓       ↓
[Create/link account, start session]  [Show error, allow retry]
```

## 6. Security Model

### 6.1 Code Generation

| Property | Value | Rationale |
|----------|-------|-----------|
| Format | 6-digit numeric | Easy to type, familiar UX |
| Entropy | ~20 bits | Sufficient with rate limiting (5 attempts = 0.0005% attack success) |
| TTL | 10 minutes | Balance usability vs security |
| Storage | Hashed (SHA-256) | Fast verification; bcrypt overkill for short-lived codes with rate limiting |

### 6.2 Rate Limiting

| Action | Limit | Window |
|--------|-------|--------|
| All OTP actions (per email) | 5 | 15 minutes |

Single unified limit: 5 attempts (send or verify) per email per 15 minutes. Simple to implement, easy to reason about. Add IP-based limiting later if abuse occurs.

**Storage:** In-memory (e.g., `Map` or simple cache). Rate limits reset on server restart, which is acceptable — if the server crashes, rate limiting is the least of our concerns.

### 6.3 Security Considerations

- **Code reuse:** Each code is single-use; invalidated after successful verification
- **Timing attacks:** Use constant-time comparison for code verification
- **Enumeration:** Same response for existing/non-existing emails

## 7. Data Model

### 7.1 Prisma Schema Addition

```prisma
model EmailVerification {
  id        String    @id @default(cuid())
  email     String
  codeHash  String
  expiresAt DateTime
  createdAt DateTime  @default(now())
  usedAt    DateTime?

  @@index([email])
}
```

### 7.2 Account Linking

When a user verifies their email:
1. If an account exists with that email **and has emailVerified set** → sign in
2. If an account exists via OAuth only (email not verified independently) → set emailVerified, then sign in
3. If no account exists → create new account with emailVerified=true, sign in

**Security note:** Email verification proves ownership of the email address. For OAuth accounts, the email comes from the OAuth provider (trusted). Allowing email OTP login to an OAuth account is safe because:
- The user proves they control the email
- OAuth providers already verified this email belongs to the OAuth identity
- No elevation of privilege occurs

## 8. Implementation Details

### 8.1 UI Components

| Component | Purpose |
|-----------|---------|
| `EmailSignIn.tsx` | Email input form on sign-in page |
| `OtpVerification.tsx` | 6-digit code entry with auto-focus, expiry countdown, and resend button |

### 8.2 Backend Endpoints

| Endpoint | Purpose |
|----------|---------|
| `auth.sendOtp` | Generate code, hash, store, send email (invalidates any existing code for that email) |
| `auth.verifyOtp` | Validate code, create session |

### 8.3 Email Sending

Use [Resend](https://resend.com/) directly — already in use for other transactional emails.

```
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@preppal.com
```

### 8.4 NextAuth Integration

Add email provider to NextAuth configuration:

```typescript
// Conceptual - actual implementation may vary
providers: [
  GoogleProvider({ ... }),
  GitHubProvider({ ... }),
  EmailProvider({
    sendVerificationRequest: customOtpFlow,
  }),
]
```

## 9. Error Handling

| Scenario | User Message |
|----------|--------------|
| Invalid code | "That code didn't work. Please check and try again." |
| Expired code | "This code has expired. We'll send you a new one." |
| Rate limited | "Too many attempts. Please wait a few minutes and try again." |
| Email delivery failure | "We couldn't send the email. Please try again." |

## 10. Verification Plan

### 10.1 Manual Testing

1. **Happy path:** Enter email → receive code → enter code → signed in
2. **Wrong code:** Enter incorrect code → see error → retry works
3. **Expired code:** Wait 10+ min → code rejected → resend works
4. **Rate limiting:** Exceed 5 attempts quickly → rate limited message
5. **Account linking:** OAuth user → email login → same account
6. **New account:** New email → email login → account created

### 10.2 Automated Testing

- Unit tests for code generation/hashing
- Unit tests for rate limiting logic
- Integration tests for full auth flow (with mocked email)

## 11. Backward Compatibility

- No changes to existing OAuth flows
- No database migrations affecting existing users
- New table (`EmailVerification`) added alongside existing schema

---

## 12. Implementation Guide

> **General principle:** Avoid custom work. Expand existing files where it makes sense. Use new files only when components are independent.

### 12.1 Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| **Modify** | `prisma/schema.prisma` | Add `EmailVerification` model |
| **Modify** | `src/env.js` | Add `RESEND_API_KEY`, `EMAIL_FROM` env vars |
| **Modify** | `src/server/api/root.ts` | Register new `auth` router |
| **Modify** | `src/server/auth/config.ts` | Add Credentials provider for email OTP |
| **Modify** | `src/app/[locale]/signin/_components/SignInForm.tsx` | Add email input + "Send Code" button |
| **Create** | `src/server/api/routers/auth.ts` | New router with `sendOtp`, `verifyOtp` procedures |
| **Create** | `src/server/lib/email.ts` | Resend email sending utility |
| **Create** | `src/server/lib/rate-limit.ts` | Simple in-memory rate limiter |
| **Create** | `src/app/[locale]/signin/_components/OtpVerification.tsx` | 6-digit code entry component |
| **Create** | `src/test/integration/otp.test.ts` | Integration tests for OTP flow |

### 12.2 Reference Patterns

Before implementing, review these existing files:

| Pattern | File | What to Learn |
|---------|------|---------------|
| tRPC router structure | `src/server/api/routers/user.ts` | How to define procedures with Zod validation |
| NextAuth config | `src/server/auth/config.ts` | Current providers, callbacks, session handling |
| Sign-in UI | `src/app/[locale]/signin/_components/SignInForm.tsx` | How OAuth buttons are rendered, `signIn()` usage |
| Token generation | `src/server/lib/interview-access.ts` | Uses `crypto.randomBytes()` for secure tokens |
| Integration tests | `src/test/integration/auth.test.ts` | How to test auth with mocked sessions |

### 12.3 Skeleton Code

#### `src/server/lib/rate-limit.ts`

```typescript
/**
 * Simple in-memory rate limiter for OTP actions.
 * Limits are per-email, reset on server restart.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export function checkRateLimit(email: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const key = email.toLowerCase();
  const entry = store.get(key);

  // No entry or window expired → allow
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  // Within window, check count
  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  // Increment and allow
  entry.count++;
  return { allowed: true };
}

export function resetRateLimit(email: string): void {
  store.delete(email.toLowerCase());
}
```

#### `src/server/lib/email.ts`

```typescript
/**
 * Email sending utility using Resend.
 * Reference: https://resend.com/docs/send-with-nodejs
 */

import { Resend } from "resend";
import { env } from "~/env";

const resend = new Resend(env.RESEND_API_KEY);

interface SendOtpEmailParams {
  to: string;
  code: string;
}

export async function sendOtpEmail({ to, code }: SendOtpEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: "Your Preppal sign-in code",
      text: `Hi there,

Your one-time sign-in code is:

    ${code}

This code expires in 10 minutes.

If you didn't request this code, you can safely ignore this email.

— The Preppal Team`,
    });

    if (error) {
      console.error("Failed to send OTP email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Email sending error:", err);
    return { success: false, error: "Failed to send email" };
  }
}
```

#### `src/server/api/routers/auth.ts`

```typescript
/**
 * Authentication router for email OTP flow.
 * Handles code generation, verification, and session creation.
 */

import { z } from "zod";
import { createHash, randomInt, timingSafeEqual } from "crypto";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { checkRateLimit } from "~/server/lib/rate-limit";
import { sendOtpEmail } from "~/server/lib/email";
import { TRPCError } from "@trpc/server";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function verifyCodeConstantTime(inputHash: string, storedHash: string): boolean {
  const a = Buffer.from(inputHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const authRouter = createTRPCRouter({
  sendOtp: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { email } = input;

      // Rate limit check
      const rateLimit = checkRateLimit(email);
      if (!rateLimit.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts. Please wait a few minutes and try again.",
        });
      }

      // Invalidate any existing codes for this email
      await ctx.db.emailVerification.updateMany({
        where: { email, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Generate and store new code
      const code = generateOtp();
      const codeHash = hashCode(code);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS);

      await ctx.db.emailVerification.create({
        data: { email, codeHash, expiresAt },
      });

      // Send email
      const result = await sendOtpEmail({ to: email, code });
      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "We couldn't send the email. Please try again.",
        });
      }

      return { success: true, expiresAt };
    }),

  verifyOtp: publicProcedure
    .input(z.object({ email: z.string().email(), code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const { email, code } = input;

      // Rate limit check
      const rateLimit = checkRateLimit(email);
      if (!rateLimit.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts. Please wait a few minutes and try again.",
        });
      }

      // Find valid verification record
      const verification = await ctx.db.emailVerification.findFirst({
        where: {
          email,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!verification) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This code has expired. We'll send you a new one.",
        });
      }

      // Verify code with constant-time comparison
      const inputHash = hashCode(code);
      if (!verifyCodeConstantTime(inputHash, verification.codeHash)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That code didn't work. Please check and try again.",
        });
      }

      // Mark code as used
      await ctx.db.emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      });

      // Find or create user (account linking logic)
      let user = await ctx.db.user.findUnique({ where: { email } });

      if (user) {
        // Update emailVerified if not already set
        if (!user.emailVerified) {
          await ctx.db.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }
      } else {
        // Create new user
        user = await ctx.db.user.create({
          data: { email, emailVerified: new Date() },
        });
      }

      // Return user ID for client-side signIn()
      return { success: true, userId: user.id };
    }),
});
```

#### `src/server/auth/config.ts` (additions)

```typescript
// Add to existing providers array:
CredentialsProvider({
  id: "email-otp",
  name: "Email",
  credentials: {
    userId: { type: "text" },
  },
  async authorize(credentials) {
    if (!credentials?.userId) return null;

    const user = await db.user.findUnique({
      where: { id: credentials.userId as string },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  },
}),
```

#### `src/app/[locale]/signin/_components/OtpVerification.tsx`

```tsx
/**
 * 6-digit OTP code entry component.
 * Auto-focuses inputs, handles paste, shows countdown timer.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

interface OtpVerificationProps {
  email: string;
  expiresAt: Date;
  onBack: () => void;
}

export function OtpVerification({ email, expiresAt, onBack }: OtpVerificationProps) {
  const t = useTranslations("auth");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const verifyMutation = api.auth.verifyOtp.useMutation();
  const resendMutation = api.auth.sendOtp.useMutation();

  // Countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (newCode.every((d) => d) && newCode.join("").length === 6) {
      handleSubmit(newCode.join(""));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      handleSubmit(pasted);
    }
  };

  const handleSubmit = async (codeStr: string) => {
    try {
      const result = await verifyMutation.mutateAsync({ email, code: codeStr });
      if (result.success) {
        await signIn("email-otp", { userId: result.userId, callbackUrl: "/dashboard" });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Verification failed";
      setError(errorMessage);
    }
  };

  const handleResend = async () => {
    try {
      await resendMutation.mutateAsync({ email });
      setCode(["", "", "", "", "", ""]);
      setError(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to resend";
      setError(errorMessage);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-primary-text text-xl font-semibold">{t("checkYourEmail")}</h2>
        <p className="text-secondary-text mt-2">{t("codeSentTo", { email })}</p>
      </div>

      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            className="border-secondary-text/20 bg-secondary/50 text-primary-text focus:ring-accent h-12 w-10 rounded-md border text-center text-lg focus:ring-2 focus:outline-none"
            autoFocus={i === 0}
          />
        ))}
      </div>

      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      <p className="text-secondary-text text-center text-sm">
        {t("codeExpiresIn", { time: formatTime(timeLeft) })}
      </p>

      <div className="flex flex-col gap-2 text-center text-sm">
        <button
          onClick={handleResend}
          disabled={resendMutation.isPending}
          className="text-accent hover:underline disabled:opacity-50"
        >
          {resendMutation.isPending ? t("sending") : t("resendCode")}
        </button>
        <button onClick={onBack} className="text-secondary-text hover:underline">
          {t("useDifferentEmail")}
        </button>
      </div>
    </div>
  );
}
```

### 12.4 Session Creation

Use NextAuth's `signIn()` from `next-auth/react`:

```typescript
// After verifyOtp succeeds and returns userId:
await signIn("email-otp", {
  userId: result.userId,
  callbackUrl: "/dashboard",
});
```

This triggers the Credentials provider's `authorize()` function, which loads the user and creates the session using NextAuth's built-in session handling.

### 12.5 Environment Variables

Add to `src/env.js`:

```javascript
// In server schema:
RESEND_API_KEY: z.string(),
EMAIL_FROM: z.string().email(),

// In runtimeEnv:
RESEND_API_KEY: process.env.RESEND_API_KEY,
EMAIL_FROM: process.env.EMAIL_FROM,
```

Add to `.env`:

```
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@preppal.com
```

### 12.6 Dependencies

```bash
pnpm add resend
```

### 12.7 Database Migration

After updating `prisma/schema.prisma`:

```bash
pnpm db:push
```

### 12.8 Step-by-Step Implementation Sequence

> **For junior developers:** Follow these steps in exact order. Each step builds on the previous one.

#### Phase 1: Setup (Do First)

**Step 1: Install dependencies**

```bash
pnpm add resend
```

**Step 2: Add environment variables**

Add to `.env`:

```
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@preppal.com
```

**Step 3: Update `src/env.js`**

Add these two lines to the `server` object (around line 21, after `WORKER_SHARED_SECRET`):

```javascript
// In the server: { ... } section, add:
RESEND_API_KEY: z.string().optional(),
EMAIL_FROM: z.string().email().optional(),
```

Add these two lines to the `runtimeEnv` object (around line 46):

```javascript
// In the runtimeEnv: { ... } section, add:
RESEND_API_KEY: process.env.RESEND_API_KEY,
EMAIL_FROM: process.env.EMAIL_FROM,
```

**Step 4: Update Prisma schema**

Add to `prisma/schema.prisma`:

```prisma
model EmailVerification {
  id        String    @id @default(cuid())
  email     String
  codeHash  String
  expiresAt DateTime
  createdAt DateTime  @default(now())
  usedAt    DateTime?

  @@index([email])
}
```

**Step 5: Run database migration**

```bash
pnpm db:push
```

---

#### Phase 2: Backend (Do Second)

**Step 6: Create `src/server/lib/rate-limit.ts`**

Copy the skeleton code from Section 12.3 exactly.

**Step 7: Create `src/server/lib/email.ts`**

Copy the skeleton code from Section 12.3 exactly.

**Step 8: Create `src/server/api/routers/auth.ts`**

Copy the skeleton code from Section 12.3 exactly.

**Step 9: Register the auth router in `src/server/api/root.ts`**

```typescript
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { interviewRouter } from "~/server/api/routers/interview";
import { interviewWorkerRouter } from "~/server/api/routers/interview-worker";
import { userRouter } from "~/server/api/routers/user";
import { debugRouter } from "~/server/api/routers/debug";
import { authRouter } from "~/server/api/routers/auth"; // ADD THIS LINE

export const appRouter = createTRPCRouter({
  user: userRouter,
  interview: interviewRouter,
  interviewWorker: interviewWorkerRouter,
  debug: debugRouter,
  auth: authRouter, // ADD THIS LINE
});

// ... rest of file unchanged
```

**Step 10: Add email-otp provider to `src/server/auth/config.ts`**

Add a new CredentialsProvider AFTER the existing development CredentialsProvider (around line 142, before GoogleProvider):

```typescript
// Add this provider for email OTP login (works in all environments)
CredentialsProvider({
  id: "email-otp",
  name: "Email",
  credentials: {
    userId: { type: "text" },
  },
  async authorize(credentials) {
    if (!credentials?.userId) return null;

    const user = await db.user.findUnique({
      where: { id: credentials.userId as string },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    };
  },
}),
```

**Important:** This provider should NOT be inside the `env.NODE_ENV === "development"` conditional — it should work in all environments.

---

#### Phase 3: Frontend (Do Third)

**Step 11: Create `src/app/[locale]/signin/_components/OtpVerification.tsx`**

Copy the skeleton code from Section 12.3 exactly.

**Step 12: Update `src/app/[locale]/signin/_components/SignInForm.tsx`**

This is the most complex change. Here's the complete updated file:

```tsx
"use client";

import { signIn, getProviders } from "next-auth/react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { OtpVerification } from "./OtpVerification";

type Provider = {
  id: string;
  name: string;
  type: string;
};

// View states for the sign-in flow
type ViewState =
  | { type: "providers" }
  | { type: "credentials" }
  | { type: "email-input" }
  | { type: "otp-verify"; email: string; expiresAt: Date };

export default function SignInForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tProfile = useTranslations("profile");

  const [providers, setProviders] = useState<Record<string, Provider> | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<ViewState>({ type: "providers" });

  // For credentials form (dev only)
  const [email, setEmail] = useState("dev1@preppal.com");
  const [password, setPassword] = useState("dev123");
  const [isSigningIn, setIsSigningIn] = useState(false);

  // For email OTP flow
  const [otpEmail, setOtpEmail] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const sendOtpMutation = api.auth.sendOtp.useMutation();

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const availableProviders = await getProviders();
        setProviders(availableProviders);
      } catch (error) {
        console.error("Error fetching providers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchProviders();
  }, []);

  const handleSignIn = async (providerId: string) => {
    try {
      await signIn(providerId, { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (result?.error) {
        console.error("Sign in failed:", result.error);
        alert(t("signInFailed"));
      } else if (result?.ok) {
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.error("Error signing in:", error);
      alert(t("signInError"));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    try {
      const result = await sendOtpMutation.mutateAsync({ email: otpEmail });
      if (result.success) {
        setView({
          type: "otp-verify",
          email: otpEmail,
          expiresAt: new Date(result.expiresAt),
        });
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send code";
      setOtpError(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="text-secondary-text text-center">
        <p>{tCommon("loading")}</p>
      </div>
    );
  }

  // OTP Verification view
  if (view.type === "otp-verify") {
    return (
      <OtpVerification
        email={view.email}
        expiresAt={view.expiresAt}
        onBack={() => setView({ type: "email-input" })}
      />
    );
  }

  // Email input view (for OTP)
  if (view.type === "email-input") {
    return (
      <div className="space-y-4">
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label
              htmlFor="otp-email"
              className="text-secondary-text mb-2 block text-sm font-medium"
            >
              {tProfile("email")}
            </label>
            <input
              id="otp-email"
              type="email"
              value={otpEmail}
              onChange={(e) => setOtpEmail(e.target.value)}
              className="border-secondary-text/20 bg-secondary/50 text-primary-text focus:ring-accent w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          {otpError && (
            <p className="text-sm text-red-500">{otpError}</p>
          )}

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={sendOtpMutation.isPending}
              className="bg-accent hover:bg-accent/80 disabled:bg-accent/50 text-primary flex-1 rounded-md px-4 py-3 font-medium transition-colors"
            >
              {sendOtpMutation.isPending ? t("sending") : t("sendCode")}
            </button>
            <button
              type="button"
              onClick={() => setView({ type: "providers" })}
              className="border-secondary-text/20 text-secondary-text hover:bg-secondary/50 rounded-md border px-4 py-3 transition-colors"
            >
              {tCommon("back")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Dev credentials view
  if (view.type === "credentials") {
    return (
      <div className="space-y-4">
        <form onSubmit={handleCredentialsSignIn} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="text-secondary-text mb-2 block text-sm font-medium"
            >
              {tProfile("email")}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-secondary-text/20 bg-secondary/50 text-primary-text focus:ring-accent w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
              placeholder="dev1@preppal.com"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-secondary-text mb-2 block text-sm font-medium"
            >
              {t("password")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-secondary-text/20 bg-secondary/50 text-primary-text focus:ring-accent w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
              placeholder="dev123"
              required
            />
          </div>
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={isSigningIn}
              className="bg-accent hover:bg-accent/80 disabled:bg-accent/50 text-primary flex-1 rounded-md px-4 py-3 font-medium transition-colors"
            >
              {isSigningIn ? t("signingIn") : t("signIn")}
            </button>
            <button
              type="button"
              onClick={() => setView({ type: "providers" })}
              className="border-secondary-text/20 text-secondary-text hover:bg-secondary/50 rounded-md border px-4 py-3 transition-colors"
            >
              {tCommon("back")}
            </button>
          </div>
        </form>
        <div className="text-secondary-text text-center text-sm">
          <p>{t("devCredentials")}:</p>
          <p>dev1@preppal.com / dev123</p>
          <p>dev2@preppal.com / dev123</p>
          <p>dev3@preppal.com / dev123</p>
        </div>
      </div>
    );
  }

  // Main providers view
  return (
    <div className="space-y-4">
      {/* OAuth providers */}
      {providers &&
        Object.values(providers)
          .filter((p) => p.type !== "credentials") // Filter out credential providers
          .map((provider) => (
            <button
              key={provider.id}
              onClick={() => void handleSignIn(provider.id)}
              className="bg-accent hover:bg-accent/80 text-primary w-full rounded-md px-4 py-3 font-medium transition-colors"
            >
              {t("signInWith", { provider: provider.name })}
            </button>
          ))}

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="bg-secondary-text/20 h-px flex-1" />
        <span className="text-secondary-text text-sm">{t("or")}</span>
        <div className="bg-secondary-text/20 h-px flex-1" />
      </div>

      {/* Email OTP button */}
      <button
        onClick={() => setView({ type: "email-input" })}
        className="border-secondary-text/20 text-primary-text hover:bg-secondary/50 w-full rounded-md border px-4 py-3 font-medium transition-colors"
      >
        {t("continueWithEmail")}
      </button>

      {/* Dev credentials (only in development) */}
      {providers && Object.values(providers).some((p) => p.type === "credentials") && (
        <button
          onClick={() => setView({ type: "credentials" })}
          className="text-secondary-text hover:text-primary-text w-full text-sm underline transition-colors"
        >
          {t("devLogin")}
        </button>
      )}

      {(!providers || Object.keys(providers).length === 0) && (
        <div className="text-secondary-text text-center">
          <p className="mb-4">{t("noProviders")}</p>
          <p className="text-sm">{t("checkConfig")}</p>
        </div>
      )}
    </div>
  );
}
```

---

#### Phase 4: Translations (Do Fourth)

**Step 13: Add translation keys**

Add these keys to the `auth` section in your translation files. The existing keys should remain unchanged.

**English (`messages/en.json`)** - Add to existing `auth` object:

```json
{
  "auth": {
    "signInTitle": "Sign In to PrepPal",
    "signInSubtitle": "Practice interviews with AI feedback",
    "signIn": "Sign In",
    "signingIn": "Signing in...",
    "signInWith": "Sign in with {provider}",
    "signInFailed": "Sign in failed. Please check your credentials.",
    "signInError": "An error occurred during sign in.",
    "signInWithGoogle": "Continue with Google",
    "signInWithGithub": "Continue with GitHub",
    "signOut": "Sign Out",
    "signingOut": "Signing out...",
    "password": "Password",
    "devCredentials": "Development credentials",
    "noProviders": "No authentication providers available",
    "checkConfig": "Please check your configuration",
    "or": "or",
    "continueWithEmail": "Continue with email",
    "devLogin": "Development login",
    "sendCode": "Send code",
    "sending": "Sending...",
    "checkYourEmail": "Check your email",
    "codeSentTo": "We sent a code to {email}",
    "codeExpiresIn": "Code expires in {time}",
    "resendCode": "Resend code",
    "useDifferentEmail": "← Use different email"
  }
}
```

**Spanish (`messages/es.json`)** - Add to existing `auth` object:

```json
{
  "auth": {
    "or": "o",
    "continueWithEmail": "Continuar con correo",
    "devLogin": "Inicio de sesión de desarrollo",
    "sendCode": "Enviar código",
    "sending": "Enviando...",
    "checkYourEmail": "Revisa tu correo",
    "codeSentTo": "Enviamos un código a {email}",
    "codeExpiresIn": "El código expira en {time}",
    "resendCode": "Reenviar código",
    "useDifferentEmail": "← Usar otro correo"
  }
}
```

**Chinese (`messages/zh.json`)** - Add to existing `auth` object:

```json
{
  "auth": {
    "or": "或",
    "continueWithEmail": "使用邮箱继续",
    "devLogin": "开发登录",
    "sendCode": "发送验证码",
    "sending": "发送中...",
    "checkYourEmail": "请查收邮件",
    "codeSentTo": "我们已发送验证码至 {email}",
    "codeExpiresIn": "验证码将在 {time} 后过期",
    "resendCode": "重新发送验证码",
    "useDifferentEmail": "← 使用其他邮箱"
  }
}
```

> **Note:** The English file shows the complete `auth` object for reference. For es.json and zh.json, only the new keys are shown — merge them with existing translations.

---

#### Phase 5: Testing (Do Last)

**Step 14: Manual testing checklist**

Run through these tests manually:

| # | Test | Expected Result |
|---|------|-----------------|
| 1 | Enter valid email, click Send Code | Code sent, OTP screen shown |
| 2 | Enter correct 6-digit code | Signed in, redirected to /dashboard |
| 3 | Enter wrong code 3 times | Error messages shown, can retry |
| 4 | Enter wrong code 5+ times | Rate limited message |
| 5 | Wait 10+ minutes, then enter code | "Code expired" message |
| 6 | Click "Resend code" | New code sent, countdown resets |
| 7 | Click "Use different email" | Back to email input |
| 8 | Sign in with email that has OAuth account | Same account, emailVerified set |
| 9 | Sign in with brand new email | New account created |

**Step 15: Run automated checks**

```bash
pnpm format:write && pnpm check
```

---

### 12.9 Troubleshooting Guide

| Problem | Likely Cause | Solution |
|---------|--------------|----------|
| `RESEND_API_KEY is not defined` | Missing env var | Check `.env` has `RESEND_API_KEY` |
| `Cannot find module 'resend'` | Dependency not installed | Run `pnpm add resend` |
| `Table EmailVerification does not exist` | Migration not run | Run `pnpm db:push` |
| `auth.sendOtp is not a function` | Router not registered | Check `root.ts` has `auth: authRouter` |
| OTP email not received | Resend config issue | Check Resend dashboard for errors |
| `signIn("email-otp", ...)` fails | Provider not added | Check `config.ts` has the provider |
| Rate limit hit immediately | Previous test residue | Restart dev server (resets in-memory store) |

---

### 12.10 Code Review Checklist

Before submitting PR, verify:

- [ ] All skeleton code copied without modification (except where noted)
- [ ] No hardcoded emails or codes in committed code
- [ ] Environment variables added to `.env.example` (without real values)
- [ ] All new files have file-level doc comments
- [ ] `pnpm check` passes with no errors
- [ ] Manual testing checklist completed
- [ ] Translation keys added for all user-facing strings
