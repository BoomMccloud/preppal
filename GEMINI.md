no# Gemini Project Context: Preppal

This document provides a comprehensive overview of the "Preppal" project, its structure, and development conventions to be used as a guide for future interactions.

Preppal is an application that uses the Gemini Live API to help users practice interviews.

## Key Technologies

- **Framework**: [Next.js](https://nextjs.org/) (v15)
- **API**: [tRPC](https://trpc.io/) (v11)
- **ORM**: [Prisma](https://prisma.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (v5 Beta)
- **Database**: SQLite (for development/local)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Testing**: [Vitest](https://vitest.dev/) (Unit/Integration), Playwright (E2E)
- **Linting**: [ESLint](https://eslint.org/)
- **Formatting**: [Prettier](https://prettier.io/)

## Architectural Concepts

This project is divided into several key architectural components. For more detailed information, please refer to the specific `agent.md` file in each directory.

- **[Frontend (`src/app`)](./src/app/agent.md)**: Built with Next.js and React Server Components.
- **[Backend (`src/server/api`)](./src/server/api/agent.md)**: Built with tRPC for a typesafe API.
- **[Database (`prisma`)](./prisma/README.md)**: Schema managed with Prisma.
- **[Protocols (`proto`)](./proto/README.md)**: Protobuf definitions for real-time communication.
- **[Cloudflare Worker (`worker/`)](./worker/README.md)**: Handles real-time communication with the Gemini Live API.

## Important Commands

- `pnpm dev`: Start the development server.
- `pnpm test`: Run unit and integration tests with Vitest.
- `pnpm check`: Run linting and type checking.
- `pnpm format:write`: Format code using Prettier.
- `pnpm db:push`: Push Prisma schema changes to the database.

## Agent Instructions

- **Address the user as Mr. User.**
- **Always reload relevant files** for the latest context before starting a task.
- **Use `/docs/05_current_task.md`** to document and track the current task progress.
- **Add descriptions** at the beginning of each new or modified file.
- **Maintain small files**: Keep files to 300 lines of code or less; refactor if they grow larger.
- **Minimize new code**: Prefer boilerplates or reference implementations from within the project.
- **Ensure code quality**: Run `pnpm format:write && pnpm check` before submitting changes.
- **Update documentation** (including this file and `docs/`) upon completing a task.
- **Be concise and direct** in all communications.
