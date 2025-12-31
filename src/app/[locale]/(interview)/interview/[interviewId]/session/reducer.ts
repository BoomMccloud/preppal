// Pure reducer function for the interview session state machine (v5: Dumb Driver)
// All state transitions are driven by events and commands are generated for the driver
// The reducer accepts injectable 'now' parameter for deterministic testing

import { isTimeUp } from "~/lib/countdown-timer";
import {
  WS_CLOSE_USER_INITIATED,
  WS_CLOSE_TIMEOUT,
  WS_CLOSE_GEMINI_ENDED,
  WS_CLOSE_ERROR,
  WS_CLOSE_BLOCK_RECONNECT,
} from "~/lib/constants/interview";
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
  // Debug: Log all events that could terminate the interview
  if (
    event.type === "INTERVIEW_ENDED" ||
    event.type === "CONNECTION_CLOSED" ||
    event.type === "CONNECTION_ERROR" ||
    event.type === "USER_CLICKED_CONTINUE"
  ) {
    console.log("[Reducer] Event received:", {
      eventType: event.type,
      currentStatus: state.status,
      context: { totalBlocks: context.totalBlocks },
      ...(state.status === "BLOCK_COMPLETE_SCREEN" && {
        completedBlockIndex: state.completedBlockIndex,
      }),
      ...(event.type === "CONNECTION_CLOSED" && { closeCode: event.code }),
    });
  }

  // Global Event Handler: INTERVIEW_ENDED
  // Can happen from any state (e.g., user clicks "End Interview")
  if (event.type === "INTERVIEW_ENDED") {
    return {
      state: {
        ...state,
        status: "INTERVIEW_COMPLETE",
      },
      commands: [
        { type: "STOP_AUDIO" },
        { type: "CLOSE_CONNECTION" },
        { type: "COMPLETE_INTERVIEW" },
      ],
    };
  }

  // Dev-only events - only processed in development mode
  // These allow developers to step through block states without waiting for timers
  if (process.env.NODE_ENV !== "production") {
    // DEV_FORCE_BLOCK_COMPLETE: Skip directly to block complete screen
    // Emits COMPLETE_BLOCK command to match normal block advancement behavior
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
          commands: [
            { type: "COMPLETE_BLOCK", blockNumber: state.blockIndex + 1 },
          ],
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
      // If in WAITING_FOR_CONNECTION, auto-transition to ANSWERING
      if (state.status === "WAITING_FOR_CONNECTION") {
        const blockIndex = state.targetBlockIndex ?? 0;
        return {
          state: {
            status: "ANSWERING",
            blockIndex,
            blockStartTime: now,
            answerStartTime: now,
            ...createCommonFields({ ...state, connectionState: "live" }),
          },
          commands: [{ type: "START_CONNECTION", blockNumber: blockIndex + 1 }],
        };
      }
      // Otherwise just update connection state
      return {
        state: { ...state, connectionState: "live" },
        commands: [],
      };

    case "CONNECTION_CLOSED": {
      // If we're here, the event passed the driver's stale socket guard,
      // meaning it's from the CURRENT socket. Always handle it.

      // Check if this is an error close code
      const isNormalClose =
        event.code === WS_CLOSE_USER_INITIATED ||
        event.code === WS_CLOSE_TIMEOUT ||
        event.code === WS_CLOSE_GEMINI_ENDED ||
        event.code === WS_CLOSE_BLOCK_RECONNECT ||
        event.code === 1000; // Standard WebSocket normal close

      const isErrorCode =
        event.code === WS_CLOSE_ERROR ||
        (!isNormalClose && event.code !== 1000);

      // Block reconnect close (4005) during WAITING_FOR_CONNECTION is expected
      // This happens when the old socket closes while we're waiting for the new one
      if (event.code === WS_CLOSE_BLOCK_RECONNECT) {
        return {
          state: { ...state, connectionState: "ending" },
          commands: [],
        };
      }

      // Connection closed while WAITING = connection failed to establish
      // This handles the "new socket fails" race condition
      if (state.status === "WAITING_FOR_CONNECTION") {
        console.log(
          "[Reducer] >>> ENDING INTERVIEW: Connection closed while WAITING_FOR_CONNECTION",
          {
            closeCode: event.code,
            targetBlockIndex: state.targetBlockIndex,
          },
        );
        return {
          state: {
            ...state,
            status: "INTERVIEW_COMPLETE",
            connectionState: "error",
            error: "Connection failed",
          },
          commands: [{ type: "STOP_AUDIO" }],
        };
      }

      // Error code during active session = error state
      if (isErrorCode) {
        console.log(
          "[Reducer] >>> ENDING INTERVIEW: Error close code during active session",
          {
            closeCode: event.code,
            currentStatus: state.status,
          },
        );
        return {
          state: {
            ...state,
            status: "INTERVIEW_COMPLETE",
            connectionState: "error",
            error: "Connection lost",
          },
          commands: [{ type: "STOP_AUDIO" }],
        };
      }

      // Normal close (timeout, user-initiated, Gemini ended)
      return {
        state: { ...state, connectionState: "ending" },
        commands: [],
      };
    }

    case "CONNECTION_ERROR":
      console.log("[Reducer] >>> ENDING INTERVIEW: CONNECTION_ERROR", {
        error: event.error,
        currentStatus: state.status,
      });
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
      // CONNECTION_ESTABLISHED now handles auto-transition to ANSWERING
      return { state, commands: [] };

    case "ANSWERING":
      // Handle manual "Next" button click
      if (event.type === "USER_CLICKED_NEXT") {
        return {
          state: {
            ...state,
            status: "BLOCK_COMPLETE_SCREEN",
            completedBlockIndex: state.blockIndex,
          },
          commands: [
            { type: "COMPLETE_BLOCK", blockNumber: state.blockIndex + 1 },
          ],
        };
      }
      if (event.type === "TICK") {
        // Answer timeout (0 = no limit)
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
      // 3-second pause before advancing to block complete screen
      if (event.type === "TICK") {
        const elapsed = now - state.pauseStartedAt;
        if (elapsed >= TIMER_CONFIG.ANSWER_TIMEOUT_PAUSE_DURATION_MS) {
          return {
            state: {
              ...state,
              status: "BLOCK_COMPLETE_SCREEN",
              completedBlockIndex: state.blockIndex,
            },
            commands: [
              { type: "COMPLETE_BLOCK", blockNumber: state.blockIndex + 1 },
            ],
          };
        }
        return { state, commands: [] };
      }
      return { state, commands: [] };

    case "BLOCK_COMPLETE_SCREEN":
      if (event.type === "USER_CLICKED_CONTINUE") {
        const nextIdx = state.completedBlockIndex + 1;
        console.log(
          "[Reducer] BLOCK_COMPLETE_SCREEN -> USER_CLICKED_CONTINUE:",
          {
            completedBlockIndex: state.completedBlockIndex,
            nextIdx,
            totalBlocks: context.totalBlocks,
            isLastBlock: nextIdx >= context.totalBlocks,
          },
        );
        if (nextIdx >= context.totalBlocks) {
          console.log("[Reducer] >>> ENDING INTERVIEW: Last block completed");
          return {
            state: {
              ...state,
              status: "INTERVIEW_COMPLETE",
            },
            commands: [
              { type: "STOP_AUDIO" },
              { type: "CLOSE_CONNECTION" },
              {
                type: "COMPLETE_BLOCK",
                blockNumber: state.completedBlockIndex + 1,
              },
              { type: "COMPLETE_INTERVIEW" },
            ],
          };
        }
        console.log("[Reducer] >>> TRANSITIONING TO NEXT BLOCK:", nextIdx);
        // Go through WAITING_FOR_CONNECTION to avoid race conditions
        // CONNECTION_ESTABLISHED will auto-transition to ANSWERING with fresh timestamps
        return {
          state: {
            ...state,
            status: "WAITING_FOR_CONNECTION",
            targetBlockIndex: nextIdx,
            connectionState: "connecting",
          },
          commands: [{ type: "RECONNECT_FOR_BLOCK", blockNumber: nextIdx + 1 }],
        };
      }
      return { state, commands: [] };

    case "INTERVIEW_COMPLETE":
      return { state, commands: [] };

    default:
      return { state, commands: [] };
  }
}
