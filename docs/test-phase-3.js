#!/usr/bin/env node
// ABOUTME: Automated test script for Cloudflare Worker verification
// ABOUTME: Tests worker protobuf handling and API call behavior (mocked backend)

import http from 'http';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import protobuf from 'protobufjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get directory name in ES modules (needed for path resolution)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from worker's .dev.vars file
dotenv.config({ path: join(__dirname, '../worker/.dev.vars') });

// Load protobuf definitions from .proto file
const root = await protobuf.load(join(__dirname, '../proto/interview.proto'));
const preppal = {
  ClientToServerMessage: root.lookupType('preppal.ClientToServerMessage'),
  ServerToClientMessage: root.lookupType('preppal.ServerToClientMessage'),
};

// Configuration
const WORKER_URL = process.env.WORKER_URL || 'ws://localhost:8787';
const JWT_SECRET = process.env.JWT_SECRET;
const MOCK_API_PORT = 3999;

// Test data
const TEST_USER_ID = 'test-user-123';
const TEST_INTERVIEW_ID = 'test-interview-456';

// Track API calls made by worker
const apiCalls = {
  updateStatus: [],
  submitTranscript: [],
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(step, message) {
  console.log(`${colors.green}[${step}] ${message}... ✅${colors.reset}`);
}

function error(step, message) {
  console.log(`${colors.red}[${step}] ${message}... ❌${colors.reset}`);
}

function info(message) {
  console.log(`${colors.cyan}       ${message}${colors.reset}`);
}

async function checkWorkerHealth(step) {
  try {
    const url = new URL(WORKER_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 8787,
      path: '/health',
      method: 'GET',
    };

    await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          resolve();
        } else {
          reject(new Error(`Worker returned status ${res.statusCode}`));
        }
      });
      req.on('error', reject);
      req.setTimeout(2000, () => reject(new Error('Timeout')));
      req.end();
    });

    success(step, 'Checking if Cloudflare Worker is running');
    return true;
  } catch (err) {
    error(step, `Cloudflare Worker returned status ${err.message}`);
    info(`Error: ${err.message}`);
    info(`Make sure you started the worker with: pnpm dev:worker`);
    return false;
  }
}

function generateWorkerToken(step) {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET not configured in environment');
    }

    const token = jwt.sign(
      {
        userId: TEST_USER_ID,
        interviewId: TEST_INTERVIEW_ID,
      },
      JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: '5m',
      }
    );

    success(step, 'Generating worker token');
    return token;
  } catch (err) {
    error(step, 'Failed to generate token');
    info(`Error: ${err.message}`);
    throw err;
  }
}

function startMockApiServer(step) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const data = JSON.parse(body);

          // Check URL path to determine which endpoint was called
          if (req.url && req.url.includes('updateStatus')) {
            apiCalls.updateStatus.push(data);
            info(`Worker called updateStatus: ${JSON.stringify(data)}`);
          } else if (req.url && req.url.includes('submitTranscript')) {
            apiCalls.submitTranscript.push(data);
            info(`Worker called submitTranscript with ${data?.transcript?.length || 0} entries`);
          } else {
            info(`Unknown endpoint called: ${req.url}`);
          }

          // Send mock success response
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          info(`Error parsing request: ${err}`);
          res.writeHead(500);
          res.end();
        }
      });
    });

    server.listen(MOCK_API_PORT, '0.0.0.0', (err) => {
      if (err) {
        error(step, 'Failed to start mock API server');
        reject(err);
      } else {
        success(step, 'Starting mock API server');
        info(`Mock API listening on 0.0.0.0:${MOCK_API_PORT}`);
        resolve(server);
      }
    });
  });
}

async function connectToWorker(interviewId, token, step) {
  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(`${WORKER_URL}/${interviewId}?token=${token}`);

      ws.on('open', () => {
        success(step, 'Connecting to worker WebSocket');
        resolve(ws);
      });

      ws.on('error', (err) => {
        error(step, 'Failed to connect to worker');
        info(`Error: ${err.message}`);
        reject(err);
      });
    } catch (err) {
      error(step, 'Failed to connect to worker');
      info(`Error: ${err.message}`);
      reject(err);
    }
  });
}

