#!/usr/bin/env node
// ABOUTME: WebSocket test client for local Gemini Live API integration testing
// ABOUTME: Generates JWT, connects to worker, sends test audio, and logs responses

import { SignJWT } from 'jose';
import WebSocket from 'ws';

const JWT_SECRET = 'Auj6rF/8xUwFhkajYuRpx+vh+bTH9sQAw/LeFu4qzZQ=';
const WORKER_URL = 'ws://localhost:8787';
const TEST_INTERVIEW_ID = 'test-interview-123';

// Generate a test JWT
async function generateTestJWT() {
	const secret = new TextEncoder().encode(JWT_SECRET);

	const jwt = await new SignJWT({
		userId: 'test-user-456',
		interviewId: TEST_INTERVIEW_ID,
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('1h')
		.sign(secret);

	return jwt;
}

// Import protobuf (we'll create a simple message encoder)
function encodeAudioChunk(audioData) {
	// For testing, we'll send a minimal protobuf message
	// In real implementation, this would use the actual protobuf library
	// For now, just return a test buffer
	console.log('⚠️  Note: Using mock protobuf encoding for testing');
	return Buffer.from([0x0a, 0x04, ...audioData]); // Simplified protobuf
}

async function testWebSocket() {
	try {
		console.log('🔐 Generating JWT token...');
		const token = await generateTestJWT();
		console.log('✅ JWT generated:', token.substring(0, 50) + '...');

		const wsUrl = `${WORKER_URL}/${TEST_INTERVIEW_ID}?token=${token}`;
		console.log(`🔌 Connecting to: ${wsUrl}`);

		const ws = new WebSocket(wsUrl);

		ws.on('open', () => {
			console.log('✅ WebSocket connected!');
			console.log('📡 Waiting for Gemini to initialize...');

			// Wait a bit for Gemini to connect, then send test audio
			setTimeout(() => {
				console.log('🎤 Sending test audio chunk...');
				// Send a small test audio chunk (mock data)
				const testAudio = new Uint8Array(160); // ~10ms of 16kHz PCM
				for (let i = 0; i < testAudio.length; i++) {
					testAudio[i] = Math.floor(Math.random() * 256);
				}
				const message = encodeAudioChunk(testAudio);
				ws.send(message);
				console.log(`   Sent ${testAudio.length} bytes of audio`);
			}, 2000);

			// After 10 seconds, close the connection
			setTimeout(() => {
				console.log('⏰ Test timeout - closing connection');
				ws.close();
			}, 10000);
		});

		ws.on('message', (data) => {
			console.log('📨 Received message from worker:');
			if (data instanceof Buffer) {
				console.log('   Type: Binary (protobuf)');
				console.log('   Size:', data.length, 'bytes');
				console.log('   Hex:', data.toString('hex').substring(0, 100));
			} else {
				console.log('   Type: Text');
				console.log('   Data:', data.toString());
			}
		});

		ws.on('error', (error) => {
			console.error('❌ WebSocket error:', error.message);
		});

		ws.on('close', (code, reason) => {
			console.log(`👋 WebSocket closed - Code: ${code}, Reason: ${reason || 'No reason'}`);
			process.exit(0);
		});

	} catch (error) {
		console.error('❌ Test failed:', error);
		process.exit(1);
	}
}

console.log('🧪 Starting WebSocket Test Client');
console.log('=' .repeat(60));
testWebSocket();
