no# Gemini Project Context: Preppal

This document provides a comprehensive overview of the "Preppal" project, its structure, and development conventions to be used as a guide for future interactions.

Preppal is an application that uses the Gemini Live API to help users practice interviews.

## Key Technologies

- **Framework**: [Next.js](https://nextjs.org/) (v15)
- **API**: [tRPC](https://trpc.io/) (v11)
- **ORM**: [Prisma](https://prisma.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (v5 Beta) - Google OAuth & Email OTP
- **Database**: PostgreSQL (Docker locally, [Neon](https://neon.tech/) in production)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Testing**: [Vitest](https://vitest.dev/) (Unit/Integration)
- **Linting**: [ESLint](https://eslint.org/)
- **Formatting**: [Prettier](https://prettier.io/)
- **Email**: [Resend](https://resend.com/) (transactional emails)
- **Internationalization**: [next-intl](https://next-intl.dev/) (en, es, zh)
- **Validation**: [Zod](https://zod.dev/)
- **AI**: [Google Gemini](https://ai.google.dev/) (@google/genai)

## Architectural Concepts

This project is divided into several key architectural components. For more detailed information, please refer to the specific `README.md` file in each directory.

- **[Frontend (`src/app`)](./src/app/README.md)**: Built with Next.js and React Server Components.
- **[Backend (`src/server/api`)](./src/server/api/README.md)**: Built with tRPC for a typesafe API.
- **[Database (`prisma`)](./prisma/README.md)**: Schema managed with Prisma using PostgreSQL.
- **[Protocols (`proto`)](./proto/README.md)**: Protobuf definitions for real-time communication.
- **[Cloudflare Worker (`worker/`)](./worker/README.md)**: Handles real-time communication with the Gemini Live API.

## Important Commands

- `pnpm dev`: Start the development server.
- `pnpm dev:worker`: Start the worker development server.
- `pnpm test`: Run unit and integration tests with Vitest.
- `pnpm check`: Run linting and type checking.
- `pnpm format`: Format code using Prettier.
- `pnpm db:push`: Push Prisma schema changes to the database.
- `pnpm proto:generate`: Generate TypeScript definitions from Protobuf files.

## Agent Instructions

- **Use `/docs/05_gemini_current_task.md`** to document and track the current task progress.

## When Evaluating Tests

Use this prompt:

> "Critically analyze these tests for _value_ and _utility_, not just validity. Flag any tests that fall into these 'Low-Value' categories:
>
> 1.  Framework/Library Tests: Tests that verify React, Zod, or other libraries work (e.g., 'renders text', 'validates .min(1)').
> 2.  Tautologies: Tests that assert static configuration or constants (e.g., 'timeout is 90').
> 3.  Mock-Testing-Mocks: Tests that mock the entire implementation and just verify the mock returned data.
> 4.  Implementation Details: Tests that would break if I refactored the code without changing the behavior."
