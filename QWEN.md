# Qwen Context for Preppal Project

## Project Overview

Preppal is a full-stack web application built with the [T3 Stack](https://create.t3.gg/). It's designed to facilitate live interview practice with AI. The application leverages:

- **Frontend**: Next.js (React)
- **Backend**: Cloudflare Workers with WebSocket server
- **Database**: SQLite with Prisma ORM
- **Real-time Communication**: WebSockets for bi-directional audio streaming
- **API**: tRPC for standard data fetching
- **Data Serialization**: Protocol Buffers for real-time audio data
- **Authentication**: NextAuth.js

## Core Technologies

1. **Next.js**: Framework for frontend
2. **Cloudflare Workers**: Backend WebSocket server for real-time communication
3. **TypeScript**: Primary language with strict type checking
4. **tRPC**: Typesafe API routes
5. **Prisma**: ORM for database interactions
6. **NextAuth.js**: Authentication
7. **WebSockets**: Real-time communication for interviews
8. **Tailwind CSS**: Styling
9. **Vitest**: Testing framework
10. **ESLint/Prettier**: Code quality tools

## Project Structure

```
src/
├── app/                 # Next.js app router pages
│   ├── (app)/           # Main application routes
│   │   ├── create-interview/
│   │   ├── dashboard/
│   │   ├── interview/
│   │   ├── mic-test/
│   │   ├── profile/
│   │   └── raw-worker-test/
│   ├── api/             # Next.js API routes
│   ├── signin/          # Authentication pages
│   └── (legal)/         # Legal pages
├── server/              # Server-side code
│   ├── api/             # tRPC routers
│   │   └── routers/     # Individual API routers
│   ├── auth/            # Authentication setup
│   └── db.ts            # Database setup
├── trpc/                # tRPC configuration
├── lib/                 # Shared libraries
├── types/               # TypeScript type definitions
├── styles/              # Global styles
└── test/                # Test utilities
worker/
├── src/                 # Cloudflare Worker implementation
│   ├── lib/             # Worker shared libraries
│   ├── __tests__/       # Worker tests
│   ├── index.ts         # Worker entry point
│   ├── gemini-session.ts # AI session management
│   ├── messages.ts      # Message handling
│   ├── transcript-manager.ts # Transcript management
│   ├── audio-converter.ts # Audio conversion utilities
│   ├── auth.ts          # Authentication helpers
│   └── api-client.ts    # API client for main backend
└── wrangler.toml        # Worker configuration
```

## Key Components

### Frontend (Client-Side)

- Built with Next.js App Router
- Uses React Server Components where appropriate
- Implements tRPC for data fetching
- Connects to Cloudflare Worker via WebSocket for real-time audio streaming
- Uses Tailwind CSS for styling

### Backend (Server-Side)

- **tRPC API**: Standard data fetching (user profiles, interview history, etc.)
- **Cloudflare Worker**: Manages real-time interview sessions via WebSocket
- **Database**: Prisma ORM for SQLite interactions

### Database (Prisma)

Models include:

- User, Account, Session (for authentication)
- Interview (core interview sessions)
- InterviewFeedback (AI-generated feedback)
- TranscriptEntry (interview transcripts)
- JobDescription (user's job descriptions)
- Resume (user's resumes)

## Development Workflow

### Environment Setup

1. Copy `.env.example` to `.env` and populate values
2. Run `pnpm install` to install dependencies
3. Run `pnpm db:push` to set up the database
4. Set up Cloudflare Wrangler for Worker development

### Running the Application

- `pnpm dev`: Start Next.js development server
- `pnpm dev:ws`: Start Cloudflare Worker locally
- `pnpm dev:worker`: Start Cloudflare Worker with Wrangler
- `pnpm build`: Build the application for production

### Database Management

- `pnpm db:generate`: Generate Prisma client
- `pnpm db:push`: Push schema changes to database
- `pnpm db:studio`: Open Prisma Studio
- `pnpm db:seed`: Seed the database

### Code Quality

- `pnpm lint`: Run ESLint
- `pnpm lint:fix`: Run ESLint with auto-fix
- `pnpm format:check`: Check code formatting with Prettier
- `pnpm format:write`: Format code with Prettier
- `pnpm typecheck`: Run TypeScript type checking

### Testing

- `pnpm test`: Run Vitest tests
- `pnpm test:ui`: Run Vitest with UI
- `pnpm test:ci`: Run tests in CI mode

## Application Flow

1. User signs in with NextAuth.js
2. User navigates to dashboard
3. User creates a new interview session by providing job description and resume
4. System creates interview with PENDING status
5. User enters the interview lobby
6. User connects to Cloudflare Worker via WebSocket for real-time communication
7. Interview progresses with AI interaction
8. System generates feedback after interview completion
9. User can view feedback and performance metrics

## WebSocket Communication

The Cloudflare Worker handles real-time interview sessions:

- Authentication via JWT tokens
- Audio streaming (bi-directional)
- Transcript generation
- Session management
- Feedback generation

## Testing Strategy

- Unit tests with Vitest
- Mocked database and external services
- Integration tests for critical flows
- Test files follow the pattern `*.test.ts`

## Code Quality Standards

- Strict TypeScript with noImplicitAny
- ESLint for code linting with recommended rules
- Prettier for code formatting
- Tailwind CSS plugin for consistent styling
- Consistent error handling patterns
- Security-focused practices (authorization checks, etc.)

## Deployment

The application can be deployed to:

- Vercel (Frontend)
- Cloudflare Workers (WebSocket backend)
- Docker containers

Environment variables must be configured according to `.env.example`.

## Key Development Patterns

1. **tRPC**: Used for all API interactions with full type safety
2. **Protected Procedures**: API routes that require authentication
3. **Idempotency**: Interview creation uses idempotency keys to prevent duplicates
4. **Discriminated Unions**: Used for job description and resume inputs
5. **Mock Data**: Fallback data for development and testing
6. **Error Handling**: Comprehensive error handling with appropriate HTTP status codes
7. **Security**: Authorization checks on all user-specific data

## Agent Instructions

- Address the user as Mr. User
- Reload all files for the latest context
- Use /docs/05_current_task.md file document the current task
- Add descriptions at the beginning of each file
- Keep files to 300 lines of code or less, refactor if needed
- Use boiler plates or reference implementation whenever possible, minize the amount of new code
- run pnpm format && pnpm lint before submitting code