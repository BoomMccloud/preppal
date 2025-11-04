// ABOUTME: Tests for GeminiSession lifecycle integration with Next.js API
// ABOUTME: Validates status updates and transcript submission during WebSocket lifecycle

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiSession } from '../gemini-session';
import type { Env } from '../index';

// Mock the API client
vi.mock('../api-client', () => {
  const mockUpdateStatus = vi.fn().mockResolvedValue(undefined);
  const mockSubmitTranscript = vi.fn().mockResolvedValue(undefined);

  return {
    ApiClient: vi.fn().mockImplementation(() => ({
      updateStatus: mockUpdateStatus,
      submitTranscript: mockSubmitTranscript,
    })),
  };
});

// Mock Gemini SDK
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    live: {
      connect: vi.fn().mockResolvedValue({
        sendRealtimeInput: vi.fn(),
        close: vi.fn(),
      }),
    },
  })),
  Modality: {
    AUDIO: 'AUDIO',
    TEXT: 'TEXT',
  },
}));

describe('GeminiSession Lifecycle Integration', () => {
  let geminiSession: GeminiSession;
  let mockState: DurableObjectState;
  let mockEnv: Env;
  let mockApiClient: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock environment
    mockEnv = {
      GEMINI_SESSION: {} as any,
      JWT_SECRET: 'test-secret',
      WORKER_SHARED_SECRET: 'test-worker-secret',
      GEMINI_API_KEY: 'test-gemini-key',
      NEXT_PUBLIC_API_URL: 'https://api.example.com',
    };

    // Setup mock state
    mockState = {
      id: { toString: () => 'test-id' },
      storage: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      },
    } as any;

    // Get the mocked ApiClient
    const { ApiClient } = await import('../api-client');
    mockApiClient = new ApiClient(mockEnv.NEXT_PUBLIC_API_URL, mockEnv.WORKER_SHARED_SECRET);

    geminiSession = new GeminiSession(mockState, mockEnv);
  });

  describe('WebSocket connection', () => {
    it('should update status to IN_PROGRESS when WebSocket connects', async () => {
      // This test will fail until we implement status update on connection
      expect(mockApiClient.updateStatus).not.toHaveBeenCalled();

      // TODO: Simulate WebSocket connection and verify updateStatus is called
    });
  });

  describe('Session end', () => {
    it('should submit transcript when user ends session', async () => {
      // This test will fail until we implement transcript submission
      expect(mockApiClient.submitTranscript).not.toHaveBeenCalled();

      // TODO: Simulate end request and verify submitTranscript is called
    });

    it('should update status to COMPLETED when user ends session', async () => {
      // This test will fail until we implement status update on end
      expect(mockApiClient.updateStatus).not.toHaveBeenCalled();

      // TODO: Simulate end request and verify updateStatus('COMPLETED') is called
    });
  });

  describe('Error handling', () => {
    it('should update status to ERROR when Gemini connection fails', async () => {
      // This test will fail until we implement error handling
      expect(mockApiClient.updateStatus).not.toHaveBeenCalled();

      // TODO: Simulate Gemini error and verify updateStatus('ERROR') is called
    });
  });
});
