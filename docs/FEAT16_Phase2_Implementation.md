# FEAT16 Phase 2: Cloudflare Worker Implementation Guide

## Overview

This guide provides detailed, step-by-step instructions for implementing the Cloudflare Worker that connects the Next.js backend to the Gemini Live API. This is designed for developers who may be new to Cloudflare Workers or real-time audio streaming.

**Prerequisites:**
- ✅ Phase 1 complete (Next.js API implemented and tested)
- ✅ Basic understanding of WebSockets
- ✅ Familiarity with TypeScript
- ✅ Node.js and pnpm installed

---

## Implementation Phases

### Phase 0: Boilerplate Setup & Verification
**Goal:** Get a working Cloudflare Worker with Durable Objects running locally before adding any features.

### Phase 1: WebSocket Basics
**Goal:** Handle WebSocket connections and protobuf messages without Gemini integration.

### Phase 2: Gemini Live API Integration
**Goal:** Connect to Gemini Live API and implement the full audio pipeline.

### Phase 3: State Management & Error Handling
**Goal:** Implement interview status updates, transcript handling, and robust error handling.

### Phase 4: Testing & Deployment
**Goal:** Comprehensive testing with miniflare and deployment to Cloudflare.

---

## Phase 0: Boilerplate Setup & Verification ✅ COMPLETED

### Objective
Create a minimal, working Cloudflare Worker with Durable Objects that we can verify locally before adding complexity.

### Step 0.1: Install Wrangler CLI ✅

```bash
pnpm add -D wrangler
```

**Completed:** Installed `wrangler@4.45.3` and `@cloudflare/workers-types@4.20251014.0`

### Step 0.2: Initialize Worker Project ✅

Created `worker/` directory structure manually (no `wrangler init` needed):

```
worker/
├── src/
│   ├── index.ts           # Main worker entry point
│   └── gemini-session.ts  # Durable Object implementation
├── tsconfig.json          # TypeScript configuration
├── wrangler.toml          # Cloudflare configuration
└── test-ws.ts            # WebSocket test client
```

### Step 0.3: Configure Durable Objects ✅

Created `worker/wrangler.toml`:

```toml
name = "preppal-worker"
main = "src/index.ts"
compatibility_date = "2024-10-01"

# Durable Objects configuration
[[durable_objects.bindings]]
name = "GEMINI_SESSION"
class_name = "GeminiSession"

# Migrations for Durable Objects
[[migrations]]
tag = "v1"
new_classes = ["GeminiSession"]
```

**Note:** Using `GEMINI_SESSION` binding name and `GeminiSession` class name (not `INTERVIEW_SESSION`/`InterviewSession`).

### Step 0.4: Create Minimal Working Boilerplate ✅

**Created `worker/src/index.ts`:**

```typescript
// ABOUTME: Cloudflare Worker entry point that routes HTTP/WebSocket requests to Durable Objects
// ABOUTME: Handles health checks and WebSocket upgrade for Gemini Live API sessions

export { GeminiSession } from './gemini-session';

interface Env {
	GEMINI_SESSION: DurableObjectNamespace;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// Health check endpoint
		if (url.pathname === '/health') {
			return new Response(JSON.stringify({ status: 'ok' }), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// WebSocket endpoint
		if (url.pathname === '/ws') {
			// Upgrade to WebSocket
			if (request.headers.get('Upgrade') !== 'websocket') {
				return new Response('Expected WebSocket', { status: 426 });
			}

			// Create or get Durable Object instance
			// For now, use a simple ID - we'll add proper session management later
			const id = env.GEMINI_SESSION.idFromName('test-session');
			const stub = env.GEMINI_SESSION.get(id);

			// Forward the request to the Durable Object
			return stub.fetch(request);
		}

		return new Response('Not Found', { status: 404 });
	},
};
```

**Created `worker/src/gemini-session.ts`:**

