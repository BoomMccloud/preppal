/**
 * DevConsole - Development-only debug panel for interview session
 * Shows real-time transcript, session state, and timing info
 * Toggle with Ctrl+D or the collapse button
 */
"use client";

import { useState, useEffect, useRef } from "react";
import type { SessionState, TranscriptEntry } from "../types";

interface DevConsoleProps {
  state: SessionState;
}

export function DevConsole({ state }: DevConsoleProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Ctrl+D to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-scroll to bottom when new transcript entries arrive
  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.transcript, isPaused]);

  // Only render in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getBlockInfo = (): string => {
    if (state.status === "ANSWERING") {
      return `Block ${state.blockIndex + 1}`;
    }
    if (state.status === "BLOCK_COMPLETE_SCREEN") {
      return `Completed Block ${state.completedBlockIndex + 1}`;
    }
    return "N/A";
  };

  return (
    <div
      className={`fixed right-4 bottom-4 z-50 w-96 rounded-lg border border-white/10 bg-black/95 shadow-2xl backdrop-blur-md transition-all ${
        isCollapsed ? "h-10" : "h-80"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">Dev Console</span>
          <span className="bg-warning/20 text-warning rounded px-1.5 py-0.5 text-[10px] font-medium">
            DEV
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-secondary-text text-[10px]">Ctrl+D</span>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex size-6 items-center justify-center rounded hover:bg-white/10"
          >
            <span className="text-white">{isCollapsed ? "▲" : "▼"}</span>
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* State Bar */}
          <div className="flex items-center gap-4 border-b border-white/10 px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-secondary-text">State:</span>
              <span className="text-info font-mono font-medium">
                {state.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-secondary-text">Block:</span>
              <span className="font-mono text-white">{getBlockInfo()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-secondary-text">Time:</span>
              <span className="font-mono text-white">
                {formatTime(state.elapsedTime)}
              </span>
            </div>
          </div>

          {/* Transcript */}
          <div
            ref={scrollRef}
            className="h-52 overflow-y-auto p-2"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {state.transcript.length === 0 ? (
              <p className="text-secondary-text py-4 text-center text-xs">
                No transcript yet...
              </p>
            ) : (
              <div className="space-y-1">
                {state.transcript.map((entry, i) => (
                  <TranscriptLine key={i} entry={entry} />
                ))}
                {/* Pending user text */}
                {state.pendingUser && (
                  <TranscriptLine
                    entry={{
                      speaker: "USER",
                      text: state.pendingUser,
                      is_final: false,
                    }}
                  />
                )}
                {/* Pending AI text */}
                {state.pendingAI && (
                  <TranscriptLine
                    entry={{
                      speaker: "AI",
                      text: state.pendingAI,
                      is_final: false,
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TranscriptLine({ entry }: { entry: TranscriptEntry }) {
  const isAI = entry.speaker === "AI";
  const isPending = !entry.is_final;

  return (
    <div
      className={`flex gap-2 rounded px-2 py-1 text-xs ${
        isPending ? "opacity-50" : ""
      }`}
    >
      <span
        className={`shrink-0 font-mono font-semibold ${
          isAI ? "text-info" : "text-success"
        }`}
      >
        [{isAI ? "AI" : "USER"}]
      </span>
      <span className="text-primary-text">{entry.text}</span>
    </div>
  );
}
