// ABOUTME: Durable Object managing individual Gemini Live API WebSocket sessions
// ABOUTME: Handles WebSocket connections, protobuf message processing, and user authentication

import type { Env } from './index';
import {
	decodeClientMessage,
	encodeServerMessage,
	createErrorResponse,
	createSessionEnded,
} from './messages';
import { preppal } from './lib/interview_pb.js';

export class GeminiSession implements DurableObject {
	private userId?: string;
	private interviewId?: string;

	constructor(
		private state: DurableObjectState,
		private env: Env,
	) {}

	async fetch(request: Request): Promise<Response> {
		// Handle WebSocket upgrade
		const upgradeHeader = request.headers.get('Upgrade');
		if (upgradeHeader !== 'websocket') {
			return new Response('Expected WebSocket', { status: 426 });
		}

		// Extract user context from headers (set by the main worker after JWT validation)
		this.userId = request.headers.get('X-User-Id') ?? undefined;
		this.interviewId = request.headers.get('X-Interview-Id') ?? undefined;

		if (!this.userId || !this.interviewId) {
			return new Response('Missing authentication context', { status: 401 });
		}

		console.log(
			`WebSocket connection request for user ${this.userId}, interview ${this.interviewId}`,
		);

		// Create WebSocket pair
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		// Accept the WebSocket connection
		server.accept();

		// Handle messages
		server.addEventListener('message', async (event: MessageEvent) => {
			try {
				if (event.data instanceof ArrayBuffer) {
					await this.handleBinaryMessage(server, event.data);
				} else {
					console.warn('Received non-binary message, ignoring');
				}
			} catch (error) {
				console.error('Error handling message:', error);
				const errorMsg = createErrorResponse(
					5000,
					'Internal error processing message',
				);
				server.send(encodeServerMessage(errorMsg));
			}
		});

		server.addEventListener('close', () => {
			console.log(`WebSocket closed for interview ${this.interviewId}`);
		});

		server.addEventListener('error', (event: ErrorEvent) => {
			console.error(`WebSocket error for interview ${this.interviewId}:`, event);
		});

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	private async handleBinaryMessage(
		ws: WebSocket,
		buffer: ArrayBuffer,
	): Promise<void> {
		const message = decodeClientMessage(buffer);

		if (message.audioChunk) {
			await this.handleAudioChunk(ws, message.audioChunk);
		} else if (message.endRequest) {
			await this.handleEndRequest(ws);
		} else {
			console.warn('Received unknown message type');
		}
	}

	private async handleAudioChunk(
		ws: WebSocket,
		audioChunk: preppal.IAudioChunk,
	): Promise<void> {
		console.log(
			`Received audio chunk: ${audioChunk.audioContent?.length ?? 0} bytes`,
		);
		// Phase 1: Just log the audio chunk
		// Phase 2 will implement Gemini Live API integration
	}

	private async handleEndRequest(ws: WebSocket): Promise<void> {
		console.log(`Received end request for interview ${this.interviewId}`);

		// Send session ended message
		const endedMsg = createSessionEnded(
			preppal.SessionEnded.Reason.USER_INITIATED,
		);
		ws.send(encodeServerMessage(endedMsg));

		// Close the WebSocket
		ws.close(1000, 'Interview ended by user');
	}
}
