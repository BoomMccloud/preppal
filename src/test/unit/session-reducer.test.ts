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

    it("should transition to next block when USER_CLICKED_CONTINUE", () => {
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

      expect(result.state).toMatchObject({
        status: "ANSWERING",
        blockIndex: 1,
        blockStartTime: now,
        answerStartTime: now,
      });
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

      expect(result.state.status).toBe("ANSWERING");
      expect(result.state).toMatchObject({
        blockIndex: 1,
        blockStartTime: now,
        answerStartTime: now,
      });
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
      expect(result.commands).toHaveLength(2);
      expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
      expect(result.commands).toContainEqual({ type: "CLOSE_CONNECTION" });
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
      expect(result.commands).toHaveLength(2);
      expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
      expect(result.commands).toContainEqual({ type: "CLOSE_CONNECTION" });
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
      expect(result.commands).toHaveLength(2);
      expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
      expect(result.commands).toContainEqual({ type: "CLOSE_CONNECTION" });
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

      // 3. User clicks continue to next block
      now += 5000;
      result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
        now,
      );
      expect(result.state.status).toBe("ANSWERING");
      if (result.state.status === "ANSWERING") {
        expect(result.state.blockIndex).toBe(1);
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
});
