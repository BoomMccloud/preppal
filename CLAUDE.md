# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `pnpm dev` (with Turbo acceleration)
- **Build project**: `pnpm build`
- **Type checking**: `pnpm typecheck` or `tsc --noEmit`
- **Linting**: `pnpm lint` (fix with `pnpm lint:fix`)
- **Format code**: `pnpm format:write` (check with `pnpm format:check`)
- **Combined check**: `pnpm check` (runs both lint and typecheck)
- **Testing**: `pnpm test` (UI: `pnpm test:ui`, CI: `pnpm test:ci`)

## Database Commands

- **Generate migrations**: `pnpm db:generate`
- **Deploy migrations**: `pnpm db:migrate`
- **Push schema changes**: `pnpm db:push`
- **Open Prisma Studio**: `pnpm db:studio`

## Project Architecture

This is a **T3 Stack** application (Next.js 15 + TypeScript + tRPC + Prisma + NextAuth.js + Tailwind CSS) for an interview preparation platform called "PrepPal".

### Database Schema

The application centers around interview sessions with the following key models:

- **User**: Standard NextAuth user with accounts/sessions
- **Interview**: Core interview session with status tracking (PENDING → IN_PROGRESS → COMPLETED/ERROR)
- **TranscriptEntry**: Real-time conversation records with speaker roles (USER/AI) and timestamps
- **InterviewFeedback**: AI-generated analysis with scores and improvement areas

### Project Structure

- `src/app/`: Next.js App Router pages and API routes
- `src/server/`: tRPC routers, database connection, and auth configuration
- `src/trpc/`: Client-side tRPC setup and React Query integration
- `prisma/`: Database schema and migrations
- `src/test/`: Test setup and utilities

### Key Patterns

- **Path alias**: Use `~/` for `src/` imports
- **tRPC procedures**: All API endpoints are strongly typed through tRPC routers
- **Protected routes**: Authentication required for core functionality
- **Database relations**: Cascading deletes for user data cleanup

### Environment Setup

The project uses `@t3-oss/env-nextjs` for environment variable validation. Check `src/env.js` for required environment variables.

### Testing Configuration

Tests run in jsdom environment with global test utilities. Setup file located at `src/test/setup.ts`.

### Instructions

- Always start with the latest version of the file for the latest content
- `prisma/schema.prisma` is the source of truth, do not modify it unless explictly instructed by the user.
- After completing a task, and verified that the tests passed, summarize the work in a "progression" section within the spec document.
- When writing code, keep files to 300 line or less, if the file needs to go over 300 line, refactor.
