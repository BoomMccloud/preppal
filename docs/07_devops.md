# Preppal Production Deployment & DevOps Guide

This document outlines the infrastructure requirements, configuration, and deployment strategy for moving "Preppal" from a local development environment to a production environment.

## 1. System Architecture

Preppal consists of three main components:

1.  **Web Application (Next.js)**: Handles the UI, authentication, database interactions, and tRPC API.
2.  **Real-time Worker (Cloudflare Workers)**: Manages WebSocket connections and acts as a bridge to the Gemini Live API using Durable Objects.
3.  **Database**: Stores user data, session history, and feedback.

## 2. Infrastructure Requirements

### A. Database
-   **Requirement**: PostgreSQL (Recommended) or MySQL.
-   **Note**: The project currently uses SQLite for development. For production, you must provision a robust database (e.g., AWS RDS, Supabase, Neon, or Vercel Postgres).
-   **Action**: Update `prisma/schema.prisma` `datasource` provider to `postgresql` (or your chosen provider) before building.

### B. Cloudflare Worker
-   **Requirement**: A Cloudflare account with Workers and Durable Objects enabled.
-   **Plan**: Paid plan (Workers Paid) is likely required for Durable Objects usage.
-   **Tooling**: `wrangler` CLI is used for deployment.

### C. Web Application Hosting
-   **Option 1 (Recommended)**: Vercel. Native support for Next.js, easy environment management.
-   **Option 2**: Docker. The application can be built into a container and deployed to AWS ECS, Google Cloud Run, or Kubernetes.
    -   *Build Command*: `pnpm build`
    -   *Start Command*: `pnpm start`

### D. External Services
-   **Google Gemini API**: An API key with access to the Gemini Live API.
-   **Google OAuth**: (Optional but recommended) Client ID and Secret for "Sign in with Google".

## 3. Environment Variables

### A. Web Application (Next.js)

These variables must be set in your web host (e.g., Vercel Project Settings or `.env.production`).

| Variable | Description | Required? |
| :--- | :--- | :--- |
| `DATABASE_URL` | Connection string for the production database (e.g., `postgresql://...`). | **Yes** |
| `AUTH_SECRET` | A random 32+ character string used by NextAuth to encrypt tokens. | **Yes** |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID. | Optional |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret. | Optional |
| `JWT_SECRET` | A random 32+ character string. **Must match the Worker's `JWT_SECRET`.** | **Yes** |
| `WORKER_SHARED_SECRET` | A random 32+ character string. **Must match the Worker's secret.** | **Yes** |
| `NEXT_PUBLIC_WORKER_URL` | The public URL of your deployed Cloudflare Worker (e.g., `https://preppal-worker.your-org.workers.dev`). | **Yes** |
| `NODE_ENV` | Set to `production`. | **Yes** |

### B. Cloudflare Worker

These secrets must be set in Cloudflare using `wrangler secret put <KEY>` or via the Cloudflare Dashboard.

| Variable | Description | Required? |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | API Key for Google Gemini Live API. | **Yes** |
| `JWT_SECRET` | **Must match the Web App's `JWT_SECRET`.** | **Yes** |
| `WORKER_SHARED_SECRET` | **Must match the Web App's `WORKER_SHARED_SECRET`.** | **Yes** |
| `NEXT_PUBLIC_API_URL` | The URL of your deployed Web Application (e.g., `https://preppal.com`). | **Yes** |

**Note**: `DEV_MODE` should be set to `"false"` (or omitted) in `wrangler.toml` for production.

## 4. Deployment Strategy

### Step 1: Database Migration
1.  Provision the production database (Postgres).
2.  Update `prisma/schema.prisma`: change `provider = "sqlite"` to `provider = "postgresql"`.
3.  Run the migration against the production database:
    ```bash
    DATABASE_URL="postgresql://user:pass@host:5432/db" pnpm prisma migrate deploy
    ```

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
5.  Note the **Worker URL** output by the deploy command. You will need this for the Web App configuration.

### Step 3: Deploy Web Application
1.  Configure the environment variables (from Section 3A) in your hosting platform (Vercel/AWS).
    -   Ensure `NEXT_PUBLIC_WORKER_URL` is set to the URL from Step 2.
2.  Trigger a build and deployment.
3.  Verify the application is running.

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
