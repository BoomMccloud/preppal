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
        className="bg-secondary flex h-screen items-center justify-center"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="border-accent h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
          <div className="text-secondary-text text-lg">
            {tCommon("loading")}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (connectionState === "error") {
    return (
      <div
        data-testid="session-dev"
        className="bg-danger/10 flex h-screen items-center justify-center"
      >
        <div className="bg-primary max-w-md space-y-6 rounded-xl p-8 text-center shadow-lg">
          <div className="bg-danger/20 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-danger text-2xl font-bold">
            {t("connectionError")}
          </h1>
          <div className="bg-danger/10 text-danger rounded p-4 text-left font-mono text-sm">
            {error ?? t("connectionLost")}
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-danger hover:bg-danger/80 w-full rounded-lg px-4 py-3 font-semibold text-white transition-colors"
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
      <div className="bg-secondary flex flex-1 flex-col transition-all">
        {/* Header */}
        <div className="bg-primary flex items-center justify-between border-b px-6 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-primary-text text-xl font-bold">
              {t("title")}
            </h1>
            <span className="bg-accent/10 text-accent flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase">
              <span className="bg-accent h-2 w-2 animate-pulse rounded-full"></span>
              Dev Mode
            </span>
          </div>
          <div className="flex items-center gap-6">
            <StatusIndicator status={isAiSpeaking ? "speaking" : "listening"} />
            <div className="text-primary-text font-mono text-xl font-medium tabular-nums">
              {formatTime(elapsedTime)}
            </div>
            {onToggleProdView && (
              <button
                onClick={onToggleProdView}
                className="bg-secondary text-primary-text hover:bg-secondary/80 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                Preview Prod UI
              </button>
            )}
          </div>
        </div>

        {/* Avatar Area */}
        <div className="bg-primary p-6 shadow-sm">
          <div className="mx-auto max-w-2xl">
            <AIAvatar status={isAiSpeaking ? t("speaking") : t("listening")} />
          </div>
        </div>

        {/* Transcript Area - The "Streaming Buffer" View */}
        <div className="flex-1 overflow-y-auto scroll-smooth p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {transcript.length === 0 && !pendingUser && !pendingAI ? (
              <div className="text-secondary-text flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 text-4xl">💬</div>
                <p>{t("waitingToBegin")}</p>
                <p className="text-secondary-text mt-2 font-mono text-xs">
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
                          ? "border-secondary bg-primary text-primary-text border"
                          : "bg-info text-white"
                      }`}
                    >
                      <div
                        className={`mb-1 text-xs font-bold tracking-wider uppercase opacity-70 ${
                          entry.speaker === "AI"
                            ? "text-secondary-text"
                            : "text-white"
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
                    <div className="border-info/20 bg-info/10 relative max-w-[80%] rounded-2xl border px-6 py-4 shadow-sm">
                      <div className="text-info mb-1 flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                        {t("aiInterviewer")}
                        <span className="bg-info inline-block h-1.5 w-1.5 animate-pulse rounded-full"></span>
                      </div>
                      <div className="text-secondary-text leading-relaxed whitespace-pre-wrap">
                        {pendingAI}
                        <span className="text-info animate-pulse font-light">
                          ...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. LIVE User Buffer (Streaming in) */}
                {pendingUser && (
                  <div className="flex justify-end">
                    <div className="border-info bg-info/90 relative max-w-[80%] rounded-2xl border px-6 py-4 shadow-sm backdrop-blur-sm">
                      <div className="mb-1 flex items-center justify-end gap-2 text-xs font-bold tracking-wider text-white uppercase">
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
        <div className="bg-primary border-t px-6 py-4">
          <div className="mx-auto flex max-w-3xl justify-center">
            <button
              onClick={() => dispatch({ type: "INTERVIEW_ENDED" })}
              disabled={connectionState === "ending"}
              className="bg-danger/10 text-danger hover:bg-danger/20 rounded-full px-8 py-3 font-semibold transition-colors disabled:opacity-50"
            >
              {connectionState === "ending" ? t("ending") : t("endInterview")}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Dev Tools (Fixed Width) */}
      <div className="text-secondary-text flex w-[400px] flex-col border-l border-black/20 bg-black">
        <div className="flex items-center justify-between border-b border-black/20 px-4 py-3">
          <h2 className="text-secondary-text text-xs font-bold tracking-wider uppercase">
            Dev Console
          </h2>
          <div className="flex h-2 w-2">
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                connectionState === "live" ? "bg-success" : "bg-warning"
              }`}
            >
              {connectionState === "live" && (
                <span className="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
              )}
            </span>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto p-4">
          {/* Section: Status Grid */}
          <section>
            <h3 className="text-secondary-text mb-3 text-[10px] font-bold tracking-widest uppercase">
              State Monitor
            </h3>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="rounded bg-black/50 p-2.5">
                <div className="text-secondary-text mb-1 text-[10px]">
                  Connection
                </div>
                <div
                  className={`font-bold ${
                    connectionState === "live" ? "text-success" : "text-warning"
                  }`}
                >
                  {connectionState.toUpperCase()}
                </div>
              </div>
              <div className="rounded bg-black/50 p-2.5">
                <div className="text-secondary-text mb-1 text-[10px]">
                  Phase
                </div>
                <div className="text-info font-bold">
                  {state.status.replace(/_/g, " ")}
                </div>
              </div>
              <div className="rounded bg-black/50 p-2.5">
                <div className="text-secondary-text mb-1 text-[10px]">
                  Audio
                </div>
                <div className="font-bold text-white">
                  {isAiSpeaking ? "🤖 SPEAKING" : "👂 LISTENING"}
                </div>
              </div>
              <div className="rounded bg-black/50 p-2.5">
                <div className="text-secondary-text mb-1 text-[10px]">
                  Block
                </div>
                <div className="font-bold text-white">
                  {"blockIndex" in state ? `#${state.blockIndex}` : "-"}
                </div>
              </div>
            </div>
          </section>

          {/* Section: Live Buffers (Raw View) */}
          <section>
            <h3 className="text-secondary-text mb-3 text-[10px] font-bold tracking-widest uppercase">
              Raw Buffers
            </h3>
            <div className="space-y-2 font-mono text-xs">
              <div className="rounded border border-black/20 bg-black/50 p-3">
                <div className="text-secondary-text mb-1 flex justify-between text-[10px]">
                  <span>USER_BUFFER</span>
                  <span className="text-secondary-text">
                    {pendingUser?.length ?? 0} chars
                  </span>
                </div>
                <div className="text-info min-h-[1.5em] break-all">
                  {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- JSX fallback requires ternary */}
                  {pendingUser ? (
                    pendingUser
                  ) : (
                    <span className="text-secondary-text italic">null</span>
                  )}
                </div>
              </div>
              <div className="rounded border border-black/20 bg-black/50 p-3">
                <div className="text-secondary-text mb-1 flex justify-between text-[10px]">
                  <span>AI_BUFFER</span>
                  <span className="text-secondary-text">
                    {pendingAI?.length ?? 0} chars
                  </span>
                </div>
                <div className="text-success min-h-[1.5em] break-all">
                  {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- JSX fallback requires ternary */}
                  {pendingAI ? (
                    pendingAI
                  ) : (
                    <span className="text-secondary-text italic">null</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section: Raw Inspector */}
          <section>
            <h3 className="text-secondary-text mb-3 text-[10px] font-bold tracking-widest uppercase">
              State Inspector
            </h3>
            <div className="overflow-hidden rounded border border-black/20 bg-black">
              <div className="max-h-[300px] overflow-auto p-3">
                <pre className="text-secondary-text font-mono text-[10px] leading-relaxed">
                  {JSON.stringify(
                    state,
                    (key, value: unknown) => {
                      if (key === "transcript" && Array.isArray(value))
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
            <h3 className="text-secondary-text mb-3 text-[10px] font-bold tracking-widest uppercase">
              Actions
            </h3>
            <div className="space-y-3">
              {/* Block Controls - dev-only buttons to step through states */}
              <div className="mb-4 space-y-2">
                <h4 className="text-secondary-text text-[10px] font-bold tracking-widest uppercase">
                  Block Controls
                </h4>
                <button
                  onClick={() => dispatch({ type: "DEV_FORCE_BLOCK_COMPLETE" })}
                  disabled={
                    state.status !== "ANSWERING" &&
                    state.status !== "ANSWER_TIMEOUT_PAUSE"
                  }
                  className="bg-warning hover:bg-warning/80 w-full rounded px-3 py-2 text-xs font-bold tracking-wide text-white uppercase transition-colors disabled:opacity-50"
                >
                  Skip Block
                </button>
                <button
                  onClick={() => dispatch({ type: "DEV_FORCE_ANSWER_TIMEOUT" })}
                  disabled={state.status !== "ANSWERING"}
                  className="bg-warning hover:bg-warning/80 w-full rounded px-3 py-2 text-xs font-bold tracking-wide text-white uppercase transition-colors disabled:opacity-50"
                >
                  Answer Timeout
                </button>
              </div>
              <button
                onClick={handleCheckStatus}
                className="bg-secondary text-secondary-text hover:bg-secondary/80 hover:text-primary-text w-full rounded px-3 py-2 text-xs font-bold tracking-wide uppercase transition-colors"
              >
                Log Status to Console
              </button>
              {debugInfo && (
                <div className="rounded bg-black p-2">
                  <pre className="text-warning overflow-x-auto text-[10px]">
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