async function sendAudioChunks(ws, step) {
  return new Promise((resolve, reject) => {
    try {
      // Array to store all responses from worker
      const responses = [];
      let responseCount = 0;

      // Set up persistent message listener
      const responseHandler = (data) => {
        responseCount++;
        try {
          const serverMessage = preppal.ServerToClientMessage.decode(new Uint8Array(data));
          responses.push(serverMessage.toJSON());

          info(`Received response #${responseCount}: ${JSON.stringify(serverMessage.toJSON())}`);

          // Log specific message types
          if (serverMessage.transcriptUpdate) {
            info(`Transcript update: ${serverMessage.transcriptUpdate.text}`);
          }
          if (serverMessage.audioProcessed) {
            info('Audio processed confirmation received');
          }
          if (serverMessage.audioResponse) {
            info('Audio response received from AI');
          }
        } catch (decodeErr) {
          info(`Failed to decode response #${responseCount}: ${decodeErr.message}`);
        }
      };

      ws.on('message', responseHandler);

      // Function to send a single audio chunk
      const sendSingleChunk = () => {
        const fakeAudioData = Buffer.alloc(1600);
        for (let j = 0; j < fakeAudioData.length; j++) {
          fakeAudioData[j] = Math.floor(Math.random() * 256);
        }

        const message = preppal.ClientToServerMessage.create({
          audioChunk: { audioContent: fakeAudioData },
        });

        const encoded = preppal.ClientToServerMessage.encode(message).finish();
        ws.send(encoded);
        info(`Sent audio chunk (${fakeAudioData.length} bytes)`);
      };

      // Send multiple audio chunks to simulate real usage
      sendSingleChunk(); // Send first chunk immediately

      // Send remaining chunks with delays
      setTimeout(() => {
        sendSingleChunk();

        setTimeout(() => {
          sendSingleChunk();

          // Give some time to receive responses before resolving
          setTimeout(() => {
            success(step, `Sending test audio chunks (${responseCount} responses received)`);

            // Store responses for later verification
            ws.testResponses = responses;

            // Remove listener to prevent memory leaks
            ws.removeListener('message', responseHandler);

            resolve();
          }, 2000); // Wait a bit more for responses
        }, 500);
      }, 500);

    } catch (err) {
      error(step, 'Failed to send audio');
      info(`Error: ${err.message}`);
      reject(err);
    }
  });
}

async function sendEndRequest(ws, step) {
  return new Promise((resolve, reject) => {
    try {
      const message = preppal.ClientToServerMessage.create({
        endRequest: {},
      });

      const encoded = preppal.ClientToServerMessage.encode(message).finish();
      ws.send(encoded);

      success(step, 'Sending end request');

      let responded = false;
      ws.on('message', (data) => {
        if (!responded) {
          responded = true;
          try {
            const serverMessage = preppal.ServerToClientMessage.decode(new Uint8Array(data));
            if (serverMessage.sessionEnded) {
              info(`Session ended: ${serverMessage.sessionEnded.reason}`);
            }
          } catch (decodeErr) {
            // Ignore decode errors
          }
          resolve();
        }
      });

      setTimeout(() => {
        if (!responded) {
          resolve();
        }
      }, 2000);
    } catch (err) {
      error(step, 'Failed to send end request');
      info(`Error: ${err.message}`);
      reject(err);
    }
  });
}

function verifyApiCalls(step) {
  try {
    info(`Checking API calls: updateStatus=${apiCalls.updateStatus.length}, submitTranscript=${apiCalls.submitTranscript.length}`);

    // Verify updateStatus was called at least twice (IN_PROGRESS and COMPLETED)
    if (apiCalls.updateStatus.length < 2) {
      throw new Error(`Worker called updateStatus only ${apiCalls.updateStatus.length} time(s), expected at least 2`);
    }

    const inProgressCall = apiCalls.updateStatus.find(
      call => call.status === 'IN_PROGRESS'
    );

    if (!inProgressCall) {
      throw new Error('Worker did not call updateStatus with IN_PROGRESS');
    }

    info(`✓ Worker called updateStatus(IN_PROGRESS)`);

    const completedCall = apiCalls.updateStatus.find(
      call => call.status === 'COMPLETED'
    );

    if (!completedCall) {
      throw new Error('Worker did not call updateStatus with COMPLETED');
    }

    info(`✓ Worker called updateStatus(COMPLETED)`);

    // Verify submitTranscript was called
    if (apiCalls.submitTranscript.length === 0) {
      throw new Error('Worker did not call submitTranscript');
    }

    info(`✓ Worker called submitTranscript`);

    success(step, 'Verifying worker API calls');
    return true;
  } catch (err) {
    error(step, 'API call verification failed');
    info(`Error: ${err.message}`);
    throw err;
  }
}

async function runTests() {
  log('\n🧪 Cloudflare Worker Test Suite', 'cyan');
  log('====================================\n', 'cyan');

  let mockServer;
  let ws;

  try {
    // Step 1: Check worker is running
    const workerRunning = await checkWorkerHealth('1/7');
    if (!workerRunning) {
      log('\n💡 Tip: Start the worker with: pnpm dev:worker\n', 'yellow');
      process.exit(1);
    }

    // Step 2: Start mock API server
    mockServer = await startMockApiServer('2/7');

    // Step 3: Generate worker token
    const token = generateWorkerToken('3/7');

    // Step 4: Connect to worker
    ws = await connectToWorker(TEST_INTERVIEW_ID, token, '4/7');

    // Wait for status update
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 5: Send audio chunks
    await sendAudioChunks(ws, '5/7');

    // Wait for worker to process audio before ending session
    info('Waiting for worker to process audio...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 6: Send end request
    await sendEndRequest(ws, '6/7');

    // Wait for transcript submission and status update
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 7: Verify API calls
    verifyApiCalls('7/7');

    log('\n✅ ALL TESTS PASSED!\n', 'green');
    log('Cloudflare Worker is working correctly! 🎉\n', 'green');

  } catch (err) {
    log('\n❌ TESTS FAILED\n', 'red');
    log(`Error: ${err.message}\n`, 'red');
    process.exit(1);
  } finally {
    // Cleanup
    if (ws) {
      ws.close();
    }
    if (mockServer) {
      mockServer.close();
    }
  }
}

// Run the tests
runTests().catch((err) => {
  log('\n❌ FATAL ERROR\n', 'red');
  log(`${err.message}\n`, 'red');
  process.exit(1);
});
