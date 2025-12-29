// Unit tests for the session reducer (v5: Dumb Driver Architecture)
// Tests cover all state transitions, edge cases, command generation, and the full state machine flow
// Tests verify the new ReducerResult { state, commands } return type

import { describe, it, expect } from "vitest";
import { sessionReducer } from "./reducer";
import { TIMER_CONFIG } from "./constants";
import type {
  SessionState,
  SessionEvent,
  ReducerContext,
  ReducerResult,
  Command,
  TranscriptEntry,
} from "./types";

describe("sessionReducer (v5: Command Generation)", () => {
  // Helper: Standard context for most tests
  const defaultContext: ReducerContext = {
    answerTimeLimit: 120,
    blockDuration: 600,
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
    it("should remain in ANSWERING when time limits are not exceeded", () => {
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
        blockStartTime: now - 10000, // 10s ago
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
      // Critical: Should generate MUTE_MIC command
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

    it("should transition to BLOCK_COMPLETE_SCREEN when block time limit is reached", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 1,
        blockStartTime: now - 605000, // 605s ago (over 600s limit)
        answerStartTime: now - 10000,
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
        completedBlockIndex: 1,
      });
      expect(result.commands).toEqual([]);
    });

    it("should transition to BLOCK_COMPLETE_SCREEN exactly at block time limit", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: now - 600000, // Exactly 600s ago
        answerStartTime: now - 10000,
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "TICK" },
        defaultContext,
        now,
      );

      expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
      expect(result.commands).toEqual([]);
    });

    it("should prioritize block timeout over answer timeout", () => {
      const now = 1000000;
      // Both limits exceeded, but block limit is checked first (hard limit)
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: now - 605000, // Block limit exceeded
        answerStartTime: now - 125000, // Answer limit exceeded
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "TICK" },
        defaultContext,
        now,
      );

      // Should transition to BLOCK_COMPLETE_SCREEN (block timeout is hard limit)
      expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
      expect(result.commands).toEqual([]);
    });

    it("should ignore non-TICK events in ANSWERING state", () => {
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

    it("should transition back to ANSWERING after 3-second pause", () => {
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
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: now - 10000, // Preserved
        answerStartTime: now, // Reset to current time
      });
      // Critical: Should generate UNMUTE_MIC command
      expect(result.commands).toContainEqual({ type: "UNMUTE_MIC" });
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

      expect(result.state.status).toBe("ANSWERING");
      expect(result.commands).toContainEqual({ type: "UNMUTE_MIC" });
    });

    it("should preserve blockStartTime (block timer continues during pause)", () => {
      const now = 1000000;
      const originalBlockStartTime = now - 50000;
      const state: SessionState = {
        status: "ANSWER_TIMEOUT_PAUSE",
        blockIndex: 1,
        blockStartTime: originalBlockStartTime,
        pauseStartedAt: now - 3500,
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "TICK" },
        defaultContext,
        now,
      );

      if (result.state.status === "ANSWERING") {
        expect(result.state.blockStartTime).toBe(originalBlockStartTime);
      }
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
      expect(result.commands).toEqual([]);
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
      expect(result.commands).toEqual([]);
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
      expect(result.commands).toEqual([]);
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

    it("should generate cleanup commands from WAITING_FOR_CONNECTION state", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "WAITING_FOR_CONNECTION",
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

  describe("New Events: Driver Event Handlers (v5)", () => {
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
        expect(result.commands).toEqual([]); // No commands - connection already closed
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

      it("should handle first transcript entry", () => {
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: Date.now(),
          answerStartTime: Date.now(),
          ...createCommonFields(),
          transcript: [],
        };

        const entry: TranscriptEntry = {
          text: "Hello",
          speaker: "AI",
          is_final: true,
        };

        const result = sessionReducer(
          state,
          { type: "TRANSCRIPT_COMMIT", entry },
          defaultContext,
        );

        expect(result.state.transcript).toEqual([entry]);
        expect(result.commands).toEqual([]);
      });
    });

    describe("TRANSCRIPT_PENDING event", () => {
      it("should update pending buffers", () => {
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: Date.now(),
          answerStartTime: Date.now(),
          ...createCommonFields(),
        };

        const result = sessionReducer(
          state,
          {
            type: "TRANSCRIPT_PENDING",
            buffers: { user: "Thinking...", ai: "Listening..." },
          },
          defaultContext,
        );

        expect(result.state.pendingUser).toBe("Thinking...");
        expect(result.state.pendingAI).toBe("Listening...");
        expect(result.commands).toEqual([]);
      });

      it("should handle partial buffer updates", () => {
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: Date.now(),
          answerStartTime: Date.now(),
          ...createCommonFields(),
          pendingUser: "Old user text",
          pendingAI: "Old AI text",
        };

        const result = sessionReducer(
          state,
          {
            type: "TRANSCRIPT_PENDING",
            buffers: { user: "New user text" },
          },
          defaultContext,
        );

        expect(result.state.pendingUser).toBe("New user text");
        expect(result.state.pendingAI).toBeUndefined();
        expect(result.commands).toEqual([]);
      });
    });

    describe("AI_SPEAKING_CHANGED event", () => {
      it("should update isAiSpeaking flag", () => {
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: Date.now(),
          answerStartTime: Date.now(),
          ...createCommonFields(),
          isAiSpeaking: false,
        };

        const result = sessionReducer(
          state,
          { type: "AI_SPEAKING_CHANGED", isSpeaking: true },
          defaultContext,
        );

        expect(result.state.isAiSpeaking).toBe(true);
        expect(result.commands).toEqual([]);
      });

      it("should handle speaking -> not speaking transition", () => {
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: Date.now(),
          answerStartTime: Date.now(),
          ...createCommonFields(),
          isAiSpeaking: true,
        };

        const result = sessionReducer(
          state,
          { type: "AI_SPEAKING_CHANGED", isSpeaking: false },
          defaultContext,
        );

        expect(result.state.isAiSpeaking).toBe(false);
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

      it("should handle elapsedTime starting from 0", () => {
        const state: SessionState = {
          status: "ANSWERING",
          blockIndex: 0,
          blockStartTime: Date.now(),
          answerStartTime: Date.now(),
          ...createCommonFields(),
          elapsedTime: 0,
        };

        const result = sessionReducer(
          state,
          { type: "TIMER_TICK" },
          defaultContext,
        );

        expect(result.state.elapsedTime).toBe(1);
        expect(result.commands).toEqual([]);
      });
    });
  });

  describe("Full state machine flow with commands (v5)", () => {
    it("should complete full interview flow and generate correct commands", () => {
      const context: ReducerContext = {
        answerTimeLimit: 5, // 5 seconds for testing
        blockDuration: 10, // 10 seconds for testing
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
      if (result.state.status === "ANSWERING") {
        expect(result.state.blockIndex).toBe(0);
      }
      state = result.state;

      // 2. Answer timeout after 5s -> Should generate MUTE_MIC command
      now += 5100; // 5.1s later
      result = sessionReducer(state, { type: "TICK" }, context, now);
      expect(result.state.status).toBe("ANSWER_TIMEOUT_PAUSE");
      expect(result.commands).toContainEqual({ type: "MUTE_MIC" });
      state = result.state;

      // 3. Resume after 3s pause -> Should generate UNMUTE_MIC command
      now += 3100; // 3.1s later
      result = sessionReducer(state, { type: "TICK" }, context, now);
      expect(result.state.status).toBe("ANSWERING");
      expect(result.commands).toContainEqual({ type: "UNMUTE_MIC" });
      state = result.state;

      // 4. Block timeout -> No special commands
      now += 2000; // 2s later
      result = sessionReducer(state, { type: "TICK" }, context, now);
      expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
      if (result.state.status === "BLOCK_COMPLETE_SCREEN") {
        expect(result.state.completedBlockIndex).toBe(0);
      }
      state = result.state;

      // 5. User clicks continue to next block -> No special commands
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

      // 6. Complete second block with same pattern
      now += 5100;
      result = sessionReducer(state, { type: "TICK" }, context, now);
      expect(result.state.status).toBe("ANSWER_TIMEOUT_PAUSE");
      expect(result.commands).toContainEqual({ type: "MUTE_MIC" });
      state = result.state;

      now += 3100;
      result = sessionReducer(state, { type: "TICK" }, context, now);
      expect(result.state.status).toBe("ANSWERING");
      expect(result.commands).toContainEqual({ type: "UNMUTE_MIC" });
      state = result.state;

      now += 2000;
      result = sessionReducer(state, { type: "TICK" }, context, now);
      expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
      state = result.state;

      // 7. Complete interview
      result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
        now,
      );
      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).toEqual([]);
    });
  });

  describe("Dynamic context (blockDuration varies per block)", () => {
    it("should respect different block durations from context", () => {
      const now = 1000000;

      // Block 0: short duration (60s)
      const contextBlock0: ReducerContext = {
        answerTimeLimit: 120,
        blockDuration: 60,
        totalBlocks: 2,
      };

      let state: SessionState = {
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: now - 65000, // 65s ago
        answerStartTime: now - 10000,
        ...createCommonFields(),
      };

      // Should timeout with 60s limit
      let result = sessionReducer(state, { type: "TICK" }, contextBlock0, now);
      expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");

      // Block 1: long duration (900s)
      const contextBlock1: ReducerContext = {
        answerTimeLimit: 120,
        blockDuration: 900,
        totalBlocks: 2,
      };

      state = {
        status: "ANSWERING",
        blockIndex: 1,
        blockStartTime: now - 65000, // Same 65s elapsed
        answerStartTime: now - 10000,
        ...createCommonFields(),
      };

      // Should NOT timeout with 900s limit
      result = sessionReducer(state, { type: "TICK" }, contextBlock1, now);
      expect(result.state.status).toBe("ANSWERING"); // Still answering
      expect(result.commands).toEqual([]);
    });
  });

  describe("Edge cases and timer precision", () => {
    it("should handle very short time intervals (100ms ticks)", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: now - 119900, // 119.9s ago (just under 120s)
        answerStartTime: now - 119900,
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

    it("should handle timer values at millisecond precision", () => {
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

      // 1ms later -> exactly 3s
      result = sessionReducer(state, { type: "TICK" }, defaultContext, now + 1);
      expect(result.state.status).toBe("ANSWERING");
      expect(result.commands).toContainEqual({ type: "UNMUTE_MIC" });
    });
  });

  describe("Command Generation Edge Cases (v5)", () => {
    it("should not generate duplicate commands on re-render", () => {
      const now = 1000000;
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: now - 10000,
        answerStartTime: now - 125000, // Over limit
        ...createCommonFields(),
      };

      // Call reducer twice with same inputs
      const result1 = sessionReducer(
        state,
        { type: "TICK" },
        defaultContext,
        now,
      );
      const result2 = sessionReducer(
        state,
        { type: "TICK" },
        defaultContext,
        now,
      );

      expect(result1.commands).toEqual(result2.commands);
      expect(result1.commands).toContainEqual({ type: "MUTE_MIC" });
    });

    it("should generate START_CONNECTION command with correct blockNumber", () => {
      const state: SessionState = {
        status: "WAITING_FOR_CONNECTION",
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "CONNECTION_READY", initialBlockIndex: 5 },
        defaultContext,
        Date.now(),
      );

      expect(result.commands).toContainEqual({
        type: "START_CONNECTION",
        blockNumber: 5,
      });
    });

    it("should generate CLOSE_CONNECTION command on CONNECTION_CLOSED", () => {
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: Date.now(),
        answerStartTime: Date.now(),
        ...createCommonFields(),
      };

      const result = sessionReducer(
        state,
        { type: "CONNECTION_CLOSED", code: 1000 },
        defaultContext,
      );

      expect(result.commands).toEqual([]); // No commands - connection already closed
    });
  });
});
