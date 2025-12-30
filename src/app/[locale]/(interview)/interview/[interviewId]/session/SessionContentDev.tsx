/**
 * SessionContentDev - Development UI component for interview session
 * Debug-focused view with stats panel, raw state viewer, and connection diagnostics
 * Receives state and dispatch from parent (via useInterviewSession hook)
 */
"use client";

import { useEffect, useRef, useState, type Dispatch } from "react";
import { useRouter } from "~/i18n/navigation";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { StatusIndicator } from "~/app/_components/StatusIndicator";
import { AIAvatar } from "~/app/_components/AIAvatar";
import type { SessionState, SessionEvent } from "./types";

interface SessionContentDevProps {
  interviewId: string;
  guestToken?: string;
  state: SessionState;
  dispatch: Dispatch<SessionEvent>;
  onConnectionReady?: () => void;
  /** Toggle to preview prod UI (dev mode only) */
  onToggleProdView?: () => void;
}

export function SessionContentDev({
  interviewId,
  guestToken,
  state,
  dispatch,
  onConnectionReady,
  onToggleProdView,
}: SessionContentDevProps) {
  const router = useRouter();
  const t = useTranslations("interview.session");
  const tCommon = useTranslations("common");
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [shouldPoll, setShouldPoll] = useState(true);

  // Debug state
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Check interview status - block if not PENDING
  const {
    data: interview,
    isLoading,
    error: interviewError,
  } = api.interview.getById.useQuery(
    {
      id: interviewId,
      token: guestToken,
    },
    {
      refetchInterval: shouldPoll ? 1000 : false,
      retry: false,
    },
  );

  // Stop polling if we have an error or interview is completed
  useEffect(() => {
    if (interviewError || interview?.status === "COMPLETED") {
      setShouldPoll(false);
    }
  }, [interviewError, interview?.status]);

  // Debug query - enabled in dev view
  const { data: interviewStatus } = api.debug.getInterviewStatus.useQuery(
    { interviewId },
    {
      enabled: !!interviewId,
      refetchInterval: 5000,
    },
  );

  // Debug handler
  const handleCheckStatus = () => {
    const statusInfo = {
      interview: interview ?? null,
      interviewStatus: interviewStatus ?? null,
    };
    setDebugInfo(JSON.stringify(statusInfo, null, 2));
  };

  // Get state properties
  const { connectionState, transcript, elapsedTime, error, isAiSpeaking } =
    state;
  const pendingUser = state.pendingUser;
  const pendingAI = state.pendingAI;

  // Auto-scroll to latest transcript
  // We trigger this when transcript changes OR when pending buffers change
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript.length, transcript, pendingUser, pendingAI]);

  // Call onConnectionReady when Gemini connection is established
  const connectionReadyCalledRef = useRef(false);
  useEffect(() => {
    if (
      connectionState === "live" &&
      onConnectionReady &&
      !connectionReadyCalledRef.current
    ) {
      connectionReadyCalledRef.current = true;
      onConnectionReady();
    }
  }, [connectionState, onConnectionReady]);

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="session-dev"
        className="flex h-screen items-center justify-center bg-gray-50"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <div className="text-lg text-gray-600">{tCommon("loading")}</div>
        </div>
      </div>
    );
  }

  // Error state
  if (connectionState === "error") {
    return (
      <div
        data-testid="session-dev"
        className="flex h-screen items-center justify-center bg-red-50"
      >
        <div className="max-w-md space-y-6 rounded-xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-red-700">
            {t("connectionError")}
          </h1>
          <div className="rounded bg-red-50 p-4 text-left font-mono text-sm text-red-800">
            {error ?? t("connectionLost")}
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-700"
          >
            {t("returnToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="session-dev" className="flex h-screen overflow-hidden">
      {/* LEFT PANEL: Interactive Simulation */}
      <div className="flex flex-1 flex-col bg-gray-50 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-800">{t("title")}</h1>
            <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold tracking-wider text-blue-800 uppercase">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></span>
              Dev Mode
            </span>
          </div>
          <div className="flex items-center gap-6">
            <StatusIndicator status={isAiSpeaking ? "speaking" : "listening"} />
            <div className="font-mono text-xl font-medium text-gray-700 tabular-nums">
              {formatTime(elapsedTime)}
            </div>
            {onToggleProdView && (
              <button
                onClick={onToggleProdView}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                Preview Prod UI
              </button>
            )}
          </div>
        </div>

        {/* Avatar Area */}
        <div className="bg-white p-6 shadow-sm">
          <div className="mx-auto max-w-2xl">
            <AIAvatar status={isAiSpeaking ? t("speaking") : t("listening")} />
          </div>
        </div>

        {/* Transcript Area - The "Streaming Buffer" View */}
        <div className="flex-1 overflow-y-auto scroll-smooth p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {transcript.length === 0 && !pendingUser && !pendingAI ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <div className="mb-3 text-4xl">💬</div>
                <p>{t("waitingToBegin")}</p>
                <p className="mt-2 font-mono text-xs text-gray-400">
                  Status: {connectionState}
                </p>
              </div>
            ) : (
              <>
                {/* 1. Committed History */}
                {transcript.map((entry, index) => (
                  <div
                    key={index}
                    className={`flex ${entry.speaker === "USER" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative max-w-[80%] rounded-2xl px-6 py-4 shadow-sm ${
                        entry.speaker === "AI"
                          ? "border border-gray-100 bg-white text-gray-800"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      <div
                        className={`mb-1 text-xs font-bold tracking-wider uppercase opacity-70 ${
                          entry.speaker === "AI"
                            ? "text-gray-500"
                            : "text-blue-100"
                        }`}
                      >
                        {entry.speaker === "AI" ? t("aiInterviewer") : t("you")}
                      </div>
                      <div className="leading-relaxed whitespace-pre-wrap">
                        {entry.text}
                      </div>
                    </div>
                  </div>
                ))}

                {/* 2. LIVE AI Buffer (Streaming in) */}
                {pendingAI && (
                  <div className="flex justify-start">
                    <div className="relative max-w-[80%] rounded-2xl border border-blue-100 bg-blue-50 px-6 py-4 shadow-sm">
                      <div className="mb-1 flex items-center gap-2 text-xs font-bold tracking-wider text-blue-400 uppercase">
                        {t("aiInterviewer")}
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400"></span>
                      </div>
                      <div className="leading-relaxed whitespace-pre-wrap text-gray-600">
                        {pendingAI}
                        <span className="animate-pulse font-light text-blue-400">
                          ...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. LIVE User Buffer (Streaming in) */}
                {pendingUser && (
                  <div className="flex justify-end">
                    <div className="relative max-w-[80%] rounded-2xl border border-blue-400 bg-blue-500/90 px-6 py-4 shadow-sm backdrop-blur-sm">
                      <div className="mb-1 flex items-center justify-end gap-2 text-xs font-bold tracking-wider text-blue-100 uppercase">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white"></span>
                        {t("you")}
                      </div>
                      <div className="leading-relaxed whitespace-pre-wrap text-white">
                        {pendingUser}
                        <span className="animate-pulse">_</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* Footer Controls */}
        <div className="border-t bg-white px-6 py-4">
          <div className="mx-auto flex max-w-3xl justify-center">
            <button
              onClick={() => dispatch({ type: "INTERVIEW_ENDED" })}
              disabled={connectionState === "ending"}
              className="rounded-full bg-red-50 px-8 py-3 font-semibold text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
            >
              {connectionState === "ending" ? t("ending") : t("endInterview")}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Dev Tools (Fixed Width) */}
      <div className="flex w-[400px] flex-col border-l border-gray-800 bg-gray-950 text-gray-300">
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h2 className="text-xs font-bold tracking-wider text-gray-500 uppercase">
            Dev Console
          </h2>
          <div className="flex h-2 w-2">
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                connectionState === "live" ? "bg-green-500" : "bg-yellow-500"
              }`}
            >
              {connectionState === "live" && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              )}
            </span>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto p-4">
          {/* Section: Status Grid */}
          <section>
            <h3 className="mb-3 text-[10px] font-bold tracking-widest text-gray-600 uppercase">
              State Monitor
            </h3>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="rounded bg-gray-900 p-2.5">
                <div className="mb-1 text-[10px] text-gray-500">Connection</div>
                <div
                  className={`font-bold ${
                    connectionState === "live"
                      ? "text-green-400"
                      : "text-yellow-400"
                  }`}
                >
                  {connectionState.toUpperCase()}
                </div>
              </div>
              <div className="rounded bg-gray-900 p-2.5">
                <div className="mb-1 text-[10px] text-gray-500">Phase</div>
                <div className="font-bold text-blue-300">
                  {state.status.replace(/_/g, " ")}
                </div>
              </div>
              <div className="rounded bg-gray-900 p-2.5">
                <div className="mb-1 text-[10px] text-gray-500">Audio</div>
                <div className="font-bold text-white">
                  {isAiSpeaking ? "🤖 SPEAKING" : "👂 LISTENING"}
                </div>
              </div>
              <div className="rounded bg-gray-900 p-2.5">
                <div className="mb-1 text-[10px] text-gray-500">Block</div>
                <div className="font-bold text-white">
                  {"blockIndex" in state ? `#${state.blockIndex}` : "-"}
                </div>
              </div>
            </div>
          </section>

          {/* Section: Live Buffers (Raw View) */}
          <section>
            <h3 className="mb-3 text-[10px] font-bold tracking-widest text-gray-600 uppercase">
              Raw Buffers
            </h3>
            <div className="space-y-2 font-mono text-xs">
              <div className="rounded border border-gray-800 bg-gray-900/50 p-3">
                <div className="mb-1 flex justify-between text-[10px] text-gray-500">
                  <span>USER_BUFFER</span>
                  <span className="text-gray-600">
                    {pendingUser?.length ?? 0} chars
                  </span>
                </div>
                <div className="min-h-[1.5em] break-all text-blue-300">
                  {pendingUser || (
                    <span className="text-gray-700 italic">null</span>
                  )}
                </div>
              </div>
              <div className="rounded border border-gray-800 bg-gray-900/50 p-3">
                <div className="mb-1 flex justify-between text-[10px] text-gray-500">
                  <span>AI_BUFFER</span>
                  <span className="text-gray-600">
                    {pendingAI?.length ?? 0} chars
                  </span>
                </div>
                <div className="min-h-[1.5em] break-all text-green-300">
                  {pendingAI || (
                    <span className="text-gray-700 italic">null</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section: Raw Inspector */}
          <section>
            <h3 className="mb-3 text-[10px] font-bold tracking-widest text-gray-600 uppercase">
              State Inspector
            </h3>
            <div className="overflow-hidden rounded border border-gray-800 bg-black">
              <div className="max-h-[300px] overflow-auto p-3">
                <pre className="font-mono text-[10px] leading-relaxed text-gray-400">
                  {JSON.stringify(
                    state,
                    (key, value) => {
                      if (key === "transcript")
                        return `[Array(${value.length})]`;
                      if (key === "pendingUser") return undefined; // Shown above
                      if (key === "pendingAI") return undefined; // Shown above
                      return value;
                    },
                    2,
                  )}
                </pre>
              </div>
            </div>
          </section>

          {/* Section: Debug Actions */}
          <section>
            <h3 className="mb-3 text-[10px] font-bold tracking-widest text-gray-600 uppercase">
              Actions
            </h3>
            <div className="space-y-3">
              {/* Block Controls - dev-only buttons to step through states */}
              <div className="mb-4 space-y-2">
                <h4 className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  Block Controls
                </h4>
                <button
                  onClick={() => dispatch({ type: "DEV_FORCE_BLOCK_COMPLETE" })}
                  disabled={
                    state.status !== "ANSWERING" &&
                    state.status !== "ANSWER_TIMEOUT_PAUSE"
                  }
                  className="w-full rounded bg-yellow-600 px-3 py-2 text-xs font-bold tracking-wide text-white uppercase transition-colors hover:bg-yellow-500 disabled:opacity-50"
                >
                  Skip Block
                </button>
                <button
                  onClick={() => dispatch({ type: "DEV_FORCE_ANSWER_TIMEOUT" })}
                  disabled={state.status !== "ANSWERING"}
                  className="w-full rounded bg-orange-600 px-3 py-2 text-xs font-bold tracking-wide text-white uppercase transition-colors hover:bg-orange-500 disabled:opacity-50"
                >
                  Answer Timeout
                </button>
              </div>
              <button
                onClick={handleCheckStatus}
                className="w-full rounded bg-gray-800 px-3 py-2 text-xs font-bold tracking-wide text-gray-300 uppercase transition-colors hover:bg-gray-700 hover:text-white"
              >
                Log Status to Console
              </button>
              {debugInfo && (
                <div className="rounded bg-black p-2">
                  <pre className="overflow-x-auto text-[10px] text-yellow-500">
                    {debugInfo}
                  </pre>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
