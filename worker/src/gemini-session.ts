// ABOUTME: Durable Object managing individual Gemini Live API WebSocket sessions
// ABOUTME: Handles WebSocket connections, protobuf message processing, and user authentication

import type { Env } from './index';
import {
	decodeClientMessage,
	encodeServerMessage,
	createErrorResponse,
	createSessionEnded,
	createTranscriptUpdate,
	createAudioResponse,
} from './messages';
import { preppal } from './lib/interview_pb.js';
import { AudioConverter } from './audio-converter';
import { TranscriptManager } from './transcript-manager';
import { GoogleGenAI, Modality } from '@google/genai';

export class GeminiSession implements DurableObject {
	private userId?: string;
	private interviewId?: string;
	private transcriptManager: TranscriptManager;
	private geminiSession: any;

	constructor(
		private state: DurableObjectState,
		private env: Env,
	) {
		this.transcriptManager = new TranscriptManager();
	}

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

		// Initialize Gemini connection
		try {
			await this.initializeGemini(server);
		} catch (error) {
			console.error('Failed to initialize Gemini:', error);
			const errorMsg = createErrorResponse(
				4002,
				'Failed to connect to AI service',
			);
			server.send(encodeServerMessage(errorMsg));
			server.close(4002, 'Failed to connect to AI service');
			return new Response(null, {
				status: 101,
				webSocket: client,
			});
		}

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
			this.cleanup();
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
		const audioContent = audioChunk.audioContent;
		if (!audioContent || audioContent.length === 0) {
			console.warn('Received empty audio chunk');
			return;
		}

		console.log(`Received audio chunk: ${audioContent.length} bytes`);

		// Convert binary audio to base64 for Gemini
		const base64Audio = AudioConverter.binaryToBase64(
			new Uint8Array(audioContent),
		);

		// Send to Gemini (will be implemented when we add Gemini connection)
		if (this.geminiSession) {
			this.geminiSession.sendRealtimeInput({
				audio: {
					data: base64Audio,
					mimeType: 'audio/pcm;rate=16000',
				},
			});
		} else {
			console.warn('Gemini session not initialized, audio chunk dropped');
		}
	}

	private async handleEndRequest(ws: WebSocket): Promise<void> {
		console.log(`Received end request for interview ${this.interviewId}`);

		// Close Gemini connection if exists
		if (this.geminiSession) {
			this.geminiSession.close();
		}

		// TODO Phase 3: Submit transcript to Next.js API
		// const transcript = this.transcriptManager.getTranscript();

		// Send session ended message
		const endedMsg = createSessionEnded(
			preppal.SessionEnded.Reason.USER_INITIATED,
		);
		ws.send(encodeServerMessage(endedMsg));

		// Close the WebSocket
		ws.close(1000, 'Interview ended by user');
	}

	private async initializeGemini(clientWs: WebSocket): Promise<void> {
		const ai = new GoogleGenAI({ apiKey: this.env.GEMINI_API_KEY });
		const model = 'gemini-2.0-flash-exp';

		const config = {
			responseModalities: [Modality.AUDIO, Modality.TEXT],
			speechConfig: {
				voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
			},
		};

		this.geminiSession = await ai.live.connect({
			model,
			config,
		});

		// Set up event handlers
		this.geminiSession.on('open', () => {
			console.log(`Gemini Live connected for interview ${this.interviewId}`);
		});

		this.geminiSession.on('message', (message: any) => {
			this.handleGeminiMessage(clientWs, message);
		});

		this.geminiSession.on('error', (error: any) => {
			console.error('Gemini error:', error);
			const errorMsg = createErrorResponse(4002, 'AI service error');
			clientWs.send(encodeServerMessage(errorMsg));
		});

		this.geminiSession.on('close', () => {
			console.log('Gemini connection closed');
			const endMsg = createSessionEnded(
				preppal.SessionEnded.Reason.GEMINI_ENDED,
			);
			clientWs.send(encodeServerMessage(endMsg));
			clientWs.close(1000, 'AI ended session');
		});
	}

	private handleGeminiMessage(clientWs: WebSocket, message: any): void {
		// Handle input transcription (user speech)
		if (message.serverContent?.inputTranscription) {
			const text = message.serverContent.inputTranscription.text;

			// Save to transcript
			this.transcriptManager.addUserTranscript(text);

			// Send to client
			const transcriptMsg = createTranscriptUpdate('USER', text, true);
			clientWs.send(encodeServerMessage(transcriptMsg));
		}

		// Handle output transcription (AI speech)
		if (message.serverContent?.outputTranscription) {
			const text = message.serverContent.outputTranscription.text;

			// Save to transcript
			this.transcriptManager.addAITranscript(text);

			// Send to client
			const transcriptMsg = createTranscriptUpdate('AI', text, true);
			clientWs.send(encodeServerMessage(transcriptMsg));
		}

		// Handle AI text response
		if (message.text) {
			const transcriptMsg = createTranscriptUpdate('AI', message.text, true);
			clientWs.send(encodeServerMessage(transcriptMsg));
		}

		// Handle AI audio response
		if (message.data) {
			// message.data is base64 encoded audio from Gemini
			// Convert base64 to Uint8Array for protobuf
			const audioData = AudioConverter.base64ToBinary(message.data);

			const audioMsg = createAudioResponse(audioData);
			clientWs.send(encodeServerMessage(audioMsg));
		}
	}

	private cleanup(): void {
		console.log(`Cleaning up session for interview ${this.interviewId}`);
		if (this.geminiSession) {
			this.geminiSession.close();
		}
	}
}
