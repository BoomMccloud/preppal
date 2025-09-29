# App Router Structure (Next.js)

This document details the frontend architecture of the Preppal application, which is built using the Next.js App Router.

## Planned App Router Structure

```
interview-app/
├── app/
│   │
│   # --- Root Layout and Public Pages ---
│   ├── layout.tsx                # Root layout (required)
│   ├── page.tsx                  # Home / Landing Page (/)
│   └── signin/
│       └── page.tsx              # Sign-in page (/signin)
│
│   # --- Protected App Pages (in a Route Group) ---
│   ├── (app)/
│   │   ├── layout.tsx            # Shared layout for protected app
│   │   ├── dashboard/
│   │   │   └── page.tsx          # (/dashboard)
│   │   ├── profile/
│   │   │   └── page.tsx          # (/profile)
│   │   ├── create-interview/
│   │   │   └── page.tsx          # (/create-interview)
│   │   └── interview/
│   │       └── [interviewId]/
│   │           ├── lobby/
│   │           │   └── page.tsx  # (/interview/[id]/lobby)
│   │           ├── session/
│   │           │   └── page.tsx  # (/interview/[id]/session)
│   │           └── feedback/
│   │               └── page.tsx  # (/interview/[id]/feedback)
│
│   # --- Legal Pages (in a Route Group) ---
│   ├── (legal)/
│   │   ├── terms/
│   │   │   └── page.tsx          # (/terms)
│   │   └── privacy/
│   │       └── page.tsx          # (/privacy)
│
│   # --- API Routes ---
│   └── api/
│       └── auth/
│           └── [...nextauth]/
│               └── route.ts      # NextAuth handler (now `route.ts`)
│
└── middleware.ts                 # Root middleware for route protection
```

### Core Files

- **`layout.tsx`**: This is the root layout of the application. It defines the global HTML structure, including `<html>` and `<body>` tags. It's used to wrap all pages and can provide a consistent header, footer, or sidebar.

- **`page.tsx`**: This is the main page of the application, rendered at the root URL (`/`). It serves as the user's dashboard and is a React Server Component (RSC), allowing it to fetch data directly on the server.

### Components (`_components/`)

- The `_components/` folder is a convention for storing components that are used within the `app` directory but are not themselves routes. The leading underscore prevents Next.js from treating the folder as a route segment.

- **`post.tsx`**: An example of a client component (`"use client";`) that handles user interaction. It demonstrates how to use tRPC hooks for client-side data fetching and mutations.

### API Routes (`api/`)

- This directory contains the API endpoints for the application.
  - **`auth/[...nextauth]/route.ts`**: This is the NextAuth.js route handler, which manages all authentication-related requests (e.g., sign-in, sign-out, session management).
  - **`trpc/[trpc]/route.ts`**: This is the tRPC route handler, which exposes the tRPC API to the client.

## React Server Components (RSC) vs. Client Components

- **Server Components**: The default in the App Router. They run on the server and can directly access server-side resources like the database. `page.tsx` is an example.
- **Client Components**: Opt-in with the `"use client";` directive. They are rendered on the client and can use React hooks like `useState` and `useEffect` for interactivity. `_components/post.tsx` is an example.

## Data Flow

1.  **Server-side**: The root `page.tsx` (RSC) can fetch initial data directly using the tRPC server client (`api.post.hello.query()`).
2.  **Hydration**: This server-fetched data is passed to client components. The `<HydrateClient>` component (in `src/trpc/react.tsx`) is used to hydrate the `react-query` cache on the client, making the data available without an additional client-side fetch.
3.  **Client-side**: Client components can then use tRPC's React Query hooks (e.g., `api.post.create.useMutation`) to fetch data or perform mutations on the client, providing a dynamic and interactive user experience.