```typescript
// ABOUTME: Durable Object managing individual Gemini Live API WebSocket sessions
// ABOUTME: Handles WebSocket connections with simple echo functionality for Phase 0 testing

export class GeminiSession implements DurableObject {
	constructor(
		private state: DurableObjectState,
		private env: Record<string, unknown>,
	) {}

	async fetch(request: Request): Promise<Response> {
		// Handle WebSocket upgrade
		const upgradeHeader = request.headers.get('Upgrade');
		if (upgradeHeader !== 'websocket') {
			return new Response('Expected WebSocket', { status: 426 });
		}

		// Create WebSocket pair
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		// Accept the WebSocket connection
		server.accept();

		// Handle messages - echo back for now
		server.addEventListener('message', (event: MessageEvent) => {
			const message = event.data;
			console.log('Received message:', message);

			// Echo the message back
			server.send(`Echo: ${message}`);
		});

		server.addEventListener('close', () => {
			console.log('WebSocket closed');
		});

		server.addEventListener('error', (event: ErrorEvent) => {
			console.error('WebSocket error:', event.error);
		});

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}
}
```

**Created `worker/tsconfig.json`:**

```json
{
	"compilerOptions": {
		"target": "ES2020",
		"module": "ES2020",
		"lib": ["ES2020"],
		"types": ["@cloudflare/workers-types"],
		"strict": true,
		"esModuleInterop": true,
		"skipLibCheck": true,
		"moduleResolution": "node",
		"resolveJsonModule": true,
		"isolatedModules": true,
		"noEmit": true
	},
	"include": ["src/**/*"],
	"exclude": ["node_modules"]
}
```

**Created `worker/test-ws.ts`:**

```typescript
// ABOUTME: Simple WebSocket client for testing the Worker's echo functionality
// ABOUTME: Connects to local Worker and sends test messages to verify basic WebSocket handling

import { WebSocket } from 'ws';

const ws = new WebSocket('ws://localhost:8787/ws');

ws.on('open', () => {
	console.log('✓ WebSocket connected');
	ws.send('Hello from test client!');
});

ws.on('message', (data) => {
	console.log('✓ Received:', data.toString());
	ws.close();
});

ws.on('close', () => {
	console.log('✓ WebSocket closed');
	process.exit(0);
});

ws.on('error', (error) => {
	console.error('✗ WebSocket error:', error);
	process.exit(1);
});
```

**Updated root `package.json`:**

Added script:
```json
"dev:worker": "wrangler dev --config worker/wrangler.toml"
```

**Updated `.gitignore`:**

Added:
```
# wrangler
.wrangler/
.dev.vars
```

### Step 0.5: Test Locally ✅

**Started dev server:**
```bash
pnpm dev:worker
# Worker running on http://localhost:8787
```

**Tested health endpoint:**
```bash
curl http://localhost:8787/health
# Response: {"status":"ok"} ✓
```

**Tested WebSocket connection:**
```bash
pnpm tsx worker/test-ws.ts
# Output:
# ✓ WebSocket connected
# ✓ Received: Echo: Hello from test client!
# ✓ WebSocket closed
```

**✅ Checkpoint:** Phase 0 is complete! Worker is running, health check works, and WebSocket echo functionality is verified.

---

## Phase 1: WebSocket Basics & Authentication

### Objective
Implement JWT authentication, protobuf message handling, and basic client-server communication.

### Step 1.1: Install Dependencies

In the `worker` directory:

```bash
pnpm add jose @google/generative-ai
pnpm add -D @types/node vitest miniflare
```

**Dependencies:**
- `jose`: JWT validation (Worker-compatible)
- `@google/generative-ai`: Gemini API SDK
- `vitest`: Testing framework
- `miniflare`: Local Durable Objects testing

### Step 1.2: Set Up Protobuf for Worker

The worker needs to decode/encode the protobuf messages defined in `/proto/interview.proto`.

**Option A: Generate TypeScript from Proto (Recommended)**

