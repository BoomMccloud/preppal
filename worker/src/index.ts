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
