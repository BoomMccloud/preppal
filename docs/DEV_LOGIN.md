# Development Login Instructions

This file provides login credentials for development and testing purposes.

## Development Users

In development mode, you can log in using the following test accounts:

| Email              | Password | User Name  |
| ------------------ | -------- | ---------- |
| `dev1@preppal.com` | `dev123` | Dev User 1 |
| `dev2@preppal.com` | `dev123` | Dev User 2 |
| `dev3@preppal.com` | `dev123` | Dev User 3 |

## Completely Local Development Setup

To run the entire application locally (both web app and Cloudflare Worker):

### 1. Start Local Tunnel for Web App Server

Since the Cloudflare Worker runs remotely, it needs to access your local web app server through a tunnel:

```bash
# Start ngrok to expose your local server (port 3000)
ngrok http 3000
```

Note the HTTPS URL provided by ngrok (e.g., `https://abcd1234.ngrok-free.app`).

### 2. Configure Cloudflare Worker Environment

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

### 3. Configure Local Web App Environment (`.env`)

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

### 4. Prepare Local Database & Protocol Buffers

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

### 5. Run Services

In separate terminals:

```bash
# Terminal 1: Start Next.js development server
pnpm dev

# Terminal 2: Start Cloudflare Worker (if you want to run it locally instead of deployed version)
pnpm dev:worker
```

### 6. How to Test

1. Open `http://localhost:3000`
2. Login with **Development Login** -> `dev1@preppal.com` / `dev123`
3. Go to **Dashboard** -> **New Interview**
4. Check browser console for WebSocket connection to your ngrok URL

**Troubleshooting:**

- If you see "Invalid URL" errors, verify your ngrok URL is correctly configured in both `.env` and `wrangler.toml`
- If authentication fails, ensure `JWT_SECRET` matches between local `.env` and worker secrets
- If worker can't reach your API, verify ngrok is running and the URL is accessible

## Notes

- The credentials provider is **only available in development mode** (`NODE_ENV=development`)
- Test users are automatically created in the database when they first log in
- All test users have consistent data for predictable testing scenarios

## Resetting Test Data

To reset the database with fresh test data:

```bash
# Reset database
pnpm db:push --force-reset

# Re-seed with test users
pnpm db:seed
```