Add to root `package.json` scripts if not already there:
```json
{
  "scripts": {
    "proto:generate": "pbjs -t static-module -w commonjs -o src/lib/interview_pb.js proto/interview.proto && pbts -o src/lib/interview_pb.d.ts src/lib/interview_pb.js"
  }
}
```

Run generation:
```bash
cd .. # Back to project root
pnpm proto:generate
```

Copy generated files to worker:
```bash
mkdir -p worker/src/lib
cp src/lib/interview_pb.* worker/src/lib/
```

### Step 1.3: Add Environment Variables

Create `worker/.dev.vars` for local development (this file should be in `.gitignore`):

```
JWT_SECRET=your-test-jwt-secret-min-32-chars-long
WORKER_SHARED_SECRET=your-test-worker-secret-min-32-chars
GEMINI_API_KEY=your-gemini-api-key-here
NEXT_PUBLIC_API_URL=http://localhost:3000
```

For production, these will be set via `wrangler secret put`.

Update `worker/wrangler.toml` to reference environment variables:

```toml
# ... existing config ...

[vars]
NEXT_PUBLIC_API_URL = "http://localhost:3000"

# Note: Secrets (JWT_SECRET, WORKER_SHARED_SECRET, GEMINI_API_KEY)
# are loaded from .dev.vars locally and must be set via
# `wrangler secret put <NAME>` for production
```

### Step 1.4: Implement JWT Authentication

Create `worker/src/auth.ts`:

```typescript
import { jwtVerify } from 'jose';

export interface JWTPayload {
  userId: string;
  interviewId: string;
  iat: number;
  exp: number;
}

/**
 * Validates a JWT token and returns the decoded payload
 * @throws Error if token is invalid or expired
 */
export async function validateJWT(
  token: string,
  secret: string
): Promise<JWTPayload> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    return payload as JWTPayload;
  } catch (error) {
    throw new Error(`JWT validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### Step 1.5: Implement Protobuf Message Handling

Create `worker/src/messages.ts`:

```typescript
import {
  ClientToServerMessage,
  ServerToClientMessage,
  SessionEnded
} from './lib/interview_pb';

/**
 * Decodes a binary message from the client
 */
export function decodeClientMessage(buffer: ArrayBuffer): ClientToServerMessage {
  const uint8Array = new Uint8Array(buffer);
  return ClientToServerMessage.decode(uint8Array);
}

/**
 * Encodes a server message to binary for sending to client
 */
export function encodeServerMessage(message: ServerToClientMessage): Uint8Array {
  return ServerToClientMessage.encode(message).finish();
}

/**
 * Helper to create a SessionEnded message
 */
export function createSessionEndedMessage(
  reason: SessionEnded.Reason,
  message: string
): ServerToClientMessage {
  return ServerToClientMessage.create({
    sessionEnded: SessionEnded.create({
      reason,
      message,
    }),
  });
}

/**
 * Helper to create an Error message
 */
export function createErrorMessage(code: number, message: string): ServerToClientMessage {
  return ServerToClientMessage.create({
    error: {
      code,
      message,
    },
  });
}
```

### Step 1.6: Update Durable Object with Authentication

Update `worker/src/index.ts` to add authentication:

