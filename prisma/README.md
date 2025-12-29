# Database Schema

Prisma-managed PostgreSQL database for Preppal. Stores users, interviews, transcripts, feedback, and supporting entities.

## Quick Reference

| Model | Purpose |
|-------|---------|
| `User` | User identity and profile (NextAuth.js compatible) |
| `Account` | OAuth provider accounts (Google) |
| `Session` | Active user sessions |
| `EmailVerification` | OTP codes for passwordless auth |
| `Interview` | Core interview session record |
| `InterviewFeedback` | AI-generated feedback (1:1 with Interview) |
| `TranscriptEntry` | Protobuf transcript blob (1:1 with Interview) |
| `InterviewBlock` | Block within block-based interview |
| `JobDescription` | User's saved job descriptions library |
| `Resume` | User's saved resumes library |

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ENTITY RELATIONSHIPS                                 │
│                                                                              │
│  ┌──────────────┐                                                           │
│  │     User     │                                                           │
│  │──────────────│                                                           │
│  │ id           │                                                           │
│  │ email        │                                                           │
│  │ name         │                                                           │
│  │ uiLanguage   │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                    │
│         │ 1:N                                                                │
│         │                                                                    │
│    ┌────┴────┬────────────┬────────────┬─────────────┐                     │
│    │         │            │            │             │                     │
│    ▼         ▼            ▼            ▼             ▼                     │
│ ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────────┐ ┌───────────────┐       │
│ │Account │ │Session │ │Interview │ │JobDescription│ │    Resume     │       │
│ │(OAuth) │ │        │ │          │ │            │ │               │       │
│ └────────┘ └────────┘ └────┬─────┘ └────────────┘ └───────────────┘       │
│                            │                                                │
│                            │ 1:1 / 1:N                                      │
│              ┌─────────────┼─────────────┐                                 │
│              │             │             │                                 │
│              ▼             ▼             ▼                                 │
│     ┌────────────────┐ ┌────────────┐ ┌──────────────┐                    │
│     │InterviewFeedback│ │TranscriptEntry│ │InterviewBlock│                    │
│     │   (1:1)        │ │   (1:1)    │ │   (1:N)      │                    │
│     └────────────────┘ └────────────┘ └──────────────┘                    │
│                                                                              │
│  ┌───────────────────┐                                                      │
│  │ EmailVerification │  (Standalone - for OTP auth)                        │
│  └───────────────────┘                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Models

### User

NextAuth.js compatible user model.

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  uiLanguage    String    @default("en")  // en, es, zh

  // Relations
  accounts        Account[]
  sessions        Session[]
  interviews      Interview[]
  resumes         Resume[]
  jobDescriptions JobDescription[]
}
```

### Interview

Central model representing a single interview session.

```prisma
model Interview {
  id             String   @id @default(cuid())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Lifecycle timestamps
  startedAt      DateTime?
  endedAt        DateTime?
  status         InterviewStatus @default(PENDING)

  // Idempotency
  idempotencyKey String @unique

  // Snapshots (immutable historical record)
  jobTitleSnapshot       String?
  jobDescriptionSnapshot String?
  resumeSnapshot         String?

  // Configuration
  persona        String?                           // AI interviewer persona
  duration       InterviewDuration @default(STANDARD)

  // Block-based interview support
  templateId     String?
  isBlockBased   Boolean @default(false)

  // Guest access
  guestToken     String?   @unique
  guestExpiresAt DateTime?

  // Relations
  userId           String
  jobDescriptionId String?
  resumeId         String?
  feedback         InterviewFeedback?
  transcript       TranscriptEntry?
  blocks           InterviewBlock[]
}
```

**Key design decisions:**

1. **Snapshot Pattern**: `jobDescriptionSnapshot` and `resumeSnapshot` are copies of content at interview creation time. If the user later edits their saved JD or resume, the historical interview record remains unchanged.

2. **Idempotency Key**: Prevents duplicate interview creation from double-clicks or network retries.

3. **Guest Token**: Enables shareable links with 24-hour expiration for feedback viewing.

### InterviewFeedback

AI-generated feedback, stored separately for async generation.

```prisma
model InterviewFeedback {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())

  summary                  String  // High-level overview
  strengths                String  // Markdown list of positives
  contentAndStructure      String  // Answer substance/organization
  communicationAndDelivery String  // Verbal style, pacing, clarity
  presentation             String  // Non-verbal cues

  interviewId String    @unique
  interview   Interview @relation(...)
}
```

### TranscriptEntry

Stores the complete conversation as a protobuf binary blob.

```prisma
model TranscriptEntry {
  id          String   @id @default(cuid())
  interviewId String   @unique
  transcript  Bytes    // Protobuf binary (preppal.transcript.Transcript)
  createdAt   DateTime @default(now())

  interview   Interview @relation(...)
}
```

**Why protobuf blob?**
- Efficient storage for structured turn-by-turn data
- Schema evolution support
- Consistent with worker communication format

### InterviewBlock

For block-based interviews (e.g., multi-language MBA interviews).

```prisma
model InterviewBlock {
  id          String   @id @default(cuid())
  interviewId String

  blockNumber Int           // 1-indexed
  language    BlockLanguage // EN, ZH
  questions   Json          // Array of question strings

  startedAt   DateTime?
  endedAt     DateTime?
  durationSec Int?
  status      BlockStatus @default(PENDING)

  transcriptId String? @unique  // Future: link to segment transcript

  @@unique([interviewId, blockNumber])
  @@index([interviewId])
}
```

### EmailVerification

OTP codes for passwordless authentication.

```prisma
model EmailVerification {
  id        String    @id @default(cuid())
  email     String
  codeHash  String    // Hashed 6-digit code
  expiresAt DateTime
  createdAt DateTime  @default(now())
  usedAt    DateTime? // Marked when consumed

  @@index([email])
}
```

## Enums

```prisma
enum InterviewStatus {
  PENDING      // Created but not started
  IN_PROGRESS  // Active session
  COMPLETED    // Finished successfully
  ERROR        // Something went wrong
}

