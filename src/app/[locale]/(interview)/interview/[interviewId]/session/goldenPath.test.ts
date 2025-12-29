// Golden Path Test (v5: Dumb Driver Architecture)
// This is the SINGLE MOST IMPORTANT test - it verifies the complete interview lifecycle
// If this test passes, the core state machine and command execution flow is functional

import { describe, it, expect } from "vitest";
import { sessionReducer } from "./reducer";
import type {
  SessionState,
  SessionEvent,
  ReducerContext,
  ReducerResult,
  Command,
} from "./types";

/**
 * Golden Path: Complete Interview Flow
 *
 * This test simulates a complete interview session from start to finish:
 * 1. User lands on interview page (WAITING_FOR_CONNECTION)
 * 2. WebSocket connects (CONNECTION_READY -> START_CONNECTION command)
 * 3. User answers questions (ANSWERING)
 * 4. Answer timeout occurs (ANSWER_TIMEOUT_PAUSE -> MUTE_MIC command)
 * 5. Pause completes, user resumes (ANSWERING -> UNMUTE_MIC command)
 * 6. Block completes (BLOCK_COMPLETE_SCREEN)
 * 7. User continues to next block (ANSWERING)
 * 8. Second block completes
 * 9. Interview ends (INTERVIEW_COMPLETE)
 *
 * This test verifies:
 * - All state transitions work correctly
 * - Commands are generated at the right times
 * - Timer logic is accurate
 * - Multi-block flow works
 */

