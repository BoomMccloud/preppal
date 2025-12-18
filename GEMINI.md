no# Gemini Project Context: Preppal

This document provides a comprehensive overview of the "Preppal" project, its structure, and development conventions to be used as a guide for future interactions.

Preppal is an application that uses the Gemini Live API to help users practice interviews.

## Key Technologies

- **Framework**: [Next.js](https://nextjs.org/) (v15)
- **API**: [tRPC](https://trpc.io/) (v11)
- **ORM**: [Prisma](https://prisma.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (v5 Beta)
- **Database**: SQLite for now
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Linting**: [ESLint](https://eslint.org/)
- **Formatting**: [Prettier](https://prettier.io/)

## Architectural Concepts

This project is divided into several key architectural components. For more detailed information, please refer to the specific `agent.md` file in each directory.

- **[Frontend (`src/app`)](./src/app/agent.md)**: The frontend is built with Next.js and React Server Components. It handles the user interface and client-side interactions.

- **[Backend (`src/server/api`)](./src/server/api/agent.md)**: The backend is built with tRPC and provides a typesafe API for the frontend.

- **[Database (`prisma`)](./prisma/agent.md)**: The database schema is defined and managed with Prisma.

- **[Protocols (`proto`)](./proto/agent.md)**: This directory contains the protobuf definitions for the real-time communication between the client and server.

- **[Cloudflare Worker (`worker/`)](./worker/agent.md)**: The Cloudflare Worker handles real-time communication with the Gemini Live API and manages interview sessions.

## Agent Instructions

- Address the user as Mr. User
- Reload all files for the latest context
- Use /docs/05_current_task.md file document the current task
- Add descriptions at the beginning of each file
- Keep files to 300 lines of code or less, refactor if needed
- Use boiler plates or reference implementation whenever possible, minize the amount of new code
- when finishing a task, update the documentation
