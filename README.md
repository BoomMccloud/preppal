# Preppal

AI-powered interview practice platform using the Gemini Live API for real-time conversational interviews.

## Features

- **Real-time AI Interviews** - Practice with an AI interviewer powered by Google Gemini Live API
- **Block-based Templates** - Structured interview formats with multiple language blocks (e.g., English + Mandarin)
- **AI Feedback** - Receive detailed analysis of your performance after each session
- **Transcript Review** - Full conversation history stored for review
- **Share Results** - Generate guest links to share feedback with others
- **Multi-language Support** - UI available in English, Spanish, and Chinese

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PREPPAL ARCHITECTURE                              │
│                                                                              │
│  ┌─────────────────────┐    WebSocket     ┌─────────────────────────────┐  │
│  │      Next.js        │◄────────────────►│   Cloudflare Worker         │  │
│  │   (Frontend + API)  │                  │   (Durable Object)          │  │
│  │                     │    tRPC/HTTP     │                             │  │
│  │  • React UI         │◄────────────────►│  • Gemini Live API          │  │
│  │  • tRPC Routers     │                  │  • Audio streaming          │  │
│  │  • NextAuth.js      │                  │  • Transcript management    │  │
│  └──────────┬──────────┘                  └─────────────────────────────┘  │
│             │                                                                │
│             │ Prisma                                                         │
│             ▼                                                                │
│  ┌─────────────────────┐                                                    │
│  │     PostgreSQL      │                                                    │
│  │  (Neon in prod)     │                                                    │
│  └─────────────────────┘                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router, RSC) |
| API | [tRPC 11](https://trpc.io/) |
| Database | [PostgreSQL](https://www.postgresql.org/) via [Prisma](https://prisma.io/) |
| Auth | [NextAuth.js v5](https://next-auth.js.org/) (Google OAuth + Email OTP) |
| AI | [Google Gemini Live API](https://ai.google.dev/) |
| Worker | [Cloudflare Workers](https://workers.cloudflare.com/) (Durable Objects) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| i18n | [next-intl](https://next-intl.dev/) (en, es, zh) |
| Protocol | [Protocol Buffers](https://protobuf.dev/) |
| Testing | [Vitest](https://vitest.dev/) |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local PostgreSQL)
- Google Cloud account (for Gemini API key)
- Cloudflare account (for Worker deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/preppal.git
cd preppal

# Install dependencies
pnpm install

# Generate Prisma client and protobuf types
pnpm prisma generate
pnpm proto:generate

# Copy environment template
cp .env.example .env
```

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/preppal"

# Auth
AUTH_SECRET="your-auth-secret"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# Gemini API
GEMINI_API_KEY="your-gemini-api-key"

# Worker Communication
JWT_SECRET="your-jwt-secret"
WORKER_SHARED_SECRET="your-worker-secret"

# Email (optional - for OTP)
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="noreply@yourdomain.com"
```

### Development

```bash
# Start PostgreSQL (Docker)
docker-compose up -d

# Push schema to database
pnpm db:push

# Start Next.js development server
pnpm dev

# In another terminal, start the Worker
pnpm dev:worker
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
preppal/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   └── [locale]/
│   │       ├── (app)/          # Main app routes (dashboard)
│   │       └── (interview)/    # Interview routes (lobby, session, feedback)
│   ├── server/
│   │   ├── api/                # tRPC routers
│   │   ├── auth/               # NextAuth.js configuration
│   │   └── lib/                # Server utilities
│   ├── lib/
│   │   ├── audio/              # Client-side audio pipeline
│   │   ├── interview-templates/# Block-based interview definitions
│   │   └── proto/              # Generated protobuf types
│   └── trpc/                   # tRPC client setup
├── worker/                     # Cloudflare Worker (Gemini integration)
├── prisma/                     # Database schema
├── proto/                      # Protobuf definitions
└── public/                     # Static assets (audio worklets)
```

## Documentation

Detailed documentation is available in each module:

| Area | Documentation |
|------|---------------|
| **Interview Session** | [src/app/.../session/README.md](src/app/[locale]/(interview)/interview/[interviewId]/session/README.md) |
| **Interview Lobby** | [src/app/.../lobby/README.md](src/app/[locale]/(interview)/interview/[interviewId]/lobby/README.md) |
| **Interview Feedback** | [src/app/.../feedback/README.md](src/app/[locale]/(interview)/interview/[interviewId]/feedback/README.md) |
| **Worker Architecture** | [worker/README.md](worker/README.md) |
| **API Routers** | [src/server/api/routers/README.md](src/server/api/routers/README.md) |
| **Interview Templates** | [src/lib/interview-templates/README.md](src/lib/interview-templates/README.md) |
| **Audio Pipeline** | [src/lib/audio/README.md](src/lib/audio/README.md) |
| **Database Schema** | [prisma/README.md](prisma/README.md) |
| **Protocol Definitions** | [proto/README.md](proto/README.md) |

## Commands

```bash
# Development
pnpm dev              # Start Next.js dev server
pnpm dev:worker       # Start Worker dev server

# Code Quality
pnpm check            # Run linting + type checking
pnpm format           # Format code with Prettier
pnpm test             # Run tests with Vitest

# Database
pnpm db:push          # Push schema changes
pnpm db:seed          # Seed database
pnpm prisma studio    # Open Prisma Studio GUI

# Code Generation
pnpm prisma generate  # Generate Prisma client
pnpm proto:generate   # Generate protobuf types
```

## Interview Flow

```
1. CREATE INTERVIEW
   User provides job description + resume
   └─→ Interview record created (PENDING)

2. LOBBY
   User reviews details, grants mic permission
   └─→ Can share via guest link

3. SESSION
   Real-time conversation with AI interviewer
   └─→ Audio streamed via WebSocket → Worker → Gemini
   └─→ Transcript accumulated in Worker

4. FEEDBACK
   AI analyzes transcript and generates feedback
   └─→ Summary, strengths, detailed analysis
   └─→ Shareable with guest link
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Make your changes
4. Run `pnpm format && pnpm check` to ensure code quality
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feat/amazing-feature`)
7. Open a Pull Request

## License

[MIT](LICENSE)
