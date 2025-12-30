// Type definitions for the interview session state machine
// This defines all possible states, events, and configuration context for the reducer

// TranscriptEntry - moved from useInterviewSocket.ts
export interface TranscriptEntry {
  text: string;
  speaker: "AI" | "USER";
  is_final: boolean;
}

// Command - instructions from reducer to driver
export type Command =
  | { type: "START_CONNECTION"; blockNumber: number }
  | { type: "CLOSE_CONNECTION" }
  | { type: "MUTE_MIC" }
  | { type: "UNMUTE_MIC" }
  | { type: "SETUP_AUDIO" }
  | { type: "STOP_AUDIO" };

// Common fields shared across all state variants
type CommonStateFields = {
  connectionState: "initializing" | "connecting" | "live" | "ending" | "error";
  transcript: TranscriptEntry[];
  pendingUser?: string;
  pendingAI?: string;
  elapsedTime: number;
  error: string | null;
  isAiSpeaking: boolean;
};

// Discriminated union with common fields via intersection types
export type SessionState =
  | ({ status: "WAITING_FOR_CONNECTION" } & CommonStateFields)
  | ({
      status: "ANSWERING";
      blockIndex: number;
      blockStartTime: number; // Timestamp
      answerStartTime: number; // Timestamp
    } & CommonStateFields)
  | ({
      status: "ANSWER_TIMEOUT_PAUSE";
      blockIndex: number;
      blockStartTime: number;
      pauseStartedAt: number; // Timestamp
    } & CommonStateFields)
  | ({
      status: "BLOCK_COMPLETE_SCREEN";
      completedBlockIndex: number;
    } & CommonStateFields)
  | ({ status: "INTERVIEW_COMPLETE" } & CommonStateFields);

// Events - expanded with new driver events
export type SessionEvent =
  // Existing events (keep these)
  | { type: "CONNECTION_READY"; initialBlockIndex: number }
  | { type: "TICK" }
  | { type: "USER_CLICKED_CONTINUE" }
  | { type: "INTERVIEW_ENDED" }
  // New driver events
  | { type: "CONNECTION_ESTABLISHED" }
  | { type: "CONNECTION_CLOSED"; code: number }
  | { type: "CONNECTION_ERROR"; error: string }
  | { type: "TRANSCRIPT_COMMIT"; entry: TranscriptEntry }
  | { type: "TRANSCRIPT_PENDING"; buffers: { user?: string; ai?: string } }
  | { type: "AI_SPEAKING_CHANGED"; isSpeaking: boolean }
  | { type: "TIMER_TICK" }
  // Dev-only events (only processed in development mode)
  | { type: "DEV_FORCE_BLOCK_COMPLETE" }
  | { type: "DEV_FORCE_ANSWER_TIMEOUT" };

export interface ReducerContext {
  answerTimeLimit: number; // seconds, 0 = no limit
  blockDuration: number; // seconds, 0 = no limit
  totalBlocks: number;
}

// ReducerResult - new return type for reducer
export interface ReducerResult {
  state: SessionState;
  commands: Command[];
}

// Driver events interface
export interface DriverEvents {
  onConnectionOpen: () => void;
  onConnectionClose: (code: number) => void;
  onConnectionError: (error: string) => void;
  onTranscriptCommit: (entry: TranscriptEntry) => void;
  onTranscriptPending: (buffers: { user?: string; ai?: string }) => void;
  onAudioPlaybackChange: (isPlaying: boolean) => void;
  onMediaStream?: (stream: MediaStream) => void;
}

export const SessionStatus = {
  WAITING_FOR_CONNECTION: "WAITING_FOR_CONNECTION",
  ANSWERING: "ANSWERING",
  ANSWER_TIMEOUT_PAUSE: "ANSWER_TIMEOUT_PAUSE",
  BLOCK_COMPLETE_SCREEN: "BLOCK_COMPLETE_SCREEN",
  INTERVIEW_COMPLETE: "INTERVIEW_COMPLETE",
} as const;
