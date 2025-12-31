// Golden Path Test (v6: One Block = One Question)
// This is the SINGLE MOST IMPORTANT test - it verifies the complete interview lifecycle
// Answer timeout now goes to BLOCK_COMPLETE_SCREEN (not back to ANSWERING)

import { describe, it, expect } from "vitest";
import { sessionReducer } from "~/app/[locale]/(interview)/interview/[interviewId]/session/reducer";
import type {
  SessionState,
  SessionEvent,
  ReducerContext,
  ReducerResult,
  Command,
} from "~/app/[locale]/(interview)/interview/[interviewId]/session/types";

/**
 * Golden Path: Complete Interview Flow (One Block = One Question)
 *
 * This test simulates a complete interview session from start to finish:
 * 1. User lands on interview page (WAITING_FOR_CONNECTION)
 * 2. WebSocket connects (CONNECTION_READY -> START_CONNECTION command)
 * 3. User answers question 1 (ANSWERING)
 * 4. User clicks "Next" (BLOCK_COMPLETE_SCREEN)
 * 5. User continues to question 2 (ANSWERING)
 * 6. Answer timeout occurs (ANSWER_TIMEOUT_PAUSE -> MUTE_MIC command)
 * 7. Pause completes (BLOCK_COMPLETE_SCREEN)
 * 8. Interview ends (INTERVIEW_COMPLETE)
 */

