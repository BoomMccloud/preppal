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