```typescript
import { validateJWT } from './auth';
import { decodeClientMessage, encodeServerMessage, createErrorMessage } from './messages';

export interface Env {
  INTERVIEW_SESSION: DurableObjectNamespace;
  JWT_SECRET: string;
  WORKER_SHARED_SECRET: string;
  GEMINI_API_KEY: string;
  NEXT_PUBLIC_API_URL: string;
}

// ... (keep existing worker export default) ...

export class InterviewSession implements DurableObject {
  private authenticated = false;
  private interviewId: string | null = null;
  private userId: string | null = null;

  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      const url = new URL(request.url);
      const token = url.searchParams.get('token');

      if (!token) {
        return new Response('Missing JWT token', { status: 401 });
      }

      // Validate JWT before accepting connection
      try {
        const payload = await validateJWT(token, this.env.JWT_SECRET);
        this.userId = payload.userId;
        this.interviewId = payload.interviewId;
        this.authenticated = true;
      } catch (error) {
        console.error('JWT validation failed:', error);
        return new Response('Invalid or expired token', { status: 401 });
      }

      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      this.handleWebSocket(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response('Expected WebSocket', { status: 400 });
  }

  private handleWebSocket(webSocket: WebSocket) {
    webSocket.accept();

    console.log(`WebSocket connected for interview: ${this.interviewId}`);

    webSocket.addEventListener('message', async (event) => {
      try {
        // Decode protobuf message
        const clientMessage = decodeClientMessage(event.data as ArrayBuffer);

        // Handle different message types
        if (clientMessage.audioChunk) {
          console.log('Received audio chunk:', clientMessage.audioChunk.audioContent.length, 'bytes');
          // TODO: Forward to Gemini in Phase 2
        } else if (clientMessage.endRequest) {
          console.log('End request received');
          // TODO: Implement graceful shutdown in Phase 3
          webSocket.close(1000, 'Interview ended by user');
        } else if (clientMessage.startRequest) {
          console.log('Start request received (deprecated - auth is via JWT)');
        }
      } catch (error) {
        console.error('Error processing message:', error);
        const errorMsg = createErrorMessage(5000, 'Failed to process message');
        webSocket.send(encodeServerMessage(errorMsg));
      }
    });

    webSocket.addEventListener('close', (event) => {
      console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
      // TODO: Cleanup in Phase 3
    });

    webSocket.addEventListener('error', (event) => {
      console.error('WebSocket error:', event);
    });
  }
}
```

### Step 1.7: Test Authentication

**Write a test** in `worker/src/index.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';

describe('Worker Authentication', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  it('should reject connection without JWT', async () => {
    const resp = await worker.fetch('http://localhost/ws/test-123');
    expect(resp.status).toBe(401);
  });

  // TODO: Add test with valid JWT
});
```

Add test script to `worker/package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "dev": "wrangler dev"
  }
}
```

Run tests:
```bash
cd worker
pnpm test
```

**✅ Checkpoint:** Tests pass, and the worker can validate JWTs and decode protobuf messages.

---

## Phase 2: Gemini Live API Integration

### Objective
Connect to the Gemini Live API and implement bidirectional audio streaming.

### Step 2.1: Review Gemini Live API Documentation

**STOP HERE AND ASK JESSE:**

