# Gemini Project Context: Preppal

This document provides a comprehensive overview of the "Preppal" project, its structure, and development conventions to be used as a guide for future interactions.

## Project Overview

This is a full-stack web application built with the [T3 Stack](https://create.t3.gg/). It leverages Next.js for the frontend and backend, tRPC for typesafe API routes, Prisma as the ORM for database interactions, and NextAuth.js for authentication. The database is configured to use SQLite.

## Key Technologies

- **Framework**: [Next.js](https://nextjs.org/) (v15)
- **API**: [tRPC](https://trpc.io/) (v11)
- **ORM**: [Prisma](https://prisma.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (v5 Beta)
- **Database**: SQLite
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Linting**: [ESLint](https://eslint.org/)
- **Formatting**: [Prettier](https://prettier.io/)

## Architectural Concepts

This project is divided into several key architectural components. For more detailed information, please refer to the specific `GEMINI.md` file in each directory.

- **[Frontend (`src/app`)](./src/app/GEMINI.md)**: The frontend is built with Next.js and React Server Components. It handles the user interface and client-side interactions.

- **[Backend (`src/server/api`)](./src/server/api/GEMINI.md)**: The backend is built with tRPC and provides a typesafe API for the frontend.

- **[Database (`prisma`)](./prisma/GEMINI.md)**: The database schema is defined and managed with Prisma.

- **[Protocols (`proto`)](./proto/GEMINI.md)**: This directory contains the protobuf definitions for the real-time communication between the client and server.


## Development

### Getting Started

1.  **Install dependencies**:
    ```bash
    pnpm install
    ```
2.  **Set up environment variables**:
    Copy `.env.example` to `.env` and provide the necessary values, especially for `DATABASE_URL` and NextAuth.js.
    ```bash
    cp .env.example .env
    ```
3.  **Apply database schema**:
    This will create the SQLite database file and apply the schema from `prisma/schema.prisma`.
    ```bash
    pnpm db:push
    ```

### Running the Application

- **Development Server**:
  Starts the Next.js development server with Fast Refresh.
  ```bash
  pnpm dev
  ```
- **Production Build**:
  Creates an optimized production build.
  ```bash
  pnpm build
  ```
- **Run Production Server**:
  Starts the application from the production build.
  ```bash
  pnpm start
  ```

### Code Quality

- **Linting**:
  Check for code style and potential errors.
  ```bash
  pnpm lint
  ```
- **Type Checking**:
  Run the TypeScript compiler to check for type errors.
  ```bash
  pnpm typecheck
  ```
- **Formatting**:
  Automatically format code with Prettier.
  ```bash
  pnpm format:write
  ```

### Agent References

- `docs/` folder contain additional instructions and background, such as system design, tdd methdology, development plan, and application states
- `prisma/schema.prisma` is the source of truth for data, do not modify it unless explictly instructed by the user
- Before starting a task, always append the plan into `/docs/05_current_task.md`.
- After completing a task, always update the status into `/docs/05_current_task.md`.