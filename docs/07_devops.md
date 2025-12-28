# Preppal DevOps & Development Guide

This document provides a comprehensive guide for both local development and production deployment of the Preppal application.

---

## 1. Development Environment

### 1.1 Development Login Instructions

In development mode, you can log in using the following test accounts:

| Email              | Password | User Name  |
| ------------------ | -------- | ---------- |
| `dev1@preppal.com` | `dev123` | Dev User 1 |
| `dev2@preppal.com` | `dev123` | Dev User 2 |
| `dev3@preppal.com` | `dev123` | Dev User 3 |

**Notes:**
- The credentials provider is **only available in development mode** (`NODE_ENV=development`).
- Test users are automatically created in the database when they first log in.
- All test users have consistent data for predictable testing scenarios.

### 1.2 Completely Local Development Setup

To run the entire application locally (both web app and Cloudflare Worker):

#### 1. Start Local Tunnel for Web App Server
Since the Cloudflare Worker runs remotely, it needs to access your local web app server through a tunnel:
```bash
# Start ngrok to expose your local server (port 3000)
ngrok http 3000
```
Note the HTTPS URL provided by ngrok (e.g., `https://abcd1234.ngrok-free.app`).

#### 2. Configure Cloudflare Worker Environment
Update `worker/wrangler.toml` with your ngrok URL:
```toml
[vars]
NEXT_PUBLIC_API_URL = "https://abcd1234.ngrok-free.app"  # Your ngrok HTTPS URL
```
Redeploy the worker with the updated configuration:
```bash
cd worker
npx wrangler deploy
```

#### 3. Configure Local Web App Environment (`.env`)
Create or update your `.env` file with:
```bash
# Connection to your LOCAL Worker via ngrok tunnel
NEXT_PUBLIC_WORKER_URL="wss://abcd1234.ngrok-free.app"  # Same ngrok URL but with wss://

# Security Secrets (must match worker secrets)
JWT_SECRET="<same-secret-as-worker>"
WORKER_SHARED_SECRET="<same-secret-as-worker>"
AUTH_SECRET="<random-string-at-least-32-chars>"

# Database
DATABASE_URL="file:./db.sqlite"

# Gemini API Key
GEMINI_API_KEY="<your-gemini-api-key>"
```

#### 4. Prepare Local Database & Protocol Buffers
```bash
# Install dependencies
pnpm install

# Update database schema
pnpm db:push

# Seed database with test users
pnpm db:seed

# Generate Protocol Buffer files
pnpm proto:generate
```

#### 5. Run Services
In separate terminals:
```bash
# Terminal 1: Start Next.js development server
pnpm dev

# Terminal 2: Start Cloudflare Worker (if you want to run it locally instead of deployed version)
pnpm dev:worker
```

### 1.3 Troubleshooting (Development)
- If you see "Invalid URL" errors, verify your ngrok URL is correctly configured in both `.env` and `wrangler.toml`.
- If authentication fails, ensure `JWT_SECRET` matches between local `.env` and worker secrets.
- If worker can't reach your API, verify ngrok is running and the URL is accessible.

### 1.4 Resetting Test Data
```bash
# Reset database
pnpm db:push --force-reset

# Re-seed with test users
pnpm db:seed
```

---

## 2. Production Environment

This section outlines the infrastructure requirements and deployment strategy for moving Preppal to production.

### 2.1 System Architecture
Preppal consists of three main components:
1.  **Web Application (Next.js)**: Handles the UI, authentication, database interactions, and tRPC API.
2.  **Real-time Worker (Cloudflare Workers)**: Manages WebSocket connections and acts as a bridge to the Gemini Live API using Durable Objects.
3.  **Database**: Stores user data, session history, and feedback.

### 2.2 Infrastructure Requirements

#### A. Database
-   **Provider**: **Neon** (Serverless PostgreSQL).
-   **Setup**: Create a project on Neon.tech and use the provided Connection String as your `DATABASE_URL`.

#### B. Cloudflare Worker
-   **Plan**: Workers Paid plan is required for Durable Objects.
-   **Tooling**: `wrangler` CLI is used for deployment.

#### C. Web Application Hosting
-   **Platform**: **Vercel**.
-   **Configuration**: Connect GitHub repo; Vercel detects Next.js automatically.

