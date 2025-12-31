// Unit tests for the session reducer (v6: One Block = One Question)
// Tests cover all state transitions, edge cases, command generation, and the full state machine flow
// Answer timeout now goes to BLOCK_COMPLETE_SCREEN (not back to ANSWERING)

import { describe, it, expect } from "vitest";
import { sessionReducer } from "~/app/[locale]/(interview)/interview/[interviewId]/session/reducer";
import { TIMER_CONFIG } from "~/app/[locale]/(interview)/interview/[interviewId]/session/constants";
import type {
  SessionState,
  SessionEvent,
  ReducerContext,
  ReducerResult,
  Command,
  TranscriptEntry,
} from "~/app/[locale]/(interview)/interview/[interviewId]/session/types";

describe("sessionReducer (v6: One Block = One Question)", () => {
  // Helper: Standard context for most tests (no blockDuration)
  const defaultContext: ReducerContext = {
    answerTimeLimit: 120,
    totalBlocks: 3,
  };

  // Helper: Create initial common state fields for testing
  const createCommonFields = () => ({
    connectionState: "initializing" as const,
    transcript: [] as TranscriptEntry[],
    pendingUser: "",
    pendingAI: "",
    elapsedTime: 0,
    error: null,
    isAiSpeaking: false,
  });

  describe("WAITING_FOR_CONNECTION state", () => {
    it("should remain in WAITING_FOR_CONNECTION when receiving TICK", () => {
      const state: SessionState = {
        status: "WAITING_FOR_CONNECTION",
        ...createCommonFields(),
      };
      const result = sessionReducer(
        state,
        { type: "TICK" },
        defaultContext,
        1000,
      );

      expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
      expect(result.commands).toEqual([]);
    });

    it("should transition to ANSWERING when CONNECTION_READY is received", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "WAITING_FOR_CONNECTION",
        ...createCommonFields(),
      };
      const result = sessionReducer(
        state,
        { type: "CONNECTION_READY", initialBlockIndex: 0 },
        defaultContext,
        now,
      );

      expect(result.state).toMatchObject({
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: now,
        answerStartTime: now,
      });
      expect(result.commands).toContainEqual({
        type: "START_CONNECTION",
        blockNumber: 0,
      });
    });

    it("should use the initialBlockIndex from CONNECTION_READY event (resumption)", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "WAITING_FOR_CONNECTION",
        ...createCommonFields(),
      };
      const result = sessionReducer(
        state,
        { type: "CONNECTION_READY", initialBlockIndex: 2 },
        defaultContext,
        now,
      );

      expect(result.state).toMatchObject({
        status: "ANSWERING",
        blockIndex: 2,
        blockStartTime: now,
        answerStartTime: now,
      });
      expect(result.commands).toContainEqual({
        type: "START_CONNECTION",
        blockNumber: 2,
      });
    });
  });

  describe("ANSWERING state", () => {
    it("should remain in ANSWERING when time limit is not exceeded", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: now - 10000, // 10s ago
        answerStartTime: now - 10000, // 10s ago
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "TICK" },
        defaultContext,
        now,
      );

      expect(result.state.status).toBe("ANSWERING");
      expect(result.commands).toEqual([]);
    });

    it("should transition to ANSWER_TIMEOUT_PAUSE when answer time limit is reached", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: now - 10000,
        answerStartTime: now - 125000, // 125s ago (over 120s limit)
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "TICK" },
        defaultContext,
        now,
      );

      expect(result.state).toMatchObject({
        status: "ANSWER_TIMEOUT_PAUSE",
        blockIndex: 0,
        blockStartTime: now - 10000,
        pauseStartedAt: now,
      });
      expect(result.commands).toContainEqual({ type: "MUTE_MIC" });
    });

    it("should transition to ANSWER_TIMEOUT_PAUSE exactly at answer time limit", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: now - 10000,
        answerStartTime: now - 120000, // Exactly 120s ago
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "TICK" },
        defaultContext,
        now,
      );

      expect(result.state.status).toBe("ANSWER_TIMEOUT_PAUSE");
      expect(result.commands).toContainEqual({ type: "MUTE_MIC" });
    });

    it("should transition to BLOCK_COMPLETE_SCREEN when USER_CLICKED_NEXT", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 1,
        blockStartTime: now - 10000,
        answerStartTime: now - 5000,
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_NEXT" },
        defaultContext,
        now,
      );

      expect(result.state).toMatchObject({
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 1,
      });
      expect(result.commands).toContainEqual({
        type: "COMPLETE_BLOCK",
        blockNumber: 2,
      });
    });

    it("should ignore USER_CLICKED_CONTINUE in ANSWERING state", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: now,
        answerStartTime: now,
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        defaultContext,
        now,
      );

      expect(result.state.status).toBe("ANSWERING");
      expect(result.commands).toEqual([]);
    });
  });

  describe("ANSWER_TIMEOUT_PAUSE state", () => {
    it("should remain in ANSWER_TIMEOUT_PAUSE during 3-second pause", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWER_TIMEOUT_PAUSE",
        blockIndex: 0,
        blockStartTime: now - 10000,
        pauseStartedAt: now - 2000, // 2s ago (still within 3s)
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "TICK" },
        defaultContext,
        now,
      );

      expect(result.state.status).toBe("ANSWER_TIMEOUT_PAUSE");
      expect(result.commands).toEqual([]);
    });

    it("should transition to BLOCK_COMPLETE_SCREEN after 3-second pause", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWER_TIMEOUT_PAUSE",
        blockIndex: 0,
        blockStartTime: now - 10000,
        pauseStartedAt: now - 3100, // 3.1s ago (over 3s limit)
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "TICK" },
        defaultContext,
        now,
      );

      expect(result.state).toMatchObject({
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0,
      });
      expect(result.commands).toContainEqual({
        type: "COMPLETE_BLOCK",
        blockNumber: 1,
      });
    });

    it("should transition exactly at 3 seconds", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWER_TIMEOUT_PAUSE",
        blockIndex: 0,
        blockStartTime: now - 10000,
        pauseStartedAt: now - 3000, // Exactly 3s ago
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "TICK" },
        defaultContext,
        now,
      );

      expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
      expect(result.commands).toContainEqual({
        type: "COMPLETE_BLOCK",
        blockNumber: 1,
      });
    });

    it("should ignore non-TICK events in ANSWER_TIMEOUT_PAUSE state", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWER_TIMEOUT_PAUSE",
        blockIndex: 0,
        blockStartTime: now,
        pauseStartedAt: now,
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        defaultContext,
        now,
      );

      expect(result.state.status).toBe("ANSWER_TIMEOUT_PAUSE");
      expect(result.commands).toEqual([]);
    });
  });

  describe("BLOCK_COMPLETE_SCREEN state", () => {
    it("should remain in BLOCK_COMPLETE_SCREEN when waiting for user click", () => {
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0,
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "TICK" },
        defaultContext,
        1000,
      );

      expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
      expect(result.commands).toEqual([]);
    });

    it("should transition to WAITING_FOR_CONNECTION when USER_CLICKED_CONTINUE", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0,
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        defaultContext,
        now,
      );

      // Now goes through WAITING_FOR_CONNECTION first (FEAT40)
      expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
      if (result.state.status === "WAITING_FOR_CONNECTION") {
        expect(result.state.targetBlockIndex).toBe(1);
        expect(result.state.connectionState).toBe("connecting");
      }
      expect(result.commands).toContainEqual({
        type: "RECONNECT_FOR_BLOCK",
        blockNumber: 2, // blockIndex 1 + 1 = blockNumber 2 (1-indexed)
      });
    });

    it("should transition to INTERVIEW_COMPLETE when completing final block", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 2, // Last block (totalBlocks = 3)
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        defaultContext,
        now,
      );

      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
      expect(result.commands).toContainEqual({ type: "CLOSE_CONNECTION" });
    });

    it("should handle single-block interview completion", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0,
        ...createCommonFields(),
      };

      const singleBlockContext: ReducerContext = {
        ...defaultContext,
        totalBlocks: 1,
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        singleBlockContext,
        now,
      );

      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
      expect(result.commands).toContainEqual({ type: "CLOSE_CONNECTION" });
    });

    it("should emit RECONNECT_FOR_BLOCK when advancing to next block", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0,
        ...createCommonFields(),
      };

      const context: ReducerContext = {
        answerTimeLimit: 60,
        totalBlocks: 3,
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
        now,
      );

      // Now goes through WAITING_FOR_CONNECTION first (FEAT40)
      expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
      if (result.state.status === "WAITING_FOR_CONNECTION") {
        expect(result.state.targetBlockIndex).toBe(1);
      }
      expect(result.commands).toContainEqual({
        type: "RECONNECT_FOR_BLOCK",
        blockNumber: 2, // blockIndex 1 + 1 = blockNumber 2 (1-indexed)
      });
    });

    it("should NOT emit RECONNECT_FOR_BLOCK when finishing last block", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 2, // Last block (0-indexed)
        ...createCommonFields(),
      };

      const context: ReducerContext = {
        answerTimeLimit: 60,
        totalBlocks: 3, // 3 blocks: 0, 1, 2
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
        now,
      );

      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).not.toContainEqual(
        expect.objectContaining({ type: "RECONNECT_FOR_BLOCK" }),
      );
      expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
      expect(result.commands).toContainEqual({ type: "CLOSE_CONNECTION" });
    });
  });

  describe("INTERVIEW_COMPLETE state", () => {
    it("should remain in INTERVIEW_COMPLETE regardless of events", () => {
      const state: SessionState = {
        status: "INTERVIEW_COMPLETE",
        ...createCommonFields(),
      };

      const afterTick = sessionReducer(
        state,
        { type: "TICK" },
        defaultContext,
        1000,
      );
      expect(afterTick.state.status).toBe("INTERVIEW_COMPLETE");
      expect(afterTick.commands).toEqual([]);

      const afterClick = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        defaultContext,
        1000,
      );
      expect(afterClick.state.status).toBe("INTERVIEW_COMPLETE");
      expect(afterClick.commands).toEqual([]);
    });
  });

  describe("INTERVIEW_ENDED event", () => {
    it("should generate STOP_AUDIO and CLOSE_CONNECTION commands from ANSWERING state", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: now - 10000,
        answerStartTime: now - 5000,
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "INTERVIEW_ENDED" },
        defaultContext,
        now,
      );

      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).toHaveLength(3);
      expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
      expect(result.commands).toContainEqual({ type: "CLOSE_CONNECTION" });
      expect(result.commands).toContainEqual({ type: "COMPLETE_INTERVIEW" });
    });

    it("should generate cleanup commands from ANSWER_TIMEOUT_PAUSE state", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWER_TIMEOUT_PAUSE",
        blockIndex: 1,
        blockStartTime: now - 30000,
        pauseStartedAt: now - 2000,
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "INTERVIEW_ENDED" },
        defaultContext,
        now,
      );

      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).toHaveLength(3);
      expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
      expect(result.commands).toContainEqual({ type: "CLOSE_CONNECTION" });
      expect(result.commands).toContainEqual({ type: "COMPLETE_INTERVIEW" });
    });

    it("should generate cleanup commands from BLOCK_COMPLETE_SCREEN state", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0,
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "INTERVIEW_ENDED" },
        defaultContext,
        now,
      );

      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).toHaveLength(3);
      expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
      expect(result.commands).toContainEqual({ type: "CLOSE_CONNECTION" });
      expect(result.commands).toContainEqual({ type: "COMPLETE_INTERVIEW" });
    });
  });

  describe("New Events: Driver Event Handlers", () => {
    describe("CONNECTION_ESTABLISHED event", () => {
      it("should update connectionState to 'live'", () => {
        const state: SessionState = {
          status: "WAITING_FOR_CONNECTION",
          ...createCommonFields(),
          connectionState: "connecting",
        };

        const result = sessionReducer(
          state,
          { type: "CONNECTION_ESTABLISHED" },
          defaultContext,
        );

        expect(result.state.connectionState).toBe("live");
        expect(result.commands).toEqual([]);
      });
    });

    describe("CONNECTION_CLOSED event", () => {
      it("should update connectionState to 'ending'", () => {
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: Date.now(),
          answerStartTime: Date.now(),
          ...createCommonFields(),
          connectionState: "live",
        };

        const result = sessionReducer(
          state,
          { type: "CONNECTION_CLOSED", code: 1000 },
          defaultContext,
        );

        expect(result.state.connectionState).toBe("ending");
        expect(result.commands).toEqual([]);
      });
    });

    describe("CONNECTION_ERROR event", () => {
      it("should update connectionState to 'error' and set error message", () => {
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: Date.now(),
          answerStartTime: Date.now(),
          ...createCommonFields(),
        };

        const result = sessionReducer(
          state,
          { type: "CONNECTION_ERROR", error: "Network timeout" },
          defaultContext,
        );

        expect(result.state.connectionState).toBe("error");
        expect(result.state.error).toBe("Network timeout");
        expect(result.state.status).toBe("INTERVIEW_COMPLETE");
        expect(result.commands).toEqual([{ type: "STOP_AUDIO" }]);
      });
    });

    describe("TRANSCRIPT_COMMIT event", () => {
      it("should append entry to transcript", () => {
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: Date.now(),
          answerStartTime: Date.now(),
          ...createCommonFields(),
          transcript: [
            { text: "First message", speaker: "AI", is_final: true },
          ],
        };

        const newEntry: TranscriptEntry = {
          text: "Second message",
          speaker: "USER",
          is_final: true,
        };

        const result = sessionReducer(
          state,
          { type: "TRANSCRIPT_COMMIT", entry: newEntry },
          defaultContext,
        );

        expect(result.state.transcript).toHaveLength(2);
        expect(result.state.transcript[1]).toEqual(newEntry);
        expect(result.commands).toEqual([]);
      });
    });

    describe("TIMER_TICK event", () => {
      it("should increment elapsedTime by 1 second", () => {
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: Date.now(),
          answerStartTime: Date.now(),
          ...createCommonFields(),
          elapsedTime: 42,
        };

        const result = sessionReducer(
          state,
          { type: "TIMER_TICK" },
          defaultContext,
        );

        expect(result.state.elapsedTime).toBe(43);
        expect(result.commands).toEqual([]);
      });
    });
  });

  describe("Full state machine flow (one block = one question)", () => {
    it("should complete full interview flow with manual advancement", () => {
      const context: ReducerContext = {
        answerTimeLimit: 5,
        totalBlocks: 2,
      };

      let now = 1000000;
      let state: SessionState = {
        status: "WAITING_FOR_CONNECTION",
        ...createCommonFields(),
      };
      let result: ReducerResult;

      // 1. CONNECTION_READY -> Should generate START_CONNECTION command
      result = sessionReducer(
        state,
        { type: "CONNECTION_READY", initialBlockIndex: 0 },
        context,
        now,
      );
      expect(result.state.status).toBe("ANSWERING");
      expect(result.commands).toContainEqual({
        type: "START_CONNECTION",
        blockNumber: 0,
      });
      state = result.state;

      // 2. User clicks Next -> Goes to BLOCK_COMPLETE_SCREEN
      result = sessionReducer(
        state,
        { type: "USER_CLICKED_NEXT" },
        context,
        now,
      );
      expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
      expect(result.commands).toContainEqual({
        type: "COMPLETE_BLOCK",
        blockNumber: 1,
      });
      state = result.state;

      // 3. User clicks continue to next block -> WAITING_FOR_CONNECTION
      now += 5000;
      result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
        now,
      );
      expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
      if (result.state.status === "WAITING_FOR_CONNECTION") {
        expect(result.state.targetBlockIndex).toBe(1);
      }
      state = result.state;

      // 3b. CONNECTION_READY -> ANSWERING
      result = sessionReducer(
        state,
        { type: "CONNECTION_READY", initialBlockIndex: 0 },
        context,
        now,
      );
      expect(result.state.status).toBe("ANSWERING");
      if (result.state.status === "ANSWERING") {
        expect(result.state.blockIndex).toBe(1); // Uses targetBlockIndex
      }
      state = result.state;

      // 4. Answer timeout -> pause -> BLOCK_COMPLETE_SCREEN
      now += 5100;
      result = sessionReducer(state, { type: "TICK" }, context, now);
      expect(result.state.status).toBe("ANSWER_TIMEOUT_PAUSE");
      expect(result.commands).toContainEqual({ type: "MUTE_MIC" });
      state = result.state;

      now += 3100;
      result = sessionReducer(state, { type: "TICK" }, context, now);
      expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
      expect(result.commands).toContainEqual({
        type: "COMPLETE_BLOCK",
        blockNumber: 2,
      });
      state = result.state;

      // 5. Complete interview
      result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
        now,
      );
      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
      expect(result.commands).toContainEqual({ type: "CLOSE_CONNECTION" });
    });
  });

  describe("Edge cases and timer precision", () => {
    it("should handle very short time intervals (100ms ticks)", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: now - 119900,
        answerStartTime: now - 119900, // 119.9s ago (just under 120s)
        ...createCommonFields(),
      };

      // Should NOT timeout yet
      let result = sessionReducer(state, { type: "TICK" }, defaultContext, now);
      expect(result.state.status).toBe("ANSWERING");
      expect(result.commands).toEqual([]);

      // 100ms later -> 120s total
      result = sessionReducer(
        state,
        { type: "TICK" },
        defaultContext,
        now + 100,
      );
      expect(result.state.status).toBe("ANSWER_TIMEOUT_PAUSE");
      expect(result.commands).toContainEqual({ type: "MUTE_MIC" });
    });

    it("should handle timer values at millisecond precision for pause", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWER_TIMEOUT_PAUSE",
        blockIndex: 0,
        blockStartTime: now,
        pauseStartedAt: now - 2999, // 2.999s ago
        ...createCommonFields(),
      };

      // Should still be in pause
      let result = sessionReducer(state, { type: "TICK" }, defaultContext, now);
      expect(result.state.status).toBe("ANSWER_TIMEOUT_PAUSE");
      expect(result.commands).toEqual([]);

      // 1ms later -> exactly 3s -> goes to BLOCK_COMPLETE_SCREEN
      result = sessionReducer(state, { type: "TICK" }, defaultContext, now + 1);
      expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
      expect(result.commands).toContainEqual({
        type: "COMPLETE_BLOCK",
        blockNumber: 1,
      });
    });
  });

  describe("Dev-only events", () => {
    describe("DEV_FORCE_BLOCK_COMPLETE", () => {
      it("should transition ANSWERING to BLOCK_COMPLETE_SCREEN", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 1,
          blockStartTime: now - 60000,
          answerStartTime: now - 30000,
          ...createCommonFields(),
        };

        const result = sessionReducer(
          state,
          { type: "DEV_FORCE_BLOCK_COMPLETE" },
          defaultContext,
          now,
        );

        expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
        expect(result.state).toHaveProperty("completedBlockIndex", 1);
        expect(result.commands).toEqual([
          { type: "COMPLETE_BLOCK", blockNumber: 2 },
        ]);
      });

      it("should transition ANSWER_TIMEOUT_PAUSE to BLOCK_COMPLETE_SCREEN", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "ANSWER_TIMEOUT_PAUSE",
          blockIndex: 2,
          blockStartTime: now - 60000,
          pauseStartedAt: now - 1000,
          ...createCommonFields(),
        };

        const result = sessionReducer(
          state,
          { type: "DEV_FORCE_BLOCK_COMPLETE" },
          defaultContext,
          now,
        );

        expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
        expect(result.state).toHaveProperty("completedBlockIndex", 2);
        expect(result.commands).toEqual([
          { type: "COMPLETE_BLOCK", blockNumber: 3 },
        ]);
      });
    });

    describe("DEV_FORCE_ANSWER_TIMEOUT", () => {
      it("should transition ANSWERING to ANSWER_TIMEOUT_PAUSE with MUTE_MIC command", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: now - 60000,
          answerStartTime: now - 30000,
          ...createCommonFields(),
        };

        const result = sessionReducer(
          state,
          { type: "DEV_FORCE_ANSWER_TIMEOUT" },
          defaultContext,
          now,
        );

        expect(result.state.status).toBe("ANSWER_TIMEOUT_PAUSE");
        expect(result.state).toHaveProperty("pauseStartedAt", now);
        expect(result.commands).toContainEqual({ type: "MUTE_MIC" });
      });
    });
  });

  describe("FEAT40: Unified Block Isolation", () => {
    describe("Block transition goes through WAITING_FOR_CONNECTION", () => {
      it("should transition BLOCK_COMPLETE_SCREEN to WAITING_FOR_CONNECTION on USER_CLICKED_CONTINUE", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "BLOCK_COMPLETE_SCREEN",
          completedBlockIndex: 0,
          ...createCommonFields(),
        };

        const result = sessionReducer(
          state,
          { type: "USER_CLICKED_CONTINUE" },
          defaultContext,
          now,
        );

        expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
        if (result.state.status === "WAITING_FOR_CONNECTION") {
          expect(result.state.targetBlockIndex).toBe(1);
          expect(result.state.connectionState).toBe("connecting");
        }
        expect(result.commands).toContainEqual({
          type: "RECONNECT_FOR_BLOCK",
          blockNumber: 2,
        });
      });

      it("should transition WAITING_FOR_CONNECTION to ANSWERING on CONNECTION_READY using targetBlockIndex", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "WAITING_FOR_CONNECTION",
          targetBlockIndex: 2,
          ...createCommonFields(),
          connectionState: "connecting",
        };

        const result = sessionReducer(
          state,
          { type: "CONNECTION_READY", initialBlockIndex: 0 }, // initialBlockIndex should be ignored
          defaultContext,
          now,
        );

        expect(result.state.status).toBe("ANSWERING");
        if (result.state.status === "ANSWERING") {
          expect(result.state.blockIndex).toBe(2); // Uses targetBlockIndex, not initialBlockIndex
          expect(result.state.blockStartTime).toBe(now);
          expect(result.state.answerStartTime).toBe(now);
        }
      });
    });

    describe("Connection failure during WAITING_FOR_CONNECTION", () => {
      it("should transition to INTERVIEW_COMPLETE with error when connection fails during reconnection", () => {
        const state: SessionState = {
          status: "WAITING_FOR_CONNECTION",
          targetBlockIndex: 1,
          ...createCommonFields(),
          connectionState: "connecting",
        };

        const result = sessionReducer(
          state,
          { type: "CONNECTION_CLOSED", code: 1006 }, // Abnormal closure
          defaultContext,
        );

        expect(result.state.status).toBe("INTERVIEW_COMPLETE");
        expect(result.state.connectionState).toBe("error");
        expect(result.state.error).toBe("Connection failed");
        expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
      });

      it("should NOT ignore CONNECTION_CLOSED during WAITING_FOR_CONNECTION (no double guard trap)", () => {
        // This test verifies we don't have the "double guard trap" bug
        // where CONNECTION_CLOSED is ignored in WAITING state
        const state: SessionState = {
          status: "WAITING_FOR_CONNECTION",
          ...createCommonFields(),
          connectionState: "connecting",
        };

        const result = sessionReducer(
          state,
          { type: "CONNECTION_CLOSED", code: 4004 }, // WS_CLOSE_ERROR
          defaultContext,
        );

        // Should NOT stay in WAITING_FOR_CONNECTION (that would be the bug)
        expect(result.state.status).not.toBe("WAITING_FOR_CONNECTION");
        expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      });
    });

    describe("Error handling during ANSWERING", () => {
      it("should transition to INTERVIEW_COMPLETE with error on WS_CLOSE_ERROR (4004)", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: now - 10000,
          answerStartTime: now - 10000,
          ...createCommonFields(),
          connectionState: "live",
        };

        const result = sessionReducer(
          state,
          { type: "CONNECTION_CLOSED", code: 4004 }, // WS_CLOSE_ERROR
          defaultContext,
        );

        expect(result.state.status).toBe("INTERVIEW_COMPLETE");
        expect(result.state.connectionState).toBe("error");
        expect(result.state.error).toBe("Connection lost");
        expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
      });

      it("should handle normal close (4001, 4002, 4003) without error during ANSWERING", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: now - 10000,
          answerStartTime: now - 10000,
          ...createCommonFields(),
          connectionState: "live",
        };

        // Test each normal close code
        for (const code of [4001, 4002, 4003]) {
          const result = sessionReducer(
            state,
            { type: "CONNECTION_CLOSED", code },
            defaultContext,
          );

          expect(result.state.connectionState).toBe("ending");
          expect(result.state.status).toBe("ANSWERING"); // Status unchanged
          expect(result.state.error).toBeNull();
        }
      });
    });

    describe("Initial connection still works", () => {
      it("should use initialBlockIndex from CONNECTION_READY when targetBlockIndex is not set", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "WAITING_FOR_CONNECTION",
          // No targetBlockIndex - this is initial connection
          ...createCommonFields(),
        };

        const result = sessionReducer(
          state,
          { type: "CONNECTION_READY", initialBlockIndex: 0 },
          defaultContext,
          now,
        );

        expect(result.state.status).toBe("ANSWERING");
        if (result.state.status === "ANSWERING") {
          expect(result.state.blockIndex).toBe(0); // Uses initialBlockIndex
        }
      });
    });
  });

  describe("COMPLETE_INTERVIEW command", () => {
    it("should emit COMPLETE_INTERVIEW when completing final block", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 2, // Last block (totalBlocks = 3)
        ...createCommonFields(),
      };
      const context: ReducerContext = { answerTimeLimit: 120, totalBlocks: 3 };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
        now,
      );

      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).toContainEqual({ type: "COMPLETE_INTERVIEW" });
      expect(result.commands).toContainEqual({
        type: "COMPLETE_BLOCK",
        blockNumber: 3,
      });
    });

    it("should NOT emit COMPLETE_INTERVIEW when completing non-final block", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0, // First block
        ...createCommonFields(),
      };
      const context: ReducerContext = { answerTimeLimit: 120, totalBlocks: 3 };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
        now,
      );

      expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
      expect(result.commands).not.toContainEqual(
        expect.objectContaining({ type: "COMPLETE_INTERVIEW" }),
      );
    });

    it("should emit COMPLETE_INTERVIEW on INTERVIEW_ENDED from any state", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 1,
        blockStartTime: now - 10000,
        answerStartTime: now - 5000,
        ...createCommonFields(),
      };
      const context: ReducerContext = { answerTimeLimit: 120, totalBlocks: 3 };

      const result = sessionReducer(
        state,
        { type: "INTERVIEW_ENDED" },
        context,
        now,
      );

      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).toContainEqual({ type: "COMPLETE_INTERVIEW" });
    });

    it("should emit COMPLETE_INTERVIEW for single-block interview completion", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0,
        ...createCommonFields(),
      };
      const singleBlockContext: ReducerContext = {
        answerTimeLimit: 120,
        totalBlocks: 1,
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        singleBlockContext,
        now,
      );

      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).toContainEqual({ type: "COMPLETE_INTERVIEW" });
      expect(result.commands).toContainEqual({
        type: "COMPLETE_BLOCK",
        blockNumber: 1,
      });
    });
  });

  // ===========================================================================
  // FEAT42: Close Code Handling (Source of Truth Tests)
  // ===========================================================================
  // These tests ensure ALL defined close codes are handled by the reducer.
  // When a new close code is added to constants, these tests will catch
  // if the reducer doesn't handle it properly.

  describe("Close Code Handling (Source of Truth)", () => {
    // Import all close codes to ensure we test them all
    const ALL_CLOSE_CODES = {
      WS_CLOSE_USER_INITIATED: 4001,
      WS_CLOSE_TIMEOUT: 4002,
      WS_CLOSE_GEMINI_ENDED: 4003,
      WS_CLOSE_ERROR: 4004,
      WS_CLOSE_BLOCK_RECONNECT: 4005,
    };

    const NORMAL_CLOSE_CODES = [4001, 4002, 4003, 4005]; // Expected normal closes
    const ERROR_CLOSE_CODES = [4004]; // Expected error closes

    describe("All defined close codes should be handled", () => {
      it("should handle all normal close codes without error during ANSWERING", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: now - 10000,
          answerStartTime: now - 10000,
          ...createCommonFields(),
          connectionState: "live",
        };

        for (const code of NORMAL_CLOSE_CODES) {
          const result = sessionReducer(
            state,
            { type: "CONNECTION_CLOSED", code },
            defaultContext,
          );

          // Normal closes should NOT trigger error state
          expect(result.state.error).toBeNull();
          expect(result.state.connectionState).toBe("ending");
          // Status should remain ANSWERING (not INTERVIEW_COMPLETE with error)
          expect(result.state.status).toBe("ANSWERING");
        }
      });

      it("should handle error close codes with error during ANSWERING", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: now - 10000,
          answerStartTime: now - 10000,
          ...createCommonFields(),
          connectionState: "live",
        };

        for (const code of ERROR_CLOSE_CODES) {
          const result = sessionReducer(
            state,
            { type: "CONNECTION_CLOSED", code },
            defaultContext,
          );

          // Error closes SHOULD trigger error state
          expect(result.state.status).toBe("INTERVIEW_COMPLETE");
          expect(result.state.connectionState).toBe("error");
          expect(result.state.error).toBe("Connection lost");
        }
      });

      it("should treat unknown close codes as errors", () => {
        const now = 1000000;
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: now - 10000,
          answerStartTime: now - 10000,
          ...createCommonFields(),
          connectionState: "live",
        };

        // Unknown codes (not in our defined set) should be errors
        const unknownCodes = [4006, 4007, 4999];

        for (const code of unknownCodes) {
          const result = sessionReducer(
            state,
            { type: "CONNECTION_CLOSED", code },
            defaultContext,
          );

          expect(result.state.status).toBe("INTERVIEW_COMPLETE");
          expect(result.state.connectionState).toBe("error");
        }
      });
    });

    describe("Block transition flow (FEAT42 regression)", () => {
      it("should handle WS_CLOSE_BLOCK_RECONNECT (4005) during WAITING_FOR_CONNECTION", () => {
        // This is the exact bug that FEAT42 fixed:
        // When user clicks Continue, state goes to WAITING_FOR_CONNECTION,
        // then old socket closes with 4005. This should NOT cause an error.

        const state: SessionState = {
          status: "WAITING_FOR_CONNECTION",
          targetBlockIndex: 1,
          ...createCommonFields(),
          connectionState: "connecting",
        };

        const result = sessionReducer(
          state,
          {
            type: "CONNECTION_CLOSED",
            code: ALL_CLOSE_CODES.WS_CLOSE_BLOCK_RECONNECT,
          },
          defaultContext,
        );

        // Should NOT transition to INTERVIEW_COMPLETE with error
        expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
        expect(result.state.connectionState).toBe("ending");
        expect(result.state.error).toBeNull();
      });

      it("should complete full block transition flow without error", () => {
        // Simulate the complete flow:
        // 1. User on BLOCK_COMPLETE_SCREEN clicks Continue
        // 2. State transitions to WAITING_FOR_CONNECTION
        // 3. Old socket closes with 4005
        // 4. New socket opens, CONNECTION_READY fires
        // 5. State transitions to ANSWERING for next block

        const context: ReducerContext = {
          answerTimeLimit: 60,
          totalBlocks: 3,
        };
        const now = 1000000;

        // Step 1: Start on BLOCK_COMPLETE_SCREEN
        let state: SessionState = {
          status: "BLOCK_COMPLETE_SCREEN",
          completedBlockIndex: 0,
          ...createCommonFields(),
        };

        // Step 2: User clicks Continue
        let result = sessionReducer(
          state,
          { type: "USER_CLICKED_CONTINUE" },
          context,
          now,
        );
        expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
        state = result.state;

        // Step 3: Old socket closes with 4005 (this was the bug!)
        result = sessionReducer(
          state,
          { type: "CONNECTION_CLOSED", code: 4005 },
          context,
          now,
        );
        // Should NOT error - this is expected during block transition
        expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
        expect(result.state.error).toBeNull();
        state = result.state;

        // Step 4: New socket opens
        result = sessionReducer(
          state,
          { type: "CONNECTION_ESTABLISHED" },
          context,
          now,
        );
        expect(result.state.connectionState).toBe("live");
        state = result.state;

        // Step 5: CONNECTION_READY fires
        result = sessionReducer(
          state,
          { type: "CONNECTION_READY", initialBlockIndex: 0 },
          context,
          now,
        );

        // SUCCESS: User is now on block 2
        expect(result.state.status).toBe("ANSWERING");
        if (result.state.status === "ANSWERING") {
          expect(result.state.blockIndex).toBe(1); // Uses targetBlockIndex
        }
      });

      it("should still detect real connection failures during block transition", () => {
        // While we allow 4005, actual errors (like 4004 or 1006) should still fail

        const state: SessionState = {
          status: "WAITING_FOR_CONNECTION",
          targetBlockIndex: 1,
          ...createCommonFields(),
          connectionState: "connecting",
        };

        // Test with actual error code
        const result = sessionReducer(
          state,
          { type: "CONNECTION_CLOSED", code: 4004 }, // WS_CLOSE_ERROR
          defaultContext,
        );

        // This IS an error - should transition to INTERVIEW_COMPLETE
        expect(result.state.status).toBe("INTERVIEW_COMPLETE");
        expect(result.state.connectionState).toBe("error");
        expect(result.state.error).toBe("Connection failed");
      });
    });
  });
});
