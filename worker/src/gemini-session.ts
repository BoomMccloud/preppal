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
import { ApiClient } from './api-client';

export class GeminiSession implements DurableObject {
	private userId?: string;
	private interviewId?: string;
	private transcriptManager: TranscriptManager;
	private geminiSession: any;
	private apiClient: ApiClient;
	private userInitiatedClose = false;

	constructor(
		private state: DurableObjectState,
		private env: Env,
	) {
		this.transcriptManager = new TranscriptManager();
		this.apiClient = new ApiClient(
			env.NEXT_PUBLIC_API_URL,
			env.WORKER_SHARED_SECRET,
		);
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
			`[GeminiSession] WebSocket connection request for user ${this.userId}, interview ${this.interviewId}`,
		);

		// Create WebSocket pair
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		// Accept the WebSocket connection
		server.accept();

		// Initialize Gemini connection
		try {
			console.log(`[GeminiSession] Attempting to initialize Gemini connection for interview ${this.interviewId}`);
			await this.initializeGemini(client, server);
			console.log(`[GeminiSession] Gemini connection initialized successfully for interview ${this.interviewId}`);

			// Update interview status to IN_PROGRESS
			await this.apiClient.updateStatus(this.interviewId, 'IN_PROGRESS');
			console.log(`[GeminiSession] Called updateStatus for ${this.interviewId} to IN_PROGRESS`);
			console.log(`Interview ${this.interviewId} status updated to IN_PROGRESS`);
		} catch (error) {
			console.error('[GeminiSession] Failed to initialize Gemini:', error);

			// Update status to ERROR
			try {
				await this.apiClient.updateStatus(this.interviewId, 'ERROR');
			} catch (apiError) {
				console.error('[GeminiSession] Failed to update status to ERROR:', apiError);
			}

			const errorMsg = createErrorResponse(
				4002,
				'Failed to connect to AI service',
			);
			client.send(encodeServerMessage(errorMsg)); // send to client, not server
			client.close(4002, 'Failed to connect to AI service'); // close client, not server
			return new Response(null, {
				status: 101,
				webSocket: client,
			});
		}

		// Handle messages
		server.addEventListener('message', async (event: MessageEvent) => {
			try {
				if (event.data instanceof ArrayBuffer) {
					console.log(`[GeminiSession] Received binary message for interview ${this.interviewId}`);
					await this.handleBinaryMessage(server, event.data);
				} else {
					console.warn(`[GeminiSession] Received non-binary message, ignoring for interview ${this.interviewId}`);
				}
			} catch (error) {
				console.error(`[GeminiSession] Error handling message for interview ${this.interviewId}:`, error);
				const errorMsg = createErrorResponse(
					5000,
					'Internal error processing message',
				);
				client.send(encodeServerMessage(errorMsg)); // send to client, not server
			}
		});

		server.addEventListener('close', () => {
			console.log(`[GeminiSession] WebSocket closed for interview ${this.interviewId}`);
			this.cleanup();
		});

