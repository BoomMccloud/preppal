# Preppal

This is a full-stack web application built with the [T3 Stack](https://create.t3.gg/). It leverages Next.js for the frontend and backend, tRPC for typesafe API routes, Prisma as the ORM for database interactions, and NextAuth.js for authentication. The application is designed to facilitate live interview practice with AI.

## Core Technologies

- **Frontend**: Next.js (React)
- **Backend (Business Logic)**: Next.js (API Routes with tRPC)
- **Backend (Real-time)**: Cloudflare Workers with Durable Objects
- **Database**: SQLite (for MVP) with Prisma ORM
- **Real-time Communication**: WebSockets for the bi-directional audio stream
- **API (Non-real-time)**: tRPC for standard data fetching (user profiles, etc.)
- **Data Serialization**: Protocol Buffers (Protobufs) for all real-time audio data
- **Authentication**: NextAuth.js

## Component Breakdown

### Frontend (Client-Side)

- **Framework**: Built with Next.js and React.
- **Responsibilities**: User Interface, Authentication (NextAuth.js), Standard Data Fetching (tRPC), Real-time Communication (WebSocket for audio streaming, Protobuf encoding/decoding).

### Backend - Next.js (Business Logic Server)

- **Framework**: Hosted on Vercel as a standard Next.js application.
- **Responsibilities**: tRPC API (CRUD for user data), Database Management (via Prisma), Authentication (NextAuth.js).

### Backend - Cloudflare Worker (Real-time Server)

- **Framework**: Deployed on the Cloudflare Edge network.
- **Responsibilities**: WebSocket Server (manages interview sessions), Gemini Live API Client (proxies audio data), Data Handling (Protobuf encoding/decoding).

### Database

- **ORM**: Prisma.
- **Responsibilities**: Stores user profile information, and metadata about each interview session.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.