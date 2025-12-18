# Preppal Production Deployment & DevOps Guide

This document outlines the infrastructure requirements, configuration, and deployment strategy for moving "Preppal" from a local development environment to a production environment.

## 1. System Architecture

Preppal consists of three main components:

1.  **Web Application (Next.js)**: Handles the UI, authentication, database interactions, and tRPC API.
2.  **Real-time Worker (Cloudflare Workers)**: Manages WebSocket connections and acts as a bridge to the Gemini Live API using Durable Objects.
3.  **Database**: Stores user data, session history, and feedback.

## 2. Infrastructure Requirements

### A. Database
-   **Selected Provider**: **Neon** (Serverless PostgreSQL).
-   **Action**:
    1.  Create a project on [Neon.tech](https://neon.tech).
    2.  Copy the **Connection String** (Pooled connection recommended for Serverless).
    3.  This string will be your `DATABASE_URL`.

### B. Cloudflare Worker
-   **Requirement**: A Cloudflare account with Workers and Durable Objects enabled.
-   **Plan**: Paid plan (Workers Paid) is likely required for Durable Objects usage.
-   **Tooling**: `wrangler` CLI is used for deployment.

### C. Web Application Hosting
-   **Selected Platform**: **Vercel**.
-   **Configuration**:
    -   Connect your GitHub repository to Vercel.
    -   Vercel automatically detects the Next.js framework.
    -   Add the Environment Variables (see Section 3) in the Vercel Project Settings.

### D. External Services
-   **Google Gemini API**: An API key with access to the Gemini Live API.
-   **Google OAuth**: (Optional but recommended) Client ID and Secret for "Sign in with Google".

## 3. Environment Variables

### A. Web Application (Vercel)

These variables must be set in your Vercel Project Settings.

| Variable | Description | Required? |
| :--- | :--- | :--- |
| `DATABASE_URL` | Your Neon connection string (e.g., `postgres://...`). | **Yes** |
| `AUTH_SECRET` | A random 32+ character string used by NextAuth to encrypt tokens. | **Yes** |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID. | Optional |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret. | Optional |
| `JWT_SECRET` | A random 32+ character string. **Must match the Worker's `JWT_SECRET`.** | **Yes** |
| `WORKER_SHARED_SECRET` | A random 32+ character string. **Must match the Worker's secret.** | **Yes** |
| `NEXT_PUBLIC_WORKER_URL` | The public URL of your deployed Cloudflare Worker (e.g., `https://preppal-worker.your-org.workers.dev`). | **Yes** |
| `NODE_ENV` | Set to `production` (Vercel sets this automatically). | **Yes** |

### B. Cloudflare Worker

These secrets must be set in Cloudflare using `wrangler secret put <KEY>` or via the Cloudflare Dashboard.

| Variable | Description | Required? |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | API Key for Google Gemini Live API. | **Yes** |
| `JWT_SECRET` | **Must match the Web App's `JWT_SECRET`.** | **Yes** |
| `WORKER_SHARED_SECRET` | **Must match the Web App's `WORKER_SHARED_SECRET`.** | **Yes** |
| `NEXT_PUBLIC_API_URL` | The URL of your deployed Web Application (e.g., `https://preppal.vercel.app`). | **Yes** |

**Note**: `DEV_MODE` should be set to `"false"` (or omitted) in `wrangler.toml` for production.

## 4. Deployment Strategy

### Step 1: Database Setup (Neon)
1.  Create a Neon project.
2.  Get your **Database URL**.
3.  **Local Migration**: Since you are still developing, you might want to run the migration from your local machine against the production DB *once* to set it up, or let the build pipeline handle it (advanced).
    -   *Easiest way*: Create a temporary `.env.production.local` file with `DATABASE_URL="your_neon_url"`.
    -   Run: `pnpm prisma migrate deploy` (This pushes the schema to Neon).

### Step 2: Deploy Cloudflare Worker
1.  Navigate to the `worker/` directory.
2.  Authenticate with Cloudflare: `npx wrangler login`.
3.  Set the secrets (one time setup):
    ```bash
    npx wrangler secret put GEMINI_API_KEY
    npx wrangler secret put JWT_SECRET
    npx wrangler secret put WORKER_SHARED_SECRET
    npx wrangler secret put NEXT_PUBLIC_API_URL
    ```
4.  Deploy the worker:
    ```bash
    npx wrangler deploy --env production
    ```
5.  Note the **Worker URL** output by the deploy command.

### Step 3: Deploy Web Application (Vercel)
1.  Push your code to GitHub (ensure `prisma/schema.prisma` has `provider = "postgresql"`).
2.  Import the repo in Vercel.
3.  Add the Environment Variables from Section 3A.
    -   **Crucial**: Set `NEXT_PUBLIC_WORKER_URL` to the URL from Step 2.
4.  Deploy.

## 5. CI/CD Recommendations (GitHub Actions)

For a robust pipeline, consider the following workflow:

1.  **Lint & Test**: Run `pnpm lint`, `pnpm format:check`, and `pnpm test` on every PR.
2.  **Database Check**: Ensure `prisma generate` runs successfully.
3.  **Preview Deployments**:
    -   Deploy a temporary Cloudflare Worker (using a PR-specific name).
    -   Deploy a Vercel Preview URL.
4.  **Production Release**:
    -   On merge to `main`:
        -   Apply DB migrations (`prisma migrate deploy`).
        -   Deploy Worker (`wrangler deploy`).
        -   Deploy Web App.

## 6. Troubleshooting

-   **WebSocket Connection Fails**: Check that `NEXT_PUBLIC_WORKER_URL` is correct and accessible. Ensure `JWT_SECRET` matches on both sides.
-   **Database Errors**: Verify `DATABASE_URL` is correct and the `prisma migrate deploy` command ran successfully.
-   **Auth Errors**: Verify `AUTH_SECRET` and OAuth credentials.