		server.addEventListener('error', (event: ErrorEvent) => {
			console.error(`[GeminiSession] WebSocket error for interview ${this.interviewId}:`, event);
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
		console.log(`[GeminiSession] Decoding client message for interview ${this.interviewId}`);
		const message = decodeClientMessage(buffer);

		if (message.audioChunk) {
			console.log(`[GeminiSession] Handling audio chunk for interview ${this.interviewId}`);
			await this.handleAudioChunk(ws, message.audioChunk);
		} else if (message.endRequest) {
			console.log(`[GeminiSession] Handling end request for interview ${this.interviewId}`);
			await this.handleEndRequest(ws);
		} else {
			console.warn(`[GeminiSession] Received unknown message type for interview ${this.interviewId}`);
		}
	}

	private async handleAudioChunk(
		ws: WebSocket,
		audioChunk: preppal.IAudioChunk,
	): Promise<void> {
		const audioContent = audioChunk.audioContent;
		if (!audioContent || audioContent.length === 0) {
			console.warn(`[GeminiSession] Received empty audio chunk for interview ${this.interviewId}`);
			return;
		}

		console.log(`[GeminiSession] Received audio chunk: ${audioContent.length} bytes for interview ${this.interviewId}`);

		// Convert binary audio to base64 for Gemini
		const base64Audio = AudioConverter.binaryToBase64(
			new Uint8Array(audioContent),
		);

		// Send to Gemini (will be implemented when we add Gemini connection)
		if (this.geminiSession) {
			console.log(`[GeminiSession] Sending audio to Gemini for interview ${this.interviewId}`);
			this.geminiSession.sendRealtimeInput({
				audio: {
					data: base64Audio,
					mimeType: 'audio/pcm;rate=16000',
				},
			});
		} else {
			console.warn(`[GeminiSession] Gemini session not initialized, audio chunk dropped for interview ${this.interviewId}`);
		}
	}

	private async handleEndRequest(ws: WebSocket): Promise<void> {
		console.log(`[GeminiSession] Received end request for interview ${this.interviewId}`);

		// Mark as user-initiated close
		this.userInitiatedClose = true;

		// Close Gemini connection if exists
		if (this.geminiSession) {
			console.log(`[GeminiSession] Closing Gemini connection for interview ${this.interviewId}`);
			this.geminiSession.close();
		}

		// Submit transcript to Next.js API
		try {
			const transcript = this.transcriptManager.getTranscript();
			const endedAt = new Date().toISOString();

			console.log(`[GeminiSession] Submitting transcript for interview ${this.interviewId} (${transcript.length} entries)`);
			await this.apiClient.submitTranscript(
				this.interviewId!,
				transcript,
				endedAt,
			);
			console.log(
				`[GeminiSession] Transcript submitted for interview ${this.interviewId} (${transcript.length} entries)`,
			);
		} catch (error) {
			console.error(`[GeminiSession] Failed to submit transcript for interview ${this.interviewId}:`, error);
		}

		// Update status to COMPLETED
		try {
			console.log(`[GeminiSession] Updating status to COMPLETED for interview ${this.interviewId}`);
			await this.apiClient.updateStatus(this.interviewId!, 'COMPLETED');
			console.log(`[GeminiSession] Interview ${this.interviewId} status updated to COMPLETED`);
		} catch (error) {
			console.error(`[GeminiSession] Failed to update status to COMPLETED for interview ${this.interviewId}:`, error);
		}

		// Send session ended message
		const endedMsg = createSessionEnded(
			preppal.SessionEnded.Reason.USER_INITIATED,
		);
		ws.send(encodeServerMessage(endedMsg));

		// Close the WebSocket
		ws.close(1000, 'Interview ended by user');
	}

	private async initializeGemini(clientWs: WebSocket, serverWs: WebSocket): Promise<void> {
		console.log(`[GeminiSession] Initializing Gemini with API key: ${this.env.GEMINI_API_KEY ? 'PRESENT' : 'MISSING'}`);

		const ai = new GoogleGenAI({ apiKey: this.env.GEMINI_API_KEY });
		const model = 'gemini-2.0-flash-exp';

		const config = {
			// IMPORTANT: Use Modality.AUDIO OR Modality.TEXT, never both
			responseModalities: [Modality.AUDIO],
			speechConfig: {
				voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
			},
		};

		console.log(`[GeminiSession] Connecting to Gemini Live API for interview ${this.interviewId}`);

		this.geminiSession = await ai.live.connect({
			model,
			config,
			callbacks: {
				onopen: () => {
					console.log(`[GeminiSession] Gemini Live connected for interview ${this.interviewId}`);
				},
				onmessage: (message: any) => {
					console.log(`[GeminiSession] Received message from Gemini for interview ${this.interviewId}`, message);
					this.handleGeminiMessage(clientWs, message);
				},
				onerror: async (error: any) => {
					console.error(`[GeminiSession] Gemini Live API error for interview ${this.interviewId}:`, error);
					// Update status to ERROR

					// Update status to ERROR
					try {
						await this.apiClient.updateStatus(this.interviewId!, 'ERROR');
					} catch (apiError) {
						console.error(`[GeminiSession] Failed to update status to ERROR for interview ${this.interviewId}:`, apiError);
					}

					const errorMsg = createErrorResponse(4002, 'AI service error');
					clientWs.send(encodeServerMessage(errorMsg)); // Send error to clientWs
				},
				onclose: async () => {
					console.log(`[GeminiSession] Gemini connection closed for interview ${this.interviewId}`);

					// Only update status to ERROR if this was an unexpected close
					if (!this.userInitiatedClose) {
						try {
							await this.apiClient.updateStatus(this.interviewId!, 'ERROR');
							console.log(`[GeminiSession] Interview ${this.interviewId} status updated to ERROR (unexpected close)`);
						} catch (apiError) {
							console.error(`[GeminiSession] Failed to update status to ERROR for interview ${this.interviewId}:`, apiError);
						}

						const endMsg = createSessionEnded(
							preppal.SessionEnded.Reason.GEMINI_ENDED,
						);
						clientWs.send(encodeServerMessage(endMsg)); // Send session ended to clientWs
						clientWs.close(1000, 'AI ended session'); // Close clientWs
					}
				},
			},
		});

		console.log(`[GeminiSession] Gemini connection established for interview ${this.interviewId}`);
	}

	private handleGeminiMessage(clientWs: WebSocket, message: any): void {
		console.log(`[GeminiSession] Handling Gemini message for interview ${this.interviewId}`, message);

		// Handle input transcription (user speech)
		if (message.serverContent?.inputTranscription) {
			const text = message.serverContent.inputTranscription.text;
			console.log(`[GeminiSession] Received input transcription for interview ${this.interviewId}: ${text}`);

			// Save to transcript
			this.transcriptManager.addUserTranscript(text);

			// Send to client
			const transcriptMsg = createTranscriptUpdate('USER', text, true);
			clientWs.send(encodeServerMessage(transcriptMsg));
		}

		// Handle output transcription (AI speech)
		if (message.serverContent?.outputTranscription) {
			const text = message.serverContent.outputTranscription.text;
			console.log(`[GeminiSession] Received output transcription for interview ${this.interviewId}: ${text}`);

			// Save to transcript
			this.transcriptManager.addAITranscript(text);

			// Send to client
			const transcriptMsg = createTranscriptUpdate('AI', text, true);
			clientWs.send(encodeServerMessage(transcriptMsg));
		}

		// Handle AI text response
		if (message.text) {
			console.log(`[GeminiSession] Received text response for interview ${this.interviewId}: ${message.text}`);
			const transcriptMsg = createTranscriptUpdate('AI', message.text, true);
			clientWs.send(encodeServerMessage(transcriptMsg));
		}

		// Handle AI audio response
		if (message.data) {
			console.log(`[GeminiSession] Received audio response for interview ${this.interviewId}: ${message.data.length} characters`);
			// message.data is base64 encoded audio from Gemini
			// Convert base64 to Uint8Array for protobuf
			const audioData = AudioConverter.base64ToBinary(message.data);

			const audioMsg = createAudioResponse(audioData);
			clientWs.send(encodeServerMessage(audioMsg));
		}
	}

	private cleanup(): void {
		console.log(`[GeminiSession] Cleaning up session for interview ${this.interviewId}`);
		if (this.geminiSession) {
			this.geminiSession.close();
		}
	}
}