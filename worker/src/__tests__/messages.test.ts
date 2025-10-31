// ABOUTME: Tests for protobuf message encoding and decoding
// ABOUTME: Validates message serialization for client-server WebSocket communication

import { describe, it, expect } from 'vitest';
import {
	decodeClientMessage,
	encodeServerMessage,
	createTranscriptUpdate,
	createAudioResponse,
	createErrorResponse,
	createSessionEnded,
} from '../messages';
import { preppal } from '../lib/interview_pb.js';

describe('Message Encoding/Decoding', () => {
	describe('Client to Server Messages', () => {
		it('should decode an AudioChunk message', () => {
			const audioData = new Uint8Array([1, 2, 3, 4, 5]);
			const message = preppal.ClientToServerMessage.create({
				audioChunk: {
					audioContent: audioData,
				},
			});

			const encoded = preppal.ClientToServerMessage.encode(message).finish();
			// Convert to ArrayBuffer for decoding, ensuring proper type
			const buffer = encoded.buffer.slice(
				encoded.byteOffset,
				encoded.byteOffset + encoded.byteLength,
			) as ArrayBuffer;
			const decoded = decodeClientMessage(buffer);

			expect(decoded.audioChunk).toBeDefined();
			expect(decoded.audioChunk?.audioContent).toEqual(audioData);
		});

		it('should decode an EndRequest message', () => {
			const message = preppal.ClientToServerMessage.create({
				endRequest: {},
			});

			const encoded = preppal.ClientToServerMessage.encode(message).finish();
			// Convert to ArrayBuffer for decoding, ensuring proper type
			const buffer = encoded.buffer.slice(
				encoded.byteOffset,
				encoded.byteOffset + encoded.byteLength,
			) as ArrayBuffer;
			const decoded = decodeClientMessage(buffer);

			expect(decoded.endRequest).toBeDefined();
		});
	});

	describe('Server to Client Messages', () => {
		it('should create and encode a TranscriptUpdate message', () => {
			const message = createTranscriptUpdate('USER', 'Hello world', true);
			const encoded = encodeServerMessage(message);

			// Buffer extends Uint8Array in Node.js
			expect(encoded).toBeInstanceOf(Buffer);

			const decoded = preppal.ServerToClientMessage.decode(encoded);
			expect(decoded.transcriptUpdate).toBeDefined();
			expect(decoded.transcriptUpdate?.speaker).toBe('USER');
			expect(decoded.transcriptUpdate?.text).toBe('Hello world');
			expect(decoded.transcriptUpdate?.isFinal).toBe(true);
		});

		it('should create and encode an AudioResponse message', () => {
			const audioData = new Uint8Array([10, 20, 30, 40, 50]);
			const message = createAudioResponse(audioData);
			const encoded = encodeServerMessage(message);

			// Buffer extends Uint8Array in Node.js
			expect(encoded).toBeInstanceOf(Buffer);

			const decoded = preppal.ServerToClientMessage.decode(encoded);
			expect(decoded.audioResponse).toBeDefined();
			// Compare as arrays since protobuf may return Buffer
			expect(Array.from(decoded.audioResponse?.audioContent ?? [])).toEqual(
				Array.from(audioData),
			);
		});

		it('should create and encode an ErrorResponse message', () => {
			const message = createErrorResponse(4001, 'Authentication failed');
			const encoded = encodeServerMessage(message);

			// Buffer extends Uint8Array in Node.js
			expect(encoded).toBeInstanceOf(Buffer);

			const decoded = preppal.ServerToClientMessage.decode(encoded);
			expect(decoded.error).toBeDefined();
			expect(decoded.error?.code).toBe(4001);
			expect(decoded.error?.message).toBe('Authentication failed');
		});

		it('should create and encode a SessionEnded message', () => {
			const message = createSessionEnded(
				preppal.SessionEnded.Reason.USER_INITIATED,
			);
			const encoded = encodeServerMessage(message);

			// Buffer extends Uint8Array in Node.js
			expect(encoded).toBeInstanceOf(Buffer);

			const decoded = preppal.ServerToClientMessage.decode(encoded);
			expect(decoded.sessionEnded).toBeDefined();
			expect(decoded.sessionEnded?.reason).toBe(
				preppal.SessionEnded.Reason.USER_INITIATED,
			);
		});

		it('should handle all SessionEnded reasons', () => {
			const reasons = [
				preppal.SessionEnded.Reason.REASON_UNSPECIFIED,
				preppal.SessionEnded.Reason.USER_INITIATED,
				preppal.SessionEnded.Reason.GEMINI_ENDED,
				preppal.SessionEnded.Reason.TIMEOUT,
			];

			reasons.forEach((reason) => {
				const message = createSessionEnded(reason);
				const encoded = encodeServerMessage(message);
				const decoded = preppal.ServerToClientMessage.decode(encoded);

				expect(decoded.sessionEnded?.reason).toBe(reason);
			});
		});
	});

	describe('Round-trip encoding', () => {
		it('should preserve data through encode/decode cycle', () => {
			const original = createTranscriptUpdate(
				'AI',
				'This is a test message',
				false,
			);
			const encoded = encodeServerMessage(original);
			const decoded = preppal.ServerToClientMessage.decode(encoded);

			expect(decoded.transcriptUpdate?.speaker).toBe('AI');
			expect(decoded.transcriptUpdate?.text).toBe('This is a test message');
			expect(decoded.transcriptUpdate?.isFinal).toBe(false);
		});
	});
});