enum InterviewDuration {
  SHORT     // 10 minutes
  STANDARD  // 30 minutes (default)
  EXTENDED  // 60 minutes
}

enum BlockLanguage {
  EN  // English
  ZH  // Mandarin Chinese
}

enum BlockStatus {
  PENDING      // Not started
  IN_PROGRESS  // Currently active
  COMPLETED    // Finished
  SKIPPED      // User skipped
}
```

## Snapshot Pattern

Interviews use snapshots to preserve historical context:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SNAPSHOT PATTERN                                     │
│                                                                              │
│  User's Library (mutable)              Interview Record (immutable)         │
│  ┌──────────────────────┐              ┌──────────────────────────┐        │
│  │ JobDescription       │              │ Interview                 │        │
│  │ ─────────────────    │   Copy at    │ ──────────────────────    │        │
│  │ title: "SWE at Google"│ ──────────→ │ jobTitleSnapshot: "SWE..."│        │
│  │ content: "We are..." │   creation   │ jobDescriptionSnapshot:...│        │
│  └──────────────────────┘              └──────────────────────────┘        │
│           │                                        │                        │
│           │ User edits title                       │ Unchanged              │
│           ▼                                        ▼                        │
│  ┌──────────────────────┐              ┌──────────────────────────┐        │
│  │ title: "SWE at Meta" │              │ jobTitleSnapshot: "SWE..." │       │
│  │ (changed)            │              │ (preserved)               │        │
│  └──────────────────────┘              └──────────────────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Historical accuracy for feedback context
- User can freely edit their library
- Each interview has complete, self-contained context

## Operational Guide

### Common Commands

```bash
# Push schema changes to database (development)
pnpm db:push

# Generate Prisma client after schema changes
pnpm prisma generate

# Open Prisma Studio (database GUI)
pnpm prisma studio

# Create a migration (for production)
pnpm prisma migrate dev --name <migration_name>

# Apply migrations (production)
pnpm prisma migrate deploy

# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset

# Seed database
pnpm db:seed
```

### Development Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SCHEMA CHANGE WORKFLOW                                  │
│                                                                              │
│  1. Edit schema.prisma                                                      │
│     │                                                                        │
│     ▼                                                                        │
│  2. pnpm db:push (development)                                              │
│     - Syncs schema to local database                                        │
│     - Generates Prisma client                                               │
│     - May cause data loss on breaking changes                               │
│     │                                                                        │
│     ▼                                                                        │
│  3. Test changes locally                                                    │
│     │                                                                        │
│     ▼                                                                        │
│  4. pnpm prisma migrate dev --name <name> (before PR)                       │
│     - Creates SQL migration file                                            │
│     - Commit migration to git                                               │
│     │                                                                        │
│     ▼                                                                        │
│  5. Production deployment runs pnpm prisma migrate deploy                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Environment Setup

```bash
# Local development (Docker PostgreSQL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/preppal"

# Production (Neon)
DATABASE_URL="postgresql://user:pass@host.neon.tech/preppal?sslmode=require"
```

### Database Reset (Development Only)

```bash
# Full reset with seed data
pnpm prisma migrate reset

# Or manually:
pnpm prisma db push --force-reset
pnpm db:seed
```

## Indexes

Current indexes for query performance:

| Model | Index | Purpose |
|-------|-------|---------|
| `User` | `email` (unique) | Login lookup |
| `Interview` | `idempotencyKey` (unique) | Duplicate prevention |
| `Interview` | `guestToken` (unique) | Guest link lookup |
| `InterviewBlock` | `[interviewId, blockNumber]` (unique) | Block lookup |
| `InterviewBlock` | `interviewId` | List blocks for interview |
| `EmailVerification` | `email` | OTP lookup |

## Cascade Deletes

Configured for data integrity:

| Parent | Child | On Delete |
|--------|-------|-----------|
| `User` | `Account`, `Session`, `Interview`, `Resume`, `JobDescription` | Cascade |
| `Interview` | `InterviewFeedback`, `TranscriptEntry`, `InterviewBlock` | Cascade |
| `Interview` | `JobDescription` (FK) | SetNull |
| `Interview` | `Resume` (FK) | SetNull |

## Common Queries

### Get interview with feedback
```typescript
const interview = await db.interview.findUnique({
  where: { id: interviewId },
  include: { feedback: true },
});
```

### Get user's interview history
```typescript
const interviews = await db.interview.findMany({
  where: { userId: user.id },
  orderBy: { createdAt: 'desc' },
  select: {
    id: true,
    status: true,
    createdAt: true,
    jobDescriptionSnapshot: true,
  },
});
```

### Get block-based interview with blocks
```typescript
const interview = await db.interview.findUnique({
  where: { id: interviewId },
  include: {
    blocks: { orderBy: { blockNumber: 'asc' } },
  },
});
```

### Upsert feedback (idempotent)
```typescript
const feedback = await db.interviewFeedback.upsert({
  where: { interviewId },
  update: feedbackData,
  create: { interviewId, ...feedbackData },
});
```

## Testing

```bash
# Run with test database
DATABASE_URL="postgresql://..." pnpm test

# Tests use transactions for isolation
# See src/test/ for examples
```

## Related Documentation

- [Interview Routers](../src/server/api/routers/README.md) - API endpoints that use these models
- [Worker Architecture](../worker/README.md) - How transcripts are submitted
- [Interview Templates](../src/lib/interview-templates/README.md) - Block-based interview definitions