The Gemini Live API guide (https://ai.google.dev/gemini-api/docs/live-guide) has multiple implementation patterns. Before proceeding, we need to decide:

1. Which audio format approach to use?
2. How to handle the connection lifecycle?
3. Which features to implement (audio only, or text transcription too)?

**Questions for Jesse:**
- Should we implement audio-only or include real-time transcription?
- Do we need to handle Gemini's function calling features?
- Any specific configuration or model preferences?

### Step 2.2: Implement Gemini Connection (TO BE DETAILED AFTER JESSE'S INPUT)

This section will be filled in based on the chosen approach from the Gemini Live API guide.

**Placeholder structure:**

Create `worker/src/gemini.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiSession {
  private client: any; // TODO: Type based on chosen approach

  constructor(apiKey: string) {
    // TODO: Initialize based on Jesse's input
  }

  async connect(): Promise<void> {
    // TODO: Implement connection
  }

  async sendAudio(audioData: Uint8Array): Promise<void> {
    // TODO: Implement audio sending
  }

  onTranscript(callback: (text: string, speaker: 'USER' | 'AI') => void): void {
    // TODO: Implement transcript handling
  }

  onAudio(callback: (audioData: Uint8Array) => void): void {
    // TODO: Implement audio response handling
  }

  async disconnect(): Promise<void> {
    // TODO: Implement graceful disconnect
  }
}
```

---

## Phase 3: State Management & Error Handling

### Objective
Implement interview status updates, proper error handling, and session lifecycle management.

### Step 3.1: Implement Next.js API Client

Create `worker/src/api-client.ts`:

```typescript
/**
 * Client for calling Next.js tRPC endpoints from the Worker
 */
export class NextApiClient {
  constructor(
    private baseUrl: string,
    private sharedSecret: string
  ) {}

  /**
   * Updates interview status in the database
   */
  async updateStatus(
    interviewId: string,
    status: 'IN_PROGRESS' | 'COMPLETED' | 'ERROR',
    endedAt?: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/trpc/interview.updateStatus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.sharedSecret}`,
      },
      body: JSON.stringify({
        interviewId,
        status,
        endedAt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update status: ${response.statusText}`);
    }
  }

  /**
   * Submits completed transcript to the database
   */
  async submitTranscript(
    interviewId: string,
    transcript: Array<{
      speaker: 'USER' | 'AI';
      content: string;
      timestamp: string;
    }>,
    endedAt: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/trpc/interview.submitTranscript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.sharedSecret}`,
      },
      body: JSON.stringify({
        interviewId,
        transcript,
        endedAt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit transcript: ${response.statusText}`);
    }
  }
}
```

**Note:** tRPC batch format might be different - verify with actual tRPC client behavior.

### Step 3.2: Implement Session Lifecycle

Update `InterviewSession` in `worker/src/index.ts` to manage state:

```typescript
export class InterviewSession implements DurableObject {
  private authenticated = false;
  private interviewId: string | null = null;
  private userId: string | null = null;
  private apiClient: NextApiClient | null = null;
  private geminiSession: GeminiSession | null = null;
  private sessionStartTime: Date | null = null;

  // ... existing constructor ...

  private async handleWebSocket(webSocket: WebSocket) {
    webSocket.accept();

    // Initialize API client
    this.apiClient = new NextApiClient(
      this.env.NEXT_PUBLIC_API_URL,
      this.env.WORKER_SHARED_SECRET
    );

    try {
      // Connect to Gemini
      this.geminiSession = new GeminiSession(this.env.GEMINI_API_KEY);
      await this.geminiSession.connect();

      // Update status to IN_PROGRESS
      await this.apiClient.updateStatus(this.interviewId!, 'IN_PROGRESS');
      this.sessionStartTime = new Date();

      console.log(`Interview ${this.interviewId} started`);

      // Handle messages (as implemented in Phase 1)
      // ...

    } catch (error) {
      console.error('Failed to start interview:', error);

      // Update status to ERROR
      await this.apiClient?.updateStatus(this.interviewId!, 'ERROR', new Date().toISOString());

      // Close connection with error
      webSocket.close(4002, 'Failed to connect to AI service');
    }
  }

  private async handleEndInterview() {
    if (!this.apiClient || !this.interviewId) return;

    try {
      // TODO: Get transcript from Gemini (Phase 2)
      const transcript: Array<any> = [];

      // Submit transcript and mark as complete
      await this.apiClient.submitTranscript(
        this.interviewId,
        transcript,
        new Date().toISOString()
      );

      console.log(`Interview ${this.interviewId} completed successfully`);
    } catch (error) {
      console.error('Failed to submit transcript:', error);

      // At least try to mark as completed
      await this.apiClient.updateStatus(
        this.interviewId,
        'ERROR',
        new Date().toISOString()
      );
    }
  }
}
```

### Step 3.3: Add Timeout Handling

Cloudflare Workers have execution time limits. For the 1-hour session timeout:

```typescript
export class InterviewSession implements DurableObject {
  private sessionTimeout: NodeJS.Timeout | null = null;

  private async handleWebSocket(webSocket: WebSocket) {
    // ... existing connection code ...

    // Set 1-hour timeout
    this.sessionTimeout = setTimeout(async () => {
      console.log(`Session timeout for interview ${this.interviewId}`);
      await this.handleEndInterview();
      webSocket.close(1000, 'Session timeout (1 hour limit)');
    }, 60 * 60 * 1000); // 1 hour

    // ... rest of WebSocket handling ...
  }

  private clearTimeout() {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
  }
}
```

**Note:** Durable Objects can use alarms for more reliable scheduled work, but we're keeping it simple for now.

---

## Phase 4: Testing & Deployment

### Objective
Comprehensive testing and production deployment.

### Step 4.1: Write Integration Tests

Create `worker/src/integration.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';
import jwt from 'jsonwebtoken';

describe('Interview Session Integration', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should accept WebSocket connection with valid JWT', async () => {
    // Generate valid JWT
    const token = jwt.sign(
      { userId: 'test-user', interviewId: 'test-interview' },
      'test-secret',
      { algorithm: 'HS256', expiresIn: '5m' }
    );

    // TODO: Test WebSocket connection
    // This requires WebSocket testing utilities
  });

  // TODO: More integration tests
});
```

### Step 4.2: Manual Testing Checklist

Create `worker/TESTING.md`:

```markdown
# Manual Testing Checklist

## Prerequisites
- [ ] Next.js backend running on localhost:3000
- [ ] Phase 1 procedures tested and working
- [ ] Valid JWT_SECRET and WORKER_SHARED_SECRET in .dev.vars
- [ ] Gemini API key configured

## Test Scenarios

### 1. Authentication
- [ ] Connection rejected without token
- [ ] Connection rejected with invalid token
- [ ] Connection rejected with expired token
- [ ] Connection accepted with valid token

### 2. Audio Streaming
- [ ] Client can send audio chunks
- [ ] Audio chunks are forwarded to Gemini
- [ ] AI audio responses are received
- [ ] AI audio is sent back to client

### 3. Status Updates
- [ ] Interview status updates to IN_PROGRESS on connection
- [ ] Interview status updates to COMPLETED on normal end
- [ ] Interview status updates to ERROR on failure

### 4. Error Handling
- [ ] Gemini connection failure handled gracefully
- [ ] Network errors don't crash the worker
- [ ] Client receives proper error messages
- [ ] Partial transcripts saved on error

### 5. Session End
- [ ] User-initiated end works
- [ ] Transcript is submitted correctly
- [ ] WebSocket closes gracefully
```

### Step 4.3: Deploy to Cloudflare

First, set production secrets:

```bash
cd worker
pnpm wrangler secret put JWT_SECRET
# Enter secret when prompted

pnpm wrangler secret put WORKER_SHARED_SECRET
# Enter secret when prompted

pnpm wrangler secret put GEMINI_API_KEY
# Enter API key when prompted
```

Deploy:

```bash
pnpm wrangler deploy
```

Update Next.js environment variable with worker URL:
```
NEXT_PUBLIC_WORKER_URL=https://preppal-worker.your-domain.workers.dev
```

---

## Next Steps After Phase 4

1. **Update documentation** with actual worker URL
2. **Update FEAT17** client to connect to production worker
3. **E2E testing** with Playwright
4. **Monitoring & logging** setup
5. **Performance optimization**

---

## Troubleshooting Guide

### Common Issues

**Issue: "nodejs_compat flag not working"**
- Solution: Check compatibility_date in wrangler.toml is recent
- Ensure flag is in compatibility_flags array

**Issue: "Durable Object not found"**
- Solution: Run migrations with `wrangler deploy`
- Check binding name matches in wrangler.toml

**Issue: "Can't import protobuf files"**
- Solution: Verify proto:generate ran successfully
- Check file paths in imports

**Issue: "JWT validation fails locally"**
- Solution: Ensure .dev.vars has correct JWT_SECRET
- Verify secret matches what Next.js uses

**Issue: "Gemini API connection fails"**
- Solution: Check API key is valid
- Verify nodejs_compat is enabled
- Review Gemini API quota/rate limits

---

## Reference Links

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Durable Objects Guide](https://developers.cloudflare.com/durable-objects/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Gemini Live API Guide](https://ai.google.dev/gemini-api/docs/live-guide)
- [FEAT16 Main Spec](./FEAT16_Cloudflare_Gemini.md)
- [FEAT17 Client Audio Spec](./FEAT17_client_audio.spec.md)