#### D. External Services
-   **Google Gemini API**: API key with access to Gemini Live API.
-   **Google OAuth**: Client ID and Secret for "Sign in with Google".

### 2.3 Environment Variables

#### Web Application (Vercel)
| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Neon connection string. |
| `AUTH_SECRET` | Random 32+ character string. |
| `JWT_SECRET` | Must match Worker's `JWT_SECRET`. |
| `WORKER_SHARED_SECRET` | Must match Worker's secret. |
| `NEXT_PUBLIC_WORKER_URL` | Deployed Cloudflare Worker URL. |

#### Cloudflare Worker
| Variable | Description |
| :--- | :--- |
| `GEMINI_API_KEY` | API Key for Google Gemini Live API. |
| `JWT_SECRET` | Must match Web App's `JWT_SECRET`. |
| `WORKER_SHARED_SECRET` | Must match Web App's `WORKER_SHARED_SECRET`. |
| `NEXT_PUBLIC_API_URL` | Deployed Web Application URL. |

### 2.4 Deployment Strategy

1.  **Database**: Push schema to Neon using `pnpm prisma migrate deploy`.
2.  **Worker**: Navigate to `worker/`, set secrets via `wrangler secret put`, and deploy with `npx wrangler deploy --env production`.
3.  **Web App**: Push to GitHub, import to Vercel, configure env vars, and deploy.

### 2.5 CI/CD Recommendations
-   **Lint & Test**: Run on every PR.
-   **Database Check**: Ensure `prisma generate` succeeds.
-   **Production Release**: Automate DB migrations and deployments on merge to `main`.

### 2.6 Troubleshooting (Production)
-   **WebSocket Connection Fails**: Verify `NEXT_PUBLIC_WORKER_URL` and `JWT_SECRET` consistency.
-   **Database Errors**: Ensure `DATABASE_URL` is correct and migrations are applied.
-   **Auth Errors**: Verify `AUTH_SECRET` and OAuth credentials.

---

## 3. Private Docker Deployment

This section covers deploying the web application as a Docker container for private/self-hosted environments. This is an alternative to the Vercel deployment described above.

### 3.1 Prerequisites
-   **Container Runtime**: Podman or Docker installed.
-   **Database**: Neon PostgreSQL (or any PostgreSQL instance).
-   **Container Registry**: Access to push images (e.g., Docker Hub).
-   **Container Orchestration**: Dockge, Portainer, or similar for managing containers.

### 3.2 Building the Docker Image

The `NEXT_PUBLIC_WORKER_URL` must be provided at build time since it's baked into the Next.js client bundle. Additionally, since most production environments run on AMD64 architecture, you should specify the platform when building on Apple Silicon.

You can use the provided `pnpm` scripts:

```bash
# Build for AMD64 platform
pnpm podman:build

# Push to registry
pnpm podman:push
```

Or run the commands manually:

```bash
# Load NEXT_PUBLIC_WORKER_URL from .env and build for AMD64
podman build \
  --platform linux/amd64 \
  -f docker/Dockerfile \
  --build-arg NEXT_PUBLIC_WORKER_URL="$(grep NEXT_PUBLIC_WORKER_URL .env | cut -d '=' -f2 | tr -d '\"')" \
  -t docker.io/boommccloud/preppal:latest .
```

Or specify the URL directly:
```bash
podman build \
  --platform linux/amd64 \
  -f docker/Dockerfile \
  --build-arg NEXT_PUBLIC_WORKER_URL="wss://your-worker.your-domain.workers.dev" \
  -t docker.io/boommccloud/preppal:latest .
```

### 3.3 Pushing to Registry

```bash
podman push docker.io/boommccloud/preppal:latest
```

### 3.4 Runtime Environment Variables

When running the container (e.g., in Dockge), provide these environment variables:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Neon PostgreSQL connection string. |
| `AUTH_SECRET` | Random 32+ character string. |
| `JWT_SECRET` | Must match Worker's `JWT_SECRET`. |
| `WORKER_SHARED_SECRET` | Must match Worker's secret. |

**Note:** `NEXT_PUBLIC_WORKER_URL` is baked in at build time and does not need to be set at runtime.