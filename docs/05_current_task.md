# Current Task: Email OTP Authentication (FEAT25)

## Status

### Phase 1: Setup ✅
- [x] Add `RESEND_API_KEY`, `EMAIL_FROM` to `src/env.js`
- [x] Add `EmailVerification` model to `prisma/schema.prisma`
- [x] Install `resend` package
- [ ] Run `pnpm db:push` (requires DATABASE_URL in environment)

### Phase 2: Backend ✅
- [x] Create `src/server/lib/rate-limit.ts` - In-memory rate limiter
- [x] Create `src/server/lib/otp.ts` - OTP generation, hashing, verification
- [x] Create `src/server/lib/email.ts` - Resend email integration
- [x] Create `src/server/api/routers/auth.ts` - `sendOtp`, `verifyOtp` procedures
- [x] Register auth router in `src/server/api/root.ts`
- [x] Add `email-otp` provider to `src/server/auth/config.ts`

### Phase 3: Frontend (Pending)
- [ ] Create `src/app/[locale]/signin/_components/OtpVerification.tsx`
- [ ] Update `src/app/[locale]/signin/_components/SignInForm.tsx`

### Phase 4: Translations (Pending)
- [ ] Add auth translation keys to `messages/en.json`
- [ ] Add auth translation keys to `messages/es.json`
- [ ] Add auth translation keys to `messages/zh.json`

### Phase 5: Testing (Pending)
- [x] Unit tests for OTP utilities (rate limiting, code generation, hashing)
- [x] Integration tests for EmailVerification model
- [ ] Update integration tests to call real tRPC procedures

## Branch
`feat/email-otp-utils`

## Commits
1. `67555e8` - Add OTP utilities and rate limiter for email auth
2. `ed88941` - Add email OTP authentication backend

## Objective
Implement passwordless email OTP authentication as an alternative to OAuth (Google/GitHub). This enables users in regions where OAuth providers are blocked (e.g., China) to sign in using their email address.

## Key Files Created/Modified

| File | Purpose |
|------|---------|
| `src/server/lib/rate-limit.ts` | In-memory rate limiter (5 attempts/15 min per email) |
| `src/server/lib/otp.ts` | OTP generation, SHA-256 hashing, constant-time verification |
| `src/server/lib/email.ts` | Resend email service (logs to console in dev mode) |
| `src/server/api/routers/auth.ts` | tRPC router with `sendOtp` and `verifyOtp` mutations |
| `prisma/schema.prisma` | Added `EmailVerification` model |
| `src/server/auth/config.ts` | Added `email-otp` credentials provider |

## Design Reference
Full specification: [docs/todo/FEAT25_email_otp_login.md](./todo/FEAT25_email_otp_login.md)
