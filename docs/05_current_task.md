# Current Task: Email OTP Authentication (FEAT25)

## Status: ✅ Complete

All phases implemented and ready for manual testing.

### Phase 1: Setup ✅
- [x] Add `RESEND_API_KEY`, `EMAIL_FROM` to `src/env.js`
- [x] Add `EmailVerification` model to `prisma/schema.prisma`
- [x] Install `resend` package
- [x] Run `pnpm db:push`

### Phase 2: Backend ✅
- [x] Create `src/server/lib/rate-limit.ts` - In-memory rate limiter
- [x] Create `src/server/lib/otp.ts` - OTP generation, hashing, verification
- [x] Create `src/server/lib/email.ts` - Resend email integration
- [x] Create `src/server/api/routers/auth.ts` - `sendOtp`, `verifyOtp` procedures
- [x] Register auth router in `src/server/api/root.ts`
- [x] Add `email-otp` provider to `src/server/auth/config.ts`

### Phase 3: Frontend ✅
- [x] Create `src/app/[locale]/signin/_components/OtpVerification.tsx`
- [x] Update `src/app/[locale]/signin/_components/SignInForm.tsx`

### Phase 4: Translations ✅
- [x] Add auth translation keys to `messages/en.json`
- [x] Add auth translation keys to `messages/es.json`
- [x] Add auth translation keys to `messages/zh.json`

### Phase 5: Testing ✅
- [x] Unit tests for OTP utilities (rate limiting, code generation, hashing)
- [x] Integration tests for EmailVerification model
- [x] Integration tests calling real tRPC procedures (`auth.sendOtp`, `auth.verifyOtp`)

### Phase 6: Documentation ✅
- [x] Update `.env.example` with Resend configuration

## Branch
`feat/email-otp-utils`

## Next Steps
1. Manual testing per checklist in FEAT25 spec (Section 12.8 Step 14)
2. Create PR to merge into `main`

## Key Files Created/Modified

| File | Purpose |
|------|---------|
| `src/server/lib/rate-limit.ts` | In-memory rate limiter (5 attempts/15 min per email) |
| `src/server/lib/otp.ts` | OTP generation, SHA-256 hashing, constant-time verification |
| `src/server/lib/email.ts` | Resend email service (logs to console in dev mode) |
| `src/server/api/routers/auth.ts` | tRPC router with `sendOtp` and `verifyOtp` mutations |
| `prisma/schema.prisma` | Added `EmailVerification` model |
| `src/server/auth/config.ts` | Added `email-otp` credentials provider |
| `src/app/[locale]/signin/_components/OtpVerification.tsx` | 6-digit code entry with auto-focus, paste, countdown |
| `src/app/[locale]/signin/_components/SignInForm.tsx` | Updated with ViewState pattern for OTP flow |
| `messages/en.json` | Added 14 auth translation keys |
| `messages/es.json` | Added 14 auth translation keys (Spanish) |
| `messages/zh.json` | Added 14 auth translation keys (Chinese) |
| `.env.example` | Added Resend configuration documentation |

## Design Reference
Full specification: [docs/todo/FEAT25_email_otp_login.md](./todo/FEAT25_email_otp_login.md)
