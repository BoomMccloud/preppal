// Pure reducer function for the interview session state machine (v5: Dumb Driver)
// All state transitions are driven by events and commands are generated for the driver
// The reducer accepts injectable 'now' parameter for deterministic testing

import { isTimeUp } from "~/lib/countdown-timer";
import type {
  SessionState,
  SessionEvent,
  ReducerContext,
  ReducerResult,
} from "./types";
import { TIMER_CONFIG } from "./constants";

// Helper: Create common state fields with defaults
function createCommonFields(
  partial?: Partial<SessionState>,
): Pick<
  SessionState,
  | "connectionState"
  | "transcript"
  | "pendingUser"
  | "pendingAI"
  | "elapsedTime"
  | "error"
  | "isAiSpeaking"
> {
  return {
    connectionState: partial?.connectionState ?? "initializing",
    transcript: partial?.transcript ?? [],
    pendingUser: partial?.pendingUser ?? "",
    pendingAI: partial?.pendingAI ?? "",
    elapsedTime: partial?.elapsedTime ?? 0,
    error: partial?.error ?? null,
    isAiSpeaking: partial?.isAiSpeaking ?? false,
  };
}

export function sessionReducer(
  state: SessionState,
  event: SessionEvent,
  context: ReducerContext,
  now = Date.now(),
): ReducerResult {
  // Global Event Handler: INTERVIEW_ENDED
  // Can happen from any state (e.g., user clicks "End Interview")
  if (event.type === "INTERVIEW_ENDED") {
    return {
      state: {
        ...state,
        status: "INTERVIEW_COMPLETE",
      },
      commands: [{ type: "STOP_AUDIO" }, { type: "CLOSE_CONNECTION" }],
    };
  }

  // Dev-only events - only processed in development mode
  // These allow developers to step through block states without waiting for timers
  if (process.env.NODE_ENV !== "production") {
    // DEV_FORCE_BLOCK_COMPLETE: Skip directly to block complete screen
    if (event.type === "DEV_FORCE_BLOCK_COMPLETE") {
      if (
        state.status === "ANSWERING" ||
        state.status === "ANSWER_TIMEOUT_PAUSE"
      ) {
        return {
          state: {
            ...state,
            status: "BLOCK_COMPLETE_SCREEN",
            completedBlockIndex: state.blockIndex,
          },
          commands: [],
        };
      }
      return { state, commands: [] };
    }

    // DEV_FORCE_ANSWER_TIMEOUT: Trigger answer timeout immediately
    if (event.type === "DEV_FORCE_ANSWER_TIMEOUT") {
      if (state.status === "ANSWERING") {
        return {
          state: {
            ...state,
            status: "ANSWER_TIMEOUT_PAUSE",
            pauseStartedAt: now,
          },
          commands: [{ type: "MUTE_MIC" }],
        };
      }
      return { state, commands: [] };
    }
  }

  // Handle new driver events (work across all states)
  switch (event.type) {
    case "CONNECTION_ESTABLISHED":
      return {
        state: { ...state, connectionState: "live" },
        commands: [],
      };

    case "CONNECTION_CLOSED":
      return {
        state: { ...state, connectionState: "ending" },
        commands: [], // Connection already closed - no action needed
      };

    case "CONNECTION_ERROR":
      return {
        state: {
          ...state,
          connectionState: "error",
          error: event.error,
          status: "INTERVIEW_COMPLETE",
        },
        commands: [{ type: "STOP_AUDIO" }],
      };

    case "TRANSCRIPT_COMMIT":
      return {
        state: {
          ...state,
          transcript: [...state.transcript, event.entry],
        },
        commands: [],
      };

    case "TRANSCRIPT_PENDING":
      return {
        state: {
          ...state,
          pendingUser: event.buffers.user,
          pendingAI: event.buffers.ai,
        },
        commands: [],
      };

    case "AI_SPEAKING_CHANGED":
      return {
        state: { ...state, isAiSpeaking: event.isSpeaking },
        commands: [],
      };

    case "TIMER_TICK":
      if (state.status === "INTERVIEW_COMPLETE") {
        return { state, commands: [] };
      }
      return {
        state: { ...state, elapsedTime: state.elapsedTime + 1 },
        commands: [],
      };
  }

  // State-specific event handlers
  switch (state.status) {
    case "WAITING_FOR_CONNECTION":
      if (event.type === "CONNECTION_READY") {
        return {
          state: {
            status: "ANSWERING",
            blockIndex: event.initialBlockIndex,
            blockStartTime: now,
            answerStartTime: now,
            ...createCommonFields(state),
          },
          commands: [
            { type: "START_CONNECTION", blockNumber: event.initialBlockIndex },
          ],
        };
      }
      return { state, commands: [] };

    case "ANSWERING":
      if (event.type === "TICK") {
        // 1. Block Limit (hard limit - checked first, 0 = no limit)
        if (
          context.blockDuration > 0 &&
          isTimeUp(state.blockStartTime, context.blockDuration, now)
        ) {
          return {
            state: {
              ...state,
              status: "BLOCK_COMPLETE_SCREEN",
              completedBlockIndex: state.blockIndex,
            },
            commands: [],
          };
        }
        // 2. Answer Limit (soft limit - checked second, 0 = no limit)
        if (
          context.answerTimeLimit > 0 &&
          isTimeUp(state.answerStartTime, context.answerTimeLimit, now)
        ) {
          return {
            state: {
              ...state,
              status: "ANSWER_TIMEOUT_PAUSE",
              pauseStartedAt: now,
            },
            commands: [{ type: "MUTE_MIC" }],
          };
        }
        return { state, commands: [] };
      }
      return { state, commands: [] };

    case "ANSWER_TIMEOUT_PAUSE":
      // NOTE: Block timer continues during this 3-second pause (mic is blocked).
      // The 3-second duration is negligible relative to block duration (10+ minutes),
      // so we don't adjust blockStartTime. This simplifies the implementation.
      if (event.type === "TICK") {
        const elapsed = now - state.pauseStartedAt;
        if (elapsed >= TIMER_CONFIG.ANSWER_TIMEOUT_PAUSE_DURATION_MS) {
          return {
            state: {
              ...state,
              status: "ANSWERING",
              answerStartTime: now, // Reset answer timer
            },
            commands: [{ type: "UNMUTE_MIC" }],
          };
        }
        return { state, commands: [] };
      }
      return { state, commands: [] };

    case "BLOCK_COMPLETE_SCREEN":
      if (event.type === "USER_CLICKED_CONTINUE") {
        const nextIdx = state.completedBlockIndex + 1;
        if (nextIdx >= context.totalBlocks) {
          return {
            state: {
              ...state,
              status: "INTERVIEW_COMPLETE",
            },
            commands: [],
          };
        }
        return {
          state: {
            ...state,
            status: "ANSWERING",
            blockIndex: nextIdx,
            blockStartTime: now,
            answerStartTime: now,
          },
          commands: [],
        };
      }
      return { state, commands: [] };

    case "INTERVIEW_COMPLETE":
      return { state, commands: [] };

    default:
      return { state, commands: [] };
  }
}
