# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (with Turbo acceleration)
- **Build project**: `npm run build`
- **Type checking**: `npm run typecheck` or `tsc --noEmit`
- **Linting**: `npm run lint` (fix with `npm run lint:fix`)
- **Format code**: `npm run format:write` (check with `npm run format:check`)
- **Combined check**: `npm run check` (runs both lint and typecheck)
- **Testing**: `npm run test` (UI: `npm run test:ui`, CI: `npm run test:ci`)

## Database Commands

- **Generate migrations**: `npm run db:generate`
- **Deploy migrations**: `npm run db:migrate`
- **Push schema changes**: `npm run db:push`
- **Open Prisma Studio**: `npm run db:studio`

## Project Architecture

This is a **T3 Stack** application (Next.js 15 + TypeScript + tRPC + Prisma + NextAuth.js + Tailwind CSS) for an interview preparation platform called "PrepPal".

### Core Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict configuration
- **Database**: SQLite with Prisma ORM
- **API Layer**: tRPC for end-to-end typesafe APIs
- **Authentication**: NextAuth.js v5 beta
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest with React Testing Library and jsdom
- **Package Manager**: pnpm

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

### Agent References

- `docs/` folder contain additional instructions and background, such as system design, tdd methdology, development plan, and application states.
- `prisma/schema.prisma` is the source of truth for data, do not modify it unless explictly instructed by the user.
- Before starting a task, always write out the plan into `/docs/05_current_task.md`.
- After completing a task, always update the status into `/docs/05_current_task.md`.
