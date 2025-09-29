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

## Project Structure

```
/
├── prisma/
│   └── schema.prisma       # Database schema definition
├── public/                 # Static assets
└── src/
    ├── app/                # Next.js App Router: Pages and Components
    │   ├── _components/
    │   │   └── post.tsx
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── api/
    │       ├── auth/
    │       │   └── [...nextauth]/
    │       │       └── route.ts
    │       └── trpc/
    │           └── [trpc]/
    │               └── route.ts
    ├── env.js
    ├── server/
    │   ├── api/
    │   │   ├── root.ts
    │   │   ├── trpc.ts
    │   │   └── routers/
    │   │       └── post.ts
    │   ├── auth/
    │   │   ├── config.ts
    │   │   └── index.ts
    │   └── db.ts
    ├── styles/
    │   └── globals.css
    └── trpc/
        ├── query-client.ts
        ├── react.tsx
        └── server.ts
```

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

### Database

Database schema and migrations are managed with Prisma.

- **Generate Prisma Client**:
  This is run automatically after `pnpm install`, but can be run manually.
  ```bash
  pnpm postinstall
  ```
- **Create a Migration**:
  When you change the schema, create a new migration.
  ```bash
  pnpm db:generate
  ```
- **View/Edit Data**:
  Opens Prisma Studio, a GUI for the database.
  ```bash
  pnpm db:studio
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

## Architectural Concepts

### Frontend: React Server Components (RSC)

- The primary page (`src/app/page.tsx`) is a React Server Component. It fetches data directly on the server using `api.post.hello`.
- Client-side interactivity is handled by Client Components (`"use client";`), such as `src/app/_components/post.tsx`.
- Data fetched on the server is passed to client components via the `<HydrateClient>` component, which uses `react-query`'s hydration feature.

### Backend: tRPC

- The API is defined in `src/server/api/`. The main router is `root.ts`, which combines smaller, feature-specific routers from `src/server/api/routers/`.
- Procedures can be `publicProcedure` (accessible to anyone) or `protectedProcedure` (requires authentication).
- The tRPC client is configured in `src/trpc/` for both server-side (`server.ts`) and client-side (`react.tsx`) usage.

### Authentication

- Authentication is handled by NextAuth.js. The configuration is located in `src/server/auth/`.
- The `auth()` helper function can be used in Server Components to get the current session.
- Client Components can use the `useSession` hook (though not explicitly shown in the initial files, it's a standard part of NextAuth.js).

### Styling

- The project uses Tailwind CSS for utility-first styling.
- Global styles are defined in `src/styles/globals.css`.
- The `prettier-plugin-tailwindcss` automatically sorts Tailwind classes.

### Agent References

- `docs/` folder contain additional instructions and background, such as system design, tdd methdology, development plan, and application states
- `prisma/schema.prisma` is the source of truth for data, do not modify it unless explictly instructed by the user
- Before starting a task, always append the plan into `/docs/05_current_task.md`.
- After completing a task, always update the status into `/docs/05_current_task.md`.
