// ABOUTME: Custom error types for the Cloudflare Worker
// ABOUTME: Provides domain-specific errors for better error handling and debugging

/**
 * Base error for all worker errors
 * Provides consistent error handling across the worker
 */
export class WorkerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Error when Gemini connection fails
 */
export class GeminiConnectionError extends WorkerError {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
  }
}

/**
 * Error when submitting transcript to backend
 */
export class TranscriptSubmissionError extends WorkerError {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
  }
}

/**
 * Error when updating interview status
 */
export class StatusUpdateError extends WorkerError {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
  }
}

/**
 * Error when authentication fails
 */
export class AuthenticationError extends WorkerError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Error when WebSocket connection fails
 */
export class WebSocketError extends WorkerError {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
  }
}

/**
 * Error when feedback generation fails
 */
export class FeedbackGenerationError extends WorkerError {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
  }
}
