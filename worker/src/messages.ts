// ABOUTME: Protobuf message encoding and decoding for client-server WebSocket communication
// ABOUTME: Handles AudioChunk, EndRequest, TranscriptUpdate, AudioResponse, ErrorResponse, and SessionEnded messages

import { preppal } from './lib/interview_pb.js';

/**
 * Decodes a binary message from the client
 */
export function decodeClientMessage(
	buffer: ArrayBuffer,
): preppal.ClientToServerMessage {
	const uint8Array = new Uint8Array(buffer);
	return preppal.ClientToServerMessage.decode(uint8Array);
}

/**
 * Encodes a server message to binary for sending to client
 */
export function encodeServerMessage(
	message: preppal.ServerToClientMessage,
): Uint8Array {
	return preppal.ServerToClientMessage.encode(message).finish();
}

/**
 * Creates a transcript update message
 */
export function createTranscriptUpdate(
	speaker: string,
	text: string,
	isFinal: boolean,
): preppal.ServerToClientMessage {
	return preppal.ServerToClientMessage.create({
		transcriptUpdate: {
			speaker,
			text,
			isFinal,
		},
	});
}

/**
 * Creates an audio response message
 */
export function createAudioResponse(
	audioContent: Uint8Array,
): preppal.ServerToClientMessage {
	return preppal.ServerToClientMessage.create({
		audioResponse: {
			audioContent,
		},
	});
}

/**
 * Creates an error response message
 */
export function createErrorResponse(
	code: number,
	message: string,
): preppal.ServerToClientMessage {
	return preppal.ServerToClientMessage.create({
		error: {
			code,
			message,
		},
	});
}

/**
 * Creates a session ended message
 */
export function createSessionEnded(
	reason: preppal.SessionEnded.Reason,
): preppal.ServerToClientMessage {
	return preppal.ServerToClientMessage.create({
		sessionEnded: {
			reason,
		},
	});
}
