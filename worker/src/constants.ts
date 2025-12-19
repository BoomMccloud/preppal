// ABOUTME: Constants used across the worker
// ABOUTME: Includes WebSocket codes, error codes, and configuration constants

export const WS_CLOSE_NORMAL = 1000;

export const ERROR_CODE_INTERNAL = 5000;
export const ERROR_CODE_AI_SERVICE = 4002;

export const GEMINI_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

export const INTERVIEW_STATUS = {
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  ERROR: "ERROR",
} as const;