describe("Golden Path: Complete Interview Session (v6)", () => {
  it("should complete full 2-block interview with manual advancement", () => {
    // Context: Short timers for testing (no blockDuration)
    const context: ReducerContext = {
      answerTimeLimit: 5, // 5 seconds per answer
      totalBlocks: 2, // 2 blocks total
    };

    let now = 1000000; // Fixed timestamp for deterministic testing
    let state: SessionState;
    let result: ReducerResult;
    const executedCommands: Command[] = [];

    // Helper: Track commands as they're generated
    const executeCommands = (result: ReducerResult) => {
      result.commands.forEach((cmd) => executedCommands.push(cmd));
    };

    // ====================
    // PHASE 1: Connection
    // ====================

    console.log("\n=== PHASE 1: Connection ===");

    // Initial state: Waiting for connection
    state = {
      status: "WAITING_FOR_CONNECTION",
      connectionState: "initializing",
      transcript: [],
      pendingUser: "",
      pendingAI: "",
      elapsedTime: 0,
      error: null,
      isAiSpeaking: false,
    };

    console.log("Initial state:", state.status);
    expect(state.status).toBe("WAITING_FOR_CONNECTION");

    // Event: CONNECTION_READY (WebSocket opens)
    result = sessionReducer(
      state,
      { type: "CONNECTION_READY", initialBlockIndex: 0 },
      context,
      now,
    );
    executeCommands(result);
    state = result.state;

    console.log("After CONNECTION_READY:", state.status);
    expect(state.status).toBe("ANSWERING");
    expect(state).toMatchObject({
      status: "ANSWERING",
      blockIndex: 0,
      blockStartTime: now,
      answerStartTime: now,
    });

    // Verify START_CONNECTION command was generated
    expect(executedCommands).toContainEqual({
      type: "START_CONNECTION",
      blockNumber: 0,
    });

    // ====================
    // PHASE 2: Block 1 - Answering
    // ====================

    console.log("\n=== PHASE 2: Block 1 - Answering ===");

    // User answers for 3 seconds (under 5s limit)
    now += 3000;
    result = sessionReducer(state, { type: "TICK" }, context, now);
    state = result.state;

    console.log("After 3s:", state.status);
    expect(state.status).toBe("ANSWERING"); // Still answering
    expect(result.commands).toEqual([]); // No commands

    // ====================
    // PHASE 3: User Clicks "Next"
    // ====================

    console.log("\n=== PHASE 3: User Clicks Next ===");

    result = sessionReducer(state, { type: "USER_CLICKED_NEXT" }, context, now);
    executeCommands(result);
    state = result.state;

    console.log("After USER_CLICKED_NEXT:", state.status);
    expect(state.status).toBe("BLOCK_COMPLETE_SCREEN");
    expect(state).toMatchObject({
      status: "BLOCK_COMPLETE_SCREEN",
      completedBlockIndex: 0,
    });

    // Verify COMPLETE_BLOCK command was generated
    expect(executedCommands).toContainEqual({
      type: "COMPLETE_BLOCK",
      blockNumber: 1,
    });

    // ====================
    // PHASE 4: Transition to Block 2
    // ====================

    console.log("\n=== PHASE 4: Transition to Block 2 ===");

    // User clicks "Continue" -> Goes to WAITING_FOR_CONNECTION (FEAT40)
    now += 2000;
    result = sessionReducer(
      state,
      { type: "USER_CLICKED_CONTINUE" },
      context,
      now,
    );
    executeCommands(result);
    state = result.state;

    console.log("After USER_CLICKED_CONTINUE:", state.status);
    expect(state.status).toBe("WAITING_FOR_CONNECTION");
    if (state.status === "WAITING_FOR_CONNECTION") {
      expect(state.targetBlockIndex).toBe(1);
    }

    // Verify RECONNECT_FOR_BLOCK command was generated
    expect(executedCommands).toContainEqual({
      type: "RECONNECT_FOR_BLOCK",
      blockNumber: 2,
    });

    // CONNECTION_READY -> ANSWERING (FEAT40)
    result = sessionReducer(
      state,
      { type: "CONNECTION_READY", initialBlockIndex: 0 },
      context,
      now,
    );
    executeCommands(result);
    state = result.state;

    console.log("After CONNECTION_READY:", state.status);
    expect(state.status).toBe("ANSWERING");
    expect(state).toMatchObject({
      status: "ANSWERING",
      blockIndex: 1, // Uses targetBlockIndex from WAITING_FOR_CONNECTION
      blockStartTime: now,
      answerStartTime: now,
    });

    // ====================
    // PHASE 5: Block 2 - Answer Timeout
    // ====================

    console.log("\n=== PHASE 5: Block 2 - Answer Timeout ===");

    // User goes over 5s answer limit
    now += 5500;
    result = sessionReducer(state, { type: "TICK" }, context, now);
    executeCommands(result);
    state = result.state;

    console.log("After 5.5s (timeout):", state.status);
    expect(state.status).toBe("ANSWER_TIMEOUT_PAUSE");
    expect(state).toMatchObject({
      status: "ANSWER_TIMEOUT_PAUSE",
      blockIndex: 1,
      pauseStartedAt: now,
    });

    // Verify MUTE_MIC command was generated
    expect(executedCommands).toContainEqual({ type: "MUTE_MIC" });

    // ====================
    // PHASE 6: Pause Completes -> Block Complete
    // ====================

    console.log("\n=== PHASE 6: Pause Completes ===");

    // Pause completes (over 3s) -> Goes to BLOCK_COMPLETE_SCREEN
    now += 3500;
    result = sessionReducer(state, { type: "TICK" }, context, now);
    executeCommands(result);
    state = result.state;

    console.log("After 3.5s pause:", state.status);
    expect(state.status).toBe("BLOCK_COMPLETE_SCREEN");
    expect(state).toMatchObject({
      status: "BLOCK_COMPLETE_SCREEN",
      completedBlockIndex: 1,
    });

    // Verify COMPLETE_BLOCK command was generated
    expect(executedCommands).toContainEqual({
      type: "COMPLETE_BLOCK",
      blockNumber: 2,
    });

    // ====================
    // PHASE 7: Interview Complete
    // ====================

    console.log("\n=== PHASE 7: Interview Complete ===");

    // User completes final block
    now += 1000;
    result = sessionReducer(
      state,
      { type: "USER_CLICKED_CONTINUE" },
      context,
      now,
    );
    executeCommands(result);
    state = result.state;

    console.log("After completing block 2:", state.status);
    expect(state.status).toBe("INTERVIEW_COMPLETE");
    expect(executedCommands).toContainEqual({ type: "STOP_AUDIO" });
    expect(executedCommands).toContainEqual({ type: "CLOSE_CONNECTION" });

    // ====================
    // Verify Command Sequence
    // ====================

    console.log("\n=== Command Execution Summary ===");
    console.log("Total commands executed:", executedCommands.length);

    // Verify all expected commands were generated
    expect(executedCommands).toContainEqual({
      type: "START_CONNECTION",
      blockNumber: 0,
    });
    expect(executedCommands).toContainEqual({ type: "MUTE_MIC" });
    expect(executedCommands).toContainEqual({
      type: "COMPLETE_BLOCK",
      blockNumber: 1,
    });
    expect(executedCommands).toContainEqual({
      type: "COMPLETE_BLOCK",
      blockNumber: 2,
    });
    expect(executedCommands).toContainEqual({ type: "STOP_AUDIO" });
    expect(executedCommands).toContainEqual({ type: "CLOSE_CONNECTION" });

    console.log("\n Golden Path Test Passed!");
  });

  it("should handle single-block interview (edge case)", () => {
    const context: ReducerContext = {
      answerTimeLimit: 5,
      totalBlocks: 1,
    };

    let now = 1000000;
    let state: SessionState = {
      status: "WAITING_FOR_CONNECTION",
      connectionState: "initializing",
      transcript: [],
      pendingUser: "",
      pendingAI: "",
      elapsedTime: 0,
      error: null,
      isAiSpeaking: false,
    };

    // 1. Connect
    let result = sessionReducer(
      state,
      { type: "CONNECTION_READY", initialBlockIndex: 0 },
      context,
      now,
    );
    state = result.state;
    expect(state.status).toBe("ANSWERING");

    // 2. User clicks Next
    result = sessionReducer(state, { type: "USER_CLICKED_NEXT" }, context, now);
    state = result.state;
    expect(state.status).toBe("BLOCK_COMPLETE_SCREEN");
    expect(state).toMatchObject({ completedBlockIndex: 0 });

    // 3. Complete interview (no more blocks)
    result = sessionReducer(
      state,
      { type: "USER_CLICKED_CONTINUE" },
      context,
      now,
    );
    state = result.state;
    expect(state.status).toBe("INTERVIEW_COMPLETE");
  });

  it("should handle interview resumption from middle block", () => {
    const context: ReducerContext = {
      answerTimeLimit: 5,
      totalBlocks: 3,
    };

    let now = 1000000;
    let state: SessionState = {
      status: "WAITING_FOR_CONNECTION",
      connectionState: "initializing",
      transcript: [],
      pendingUser: "",
      pendingAI: "",
      elapsedTime: 0,
      error: null,
      isAiSpeaking: false,
    };

    // Resume from block 2 (0-indexed)
    let result = sessionReducer(
      state,
      { type: "CONNECTION_READY", initialBlockIndex: 2 },
      context,
      now,
    );
    state = result.state;

    expect(state.status).toBe("ANSWERING");
    if (state.status === "ANSWERING") {
      expect(state.blockIndex).toBe(2);
    }

    // Verify START_CONNECTION command has correct blockNumber
    expect(result.commands).toContainEqual({
      type: "START_CONNECTION",
      blockNumber: 2,
    });

    // User clicks Next
    result = sessionReducer(state, { type: "USER_CLICKED_NEXT" }, context, now);
    state = result.state;
    expect(state.status).toBe("BLOCK_COMPLETE_SCREEN");

    // Complete interview (last block)
    result = sessionReducer(
      state,
      { type: "USER_CLICKED_CONTINUE" },
      context,
      now,
    );
    state = result.state;
    expect(state.status).toBe("INTERVIEW_COMPLETE");
  });

  it("should handle driver events during interview (CONNECTION_ERROR)", () => {
    const context: ReducerContext = {
      answerTimeLimit: 5,
      totalBlocks: 1,
    };

    let now = 1000000;
    let state: SessionState = {
      status: "ANSWERING",
      blockIndex: 0,
      blockStartTime: now,
      answerStartTime: now,
      connectionState: "live",
      transcript: [],
      pendingUser: "",
      pendingAI: "",
      elapsedTime: 5,
      error: null,
      isAiSpeaking: false,
    };

    // Connection error occurs mid-interview
    const result = sessionReducer(
      state,
      { type: "CONNECTION_ERROR", error: "Network timeout" },
      context,
      now,
    );
    state = result.state;

    expect(state.connectionState).toBe("error");
    expect(state.error).toBe("Network timeout");
    expect(state.status).toBe("INTERVIEW_COMPLETE");
  });

  it("should handle transcript events during interview", () => {
    const context: ReducerContext = {
      answerTimeLimit: 5,
      totalBlocks: 1,
    };

    let now = 1000000;
    let state: SessionState = {
      status: "ANSWERING",
      blockIndex: 0,
      blockStartTime: now,
      answerStartTime: now,
      connectionState: "live",
      transcript: [],
      pendingUser: "",
      pendingAI: "",
      elapsedTime: 2,
      error: null,
      isAiSpeaking: false,
    };

    // AI speaks
    let result = sessionReducer(
      state,
      {
        type: "TRANSCRIPT_COMMIT",
        entry: { text: "Hello, how are you?", speaker: "AI", is_final: true },
      },
      context,
      now,
    );
    state = result.state;

    expect(state.transcript).toHaveLength(1);
    expect(state.transcript[0]).toMatchObject({
      text: "Hello, how are you?",
      speaker: "AI",
    });

    // User responds
    now += 1000;
    result = sessionReducer(
      state,
      {
        type: "TRANSCRIPT_COMMIT",
        entry: { text: "I'm good, thanks!", speaker: "USER", is_final: true },
      },
      context,
      now,
    );
    state = result.state;

    expect(state.transcript).toHaveLength(2);
    expect(state.transcript[1]).toMatchObject({
      text: "I'm good, thanks!",
      speaker: "USER",
    });

    // Verify state machine unaffected by transcript events
    expect(state.status).toBe("ANSWERING");
    expect(result.commands).toEqual([]);
  });

  describe("Block Completion Commands", () => {
    it("should emit COMPLETE_BLOCK when user clicks Next", () => {
      const context: ReducerContext = {
        answerTimeLimit: 90,
        totalBlocks: 3,
      };

      const now = 1000000;
      const state: SessionState = {
        status: "ANSWERING",
        blockIndex: 0,
        blockStartTime: now,
        answerStartTime: now,
        connectionState: "live",
        transcript: [],
        pendingUser: "",
        pendingAI: "",
        elapsedTime: 0,
        error: null,
        isAiSpeaking: false,
      };

      const result = sessionReducer(
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
    });

    it("should emit COMPLETE_BLOCK after answer timeout pause", () => {
      const context: ReducerContext = {
        answerTimeLimit: 90,
        totalBlocks: 3,
      };

      const now = 1000000;
      const state: SessionState = {
        status: "ANSWER_TIMEOUT_PAUSE",
        blockIndex: 1,
        blockStartTime: now - 100000,
        pauseStartedAt: now - 3500, // Over 3s pause
        connectionState: "live",
        transcript: [],
        pendingUser: "",
        pendingAI: "",
        elapsedTime: 100,
        error: null,
        isAiSpeaking: false,
      };

      const result = sessionReducer(state, { type: "TICK" }, context, now);

      expect(result.state.status).toBe("BLOCK_COMPLETE_SCREEN");
      expect(result.commands).toContainEqual({
        type: "COMPLETE_BLOCK",
        blockNumber: 2,
      });
    });

    it("should emit CLOSE_CONNECTION when last block completes", () => {
      const context: ReducerContext = {
        answerTimeLimit: 90,
        totalBlocks: 3,
      };

      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 2, // Last block (0-indexed)
        connectionState: "live",
        transcript: [],
        pendingUser: "",
        pendingAI: "",
        elapsedTime: 100,
        error: null,
        isAiSpeaking: false,
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
      );

      expect(result.state.status).toBe("INTERVIEW_COMPLETE");
      expect(result.commands).toContainEqual({ type: "STOP_AUDIO" });
      expect(result.commands).toContainEqual({ type: "CLOSE_CONNECTION" });
    });

    it("should NOT emit CLOSE_CONNECTION for non-last blocks", () => {
      const context: ReducerContext = {
        answerTimeLimit: 90,
        totalBlocks: 3,
      };

      const state: SessionState = {
        status: "BLOCK_COMPLETE_SCREEN",
        completedBlockIndex: 0, // First block
        connectionState: "live",
        transcript: [],
        pendingUser: "",
        pendingAI: "",
        elapsedTime: 100,
        error: null,
        isAiSpeaking: false,
      };

      const result = sessionReducer(
        state,
        { type: "USER_CLICKED_CONTINUE" },
        context,
      );

      // Now goes through WAITING_FOR_CONNECTION first (FEAT40)
      expect(result.state.status).toBe("WAITING_FOR_CONNECTION");
      expect(result.commands).not.toContainEqual({ type: "CLOSE_CONNECTION" });
    });
  });
});
