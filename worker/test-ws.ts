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
