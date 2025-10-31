// ABOUTME: Cloudflare Worker entry point that routes HTTP/WebSocket requests to Durable Objects
// ABOUTME: Handles health checks and WebSocket upgrade for Gemini Live API sessions

export { GeminiSession } from './gemini-session';
import { validateJWT } from './auth';

export interface Env {
	GEMINI_SESSION: DurableObjectNamespace;
	JWT_SECRET: string;
	WORKER_SHARED_SECRET: string;
	GEMINI_API_KEY: string;
	NEXT_PUBLIC_API_URL: string;
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

		// WebSocket endpoint: /<interviewId>?token=<jwt>
		if (request.headers.get('Upgrade') === 'websocket') {
			// Extract interviewId from path (remove leading slash)
			const pathParts = url.pathname.split('/').filter((p) => p);
			if (pathParts.length !== 1) {
				return new Response('Invalid path. Expected: /<interviewId>?token=<jwt>', {
					status: 400,
				});
			}
			const interviewId = pathParts[0];

			// Extract and validate JWT from query parameter
			const token = url.searchParams.get('token');
			if (!token) {
				return new Response('Missing token parameter', { status: 401 });
			}

			try {
				const payload = await validateJWT(token, env.JWT_SECRET);

				// Verify the interviewId in the JWT matches the URL path
				if (payload.interviewId !== interviewId) {
					return new Response('Token interviewId does not match URL', {
						status: 403,
					});
				}

				// Create or get Durable Object instance using interviewId
				const id = env.GEMINI_SESSION.idFromName(interviewId);
				const stub = env.GEMINI_SESSION.get(id);

				// Forward the request to the Durable Object with user context
				const headers = new Headers(request.headers);
				headers.set('X-User-Id', payload.userId);
				headers.set('X-Interview-Id', payload.interviewId);

				const authenticatedRequest = new Request(request, { headers });
				return stub.fetch(authenticatedRequest);
			} catch (error) {
				console.error('Authentication failed:', error);
				return new Response(
					`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
					{ status: 401 },
				);
			}
		}

		return new Response('Not Found', { status: 404 });
	},
};
