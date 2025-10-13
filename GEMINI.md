# Gemini Project Context: Preppal

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

This project is divided into several key architectural components. For more detailed information, please refer to the specific `GEMINI.md` file in each directory.

- **[Frontend (`src/app`)](./src/app/GEMINI.md)**: The frontend is built with Next.js and React Server Components. It handles the user interface and client-side interactions.

- **[Backend (`src/server/api`)](./src/server/api/GEMINI.md)**: The backend is built with tRPC and provides a typesafe API for the frontend.

- **[Database (`prisma`)](./prisma/GEMINI.md)**: The database schema is defined and managed with Prisma.

- **[Protocols (`proto`)](./proto/GEMINI.md)**: This directory contains the protobuf definitions for the real-time communication between the client and server.

## Agent Instructions 
- **Always** reload all files for the latest context
- **Always** ask for explict instructions before coding
- **