describe("Golden Path: Complete Interview Session (v5)", () => {
  it("should complete full 2-block interview with all state transitions and commands", () => {
    // Context: Short timers for testing
    const context: ReducerContext = {
      answerTimeLimit: 5, // 5 seconds per answer
      blockDuration: 10, // 10 seconds per block
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
    // PHASE 3: Answer Timeout
    // ====================

    console.log("\n=== PHASE 3: Answer Timeout ===");

    // User goes over 5s answer limit
    now += 2500; // Total: 5.5s
    result = sessionReducer(state, { type: "TICK" }, context, now);
    executeCommands(result);
    state = result.state;

    console.log("After 5.5s (timeout):", state.status);
    expect(state.status).toBe("ANSWER_TIMEOUT_PAUSE");
    expect(state).toMatchObject({
      status: "ANSWER_TIMEOUT_PAUSE",
      blockIndex: 0,
      pauseStartedAt: now,
    });

    // Verify MUTE_MIC command was generated
    expect(executedCommands).toContainEqual({ type: "MUTE_MIC" });

    // ====================
    // PHASE 4: Pause Duration
    // ====================

    console.log("\n=== PHASE 4: Pause Duration ===");

    // Wait 2 seconds during pause (still under 3s)
    now += 2000;
    result = sessionReducer(state, { type: "TICK" }, context, now);
    state = result.state;

    console.log("After 2s pause:", state.status);
    expect(state.status).toBe("ANSWER_TIMEOUT_PAUSE"); // Still paused

    // ====================
    // PHASE 5: Resume from Pause
    // ====================

    console.log("\n=== PHASE 5: Resume from Pause ===");

    // Pause completes (over 3s)
    now += 1500; // Total pause: 3.5s
    result = sessionReducer(state, { type: "TICK" }, context, now);
    executeCommands(result);
    state = result.state;

    console.log("After 3.5s pause (resume):", state.status);
    expect(state.status).toBe("ANSWERING");
    expect(state).toMatchObject({
      status: "ANSWERING",
      blockIndex: 0,
      answerStartTime: now, // Reset
    });

    // Verify UNMUTE_MIC command was generated
    expect(executedCommands).toContainEqual({ type: "UNMUTE_MIC" });

    // ====================
    // PHASE 6: Block 1 Completion
    // ====================

    console.log("\n=== PHASE 6: Block 1 Completion ===");

    // Block elapsed time check:
    // - Started at 1000000
    // - Answered for 3s (1003000)
    // - Timeout pause for 3.5s (1006500)
    // - Resumed at 1006500
    // - Need to reach 10s total from block start (1010000)
    // - Need 3.5s more

    now += 4000; // Total block time: ~10.5s
    result = sessionReducer(state, { type: "TICK" }, context, now);
    executeCommands(result);
    state = result.state;

    console.log("After ~10.5s block time:", state.status);
    expect(state.status).toBe("BLOCK_COMPLETE_SCREEN");
    expect(state).toMatchObject({
      status: "BLOCK_COMPLETE_SCREEN",
      completedBlockIndex: 0,
    });

    // ====================
    // PHASE 7: Transition to Block 2
    // ====================

    console.log("\n=== PHASE 7: Transition to Block 2 ===");

    // User clicks "Continue"
    now += 2000; // User reads completion screen
    result = sessionReducer(
      state,
      { type: "USER_CLICKED_CONTINUE" },
      context,
      now,
    );
    executeCommands(result);
    state = result.state;

    console.log("After USER_CLICKED_CONTINUE:", state.status);
    expect(state.status).toBe("ANSWERING");
    expect(state).toMatchObject({
      status: "ANSWERING",
      blockIndex: 1, // Second block
      blockStartTime: now,
      answerStartTime: now,
    });

    // ====================
    // PHASE 8: Block 2 - Quick Answer
    // ====================

    console.log("\n=== PHASE 8: Block 2 - Quick Answer ===");

    // User answers quickly, no timeout
    now += 3000; // 3s into block 2
    result = sessionReducer(state, { type: "TICK" }, context, now);
    state = result.state;

    console.log("After 3s in block 2:", state.status);
    expect(state.status).toBe("ANSWERING"); // Still answering

    // ====================
    // PHASE 9: Block 2 Completion
    // ====================

    console.log("\n=== PHASE 9: Block 2 Completion ===");

    // Block 2 completes after 10s
    now += 7500; // Total: 10.5s
    result = sessionReducer(state, { type: "TICK" }, context, now);
    executeCommands(result);
    state = result.state;

    console.log("After 10.5s block 2:", state.status);
    expect(state.status).toBe("BLOCK_COMPLETE_SCREEN");
    expect(state).toMatchObject({
      status: "BLOCK_COMPLETE_SCREEN",
      completedBlockIndex: 1,
    });

    // ====================
    // PHASE 10: Interview Complete
    // ====================

    console.log("\n=== PHASE 10: Interview Complete ===");

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

    // ====================
    // Verify Command Sequence
    // ====================

    console.log("\n=== Command Execution Summary ===");
    console.log("Total commands executed:", executedCommands.length);
    executedCommands.forEach((cmd, i) => {
      console.log(`  ${i + 1}. ${cmd.type}`, cmd);
    });

    // Verify all expected commands were generated
    expect(executedCommands).toContainEqual({
      type: "START_CONNECTION",
      blockNumber: 0,
    });
    expect(executedCommands).toContainEqual({ type: "MUTE_MIC" });
    expect(executedCommands).toContainEqual({ type: "UNMUTE_MIC" });

    // Verify command order (MUTE before UNMUTE)
    const muteIndex = executedCommands.findIndex(
      (cmd) => cmd.type === "MUTE_MIC"
    );
    const unmuteIndex = executedCommands.findIndex(
      (cmd) => cmd.type === "UNMUTE_MIC"
    );
    expect(muteIndex).toBeGreaterThan(-1);
    expect(unmuteIndex).toBeGreaterThan(-1);
    expect(muteIndex).toBeLessThan(unmuteIndex);

    console.log("\n✅ Golden Path Test Passed!");
    console.log("Full interview flow completed successfully with all commands.");
  });

  it("should handle single-block interview (edge case)", () => {
    const context: ReducerContext = {
      answerTimeLimit: 5,
      blockDuration: 10,
      totalBlocks: 1, // Only 1 block
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

    // 2. Answer for a bit
    now += 3000;
    result = sessionReducer(state, { type: "TICK" }, context, now);
    state = result.state;
    expect(state.status).toBe("ANSWERING");

    // 3. Block completes
    now += 8000; // Total: 11s
    result = sessionReducer(state, { type: "TICK" }, context, now);
    state = result.state;
    expect(state.status).toBe("BLOCK_COMPLETE_SCREEN");
    expect(state).toMatchObject({ completedBlockIndex: 0 });

    // 4. Complete interview (no more blocks)
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
      blockDuration: 10,
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

    // Complete the block
    now += 11000;
    result = sessionReducer(state, { type: "TICK" }, context, now);
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

  it("should handle rapid answer timeouts (multiple cycles)", () => {
    const context: ReducerContext = {
      answerTimeLimit: 2, // Very short: 2s
      blockDuration: 20, // Long block: 20s
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
    const commands: Command[] = [];

    // Connect
    let result = sessionReducer(
      state,
      { type: "CONNECTION_READY", initialBlockIndex: 0 },
      context,
      now,
    );
    state = result.state;
    commands.push(...result.commands);

    // Cycle 1: Timeout -> Pause -> Resume
    now += 2500; // First timeout
    result = sessionReducer(state, { type: "TICK" }, context, now);
    state = result.state;
    commands.push(...result.commands);
    expect(state.status).toBe("ANSWER_TIMEOUT_PAUSE");

    now += 3500; // Resume
    result = sessionReducer(state, { type: "TICK" }, context, now);
    state = result.state;
    commands.push(...result.commands);
    expect(state.status).toBe("ANSWERING");

    // Cycle 2: Timeout -> Pause -> Resume
    now += 2500; // Second timeout
    result = sessionReducer(state, { type: "TICK" }, context, now);
    state = result.state;
    commands.push(...result.commands);
    expect(state.status).toBe("ANSWER_TIMEOUT_PAUSE");

    now += 3500; // Resume
    result = sessionReducer(state, { type: "TICK" }, context, now);
    state = result.state;
    commands.push(...result.commands);
    expect(state.status).toBe("ANSWERING");

    // Verify multiple MUTE/UNMUTE cycles
    const muteCommands = commands.filter((cmd) => cmd.type === "MUTE_MIC");
    const unmuteCommands = commands.filter((cmd) => cmd.type === "UNMUTE_MIC");

    expect(muteCommands.length).toBeGreaterThanOrEqual(2);
    expect(unmuteCommands.length).toBeGreaterThanOrEqual(2);
  });

  it("should handle driver events during interview (CONNECTION_ERROR)", () => {
    const context: ReducerContext = {
      answerTimeLimit: 5,
      blockDuration: 10,
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

    // State machine should remain in ANSWERING but connectionState reflects error
    expect(state.status).toBe("ANSWERING");
  });

  it("should handle transcript events during interview", () => {
    const context: ReducerContext = {
      answerTimeLimit: 5,
      blockDuration: 10,
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
});
