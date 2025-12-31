/**
 * SessionContentDev - Development UI component for interview session
 * Uses the same immersive UI as prod but adds a dev console sidebar
 * Receives state and dispatch from parent (via useInterviewSession hook)
 */
"use client";

import { useEffect, useRef, useState, type Dispatch } from "react";
import { useRouter } from "~/i18n/navigation";
import { useTranslations } from "next-intl";
import { StatusIndicator } from "~/app/_components/StatusIndicator";
import ThemeToggle from "~/app/_components/ThemeToggle";
import { getRemainingSeconds } from "~/lib/countdown-timer";
import type { SessionState, SessionEvent, TranscriptEntry } from "./types";

interface SessionContentDevProps {
  interviewId: string;
  guestToken?: string;
  state: SessionState;
  dispatch: Dispatch<SessionEvent>;
  onConnectionReady?: () => void;
  /** Toggle to preview prod UI (dev mode only) */
  onToggleProdView?: () => void;
  totalBlocks?: number;
  answerTimeLimit?: number;
}

export function SessionContentDev({
  state,
  dispatch,
  onConnectionReady,
  onToggleProdView,
  totalBlocks,
  answerTimeLimit = 0,
}: SessionContentDevProps) {
  const router = useRouter();
  const t = useTranslations("interview.session");
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  const { connectionState, transcript, elapsedTime, error, isAiSpeaking } =
    state;
  const pendingUser = state.pendingUser;
  const pendingAI = state.pendingAI;

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

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptScrollRef.current?.scrollTo) {
      transcriptScrollRef.current.scrollTo({
        top: transcriptScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [transcript.length, pendingUser, pendingAI]);

  // Timer state calculation
  type TimerState = "normal" | "warning" | "critical" | "expired";

  const getTimerState = (elapsed: number, limit: number): TimerState => {
    if (limit === 0) return "normal";
    const remaining = limit - elapsed;
    if (remaining <= 0) return "expired";
    const pct = remaining / limit;
    return pct <= 0.1 ? "critical" : pct <= 0.4 ? "warning" : "normal";
  };

  // Use answerTimeLimit from props, fallback to 120 for the avatar timer display
  const effectiveTimeLimit = answerTimeLimit || 120;
  const timerState = getTimerState(elapsedTime, effectiveTimeLimit);

  // Progress ring calculations
  const circumference = 2 * Math.PI * 46;
  const remaining = effectiveTimeLimit - elapsedTime;
  const percentRemaining =
    effectiveTimeLimit > 0 ? remaining / effectiveTimeLimit : 1;
  const progressOffset = circumference * (1 - Math.max(0, percentRemaining));
  const countdown = Math.max(0, Math.ceil(remaining));

  // Get last AI transcript entry as current question
  const currentQuestion = transcript
    .filter((e) => e.speaker === "AI" && e.is_final)
    .pop()?.text;

  // Debug handler
  const handleCheckStatus = () => {
    setDebugInfo(JSON.stringify(state, null, 2));
  };

  // Loading state
  if (connectionState === "initializing" || connectionState === "connecting") {
    return (
      <div
        data-testid="session-dev"
        className="bg-secondary flex h-screen flex-col items-center justify-center"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="border-accent size-16 animate-spin rounded-full border-4 border-t-transparent" />
          <div className="text-primary-text text-lg">{t("connecting")}</div>
        </div>
      </div>
    );
  }

  // Error state
  if (connectionState === "error") {
    return (
      <div
        data-testid="session-dev"
        className="bg-secondary flex h-screen flex-col items-center justify-center"
      >
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-danger text-2xl font-bold">
            {t("connectionError")}
          </h1>
          <p className="text-secondary-text">{error ?? t("connectionLost")}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-accent hover:bg-accent/90 rounded-lg px-6 py-3 font-medium text-white"
          >
            {t("returnToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="session-dev" className="flex h-full overflow-hidden">
      {/* MAIN CONTENT - Same as Prod UI */}
      <div className="flex flex-1 flex-col overflow-hidden bg-black">
        {/* Header */}
        <header className="z-10 flex shrink-0 items-center justify-between border-b border-white/20 bg-black/95 px-6 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="bg-accent/10 text-accent flex size-8 items-center justify-center rounded-lg">
              <SmartToyIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-base leading-tight font-bold text-white">
                {t("title")}
              </h1>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="bg-success flex size-2 rounded-full" />
                <span className="text-secondary-text text-xs font-medium">
                  {t("connected")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Block Progress */}
            <div className="bg-secondary flex items-center gap-2 rounded-lg border border-white/5 px-3 py-1.5">
              <LayersIcon className="text-secondary-text size-4" />
              <span className="text-primary-text text-sm font-medium">
                Block {state.status === "ANSWERING" ? state.blockIndex + 1 : 1}/
                {totalBlocks ?? 3}
              </span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Main video area */}
        <main className="relative flex flex-1 overflow-hidden">
          <div className="relative flex flex-1 flex-col items-center justify-center bg-black p-4">
            {/* Video container */}
            <div className="relative flex h-full max-h-full w-full items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-black shadow-2xl">
              {/* Gradient background */}
              <div className="from-secondary/50 absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] via-black to-black" />

              {/* AI Avatar with Progress Ring Timer */}
              <div className="relative z-10 flex size-40 items-center justify-center">
                {/* Ripple rings - only visible when AI is speaking */}
                {isAiSpeaking && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="animate-ripple border-accent/40 size-40 rounded-full border"
                      style={{ animationDelay: "0s" }}
                    />
                    <div
                      className="animate-ripple border-accent/25 absolute size-40 rounded-full border"
                      style={{ animationDelay: "0.6s" }}
                    />
                    <div
                      className="animate-ripple border-accent/15 absolute size-40 rounded-full border"
                      style={{ animationDelay: "1.2s" }}
                    />
                  </div>
                )}

                {/* Progress Ring SVG */}
                <ProgressRingSVG
                  timerState={timerState}
                  progressOffset={progressOffset}
                />

                {/* Avatar Content */}
                <AvatarContent
                  timerState={timerState}
                  isAiSpeaking={isAiSpeaking}
                  countdown={countdown}
                />
              </div>

              {/* AI Name label - top left */}
              <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 shadow-sm backdrop-blur-md">
                  <span className="text-sm font-semibold tracking-wide text-white">
                    {t("aiName")}
                  </span>
                </div>
              </div>

              {/* Status badge - top right */}
              <div className="absolute top-6 right-6 z-20">
                <div
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-black/80 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md"
                  role="status"
                  aria-live="polite"
                >
                  <WaveformIcon
                    className={`size-4 ${isAiSpeaking ? "text-accent" : "text-success"} ${isAiSpeaking ? "" : "animate-pulse"}`}
                  />
                  {isAiSpeaking ? t("speaking") : t("listening")}
                </div>
              </div>

              {/* Current question overlay */}
              {currentQuestion && (
                <div className="pointer-events-none absolute right-0 bottom-40 left-0 z-20 flex justify-center px-6 md:bottom-48">
                  <p className="max-w-4xl rounded-xl border border-white/5 bg-black/40 p-4 text-center text-xl leading-relaxed font-medium text-white/95 drop-shadow-lg backdrop-blur-sm md:text-2xl">
                    &ldquo;{currentQuestion}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Floating control bar */}
            <div className="absolute right-0 bottom-8 left-0 z-30 flex justify-center px-4">
              <div className="flex items-center gap-6 rounded-full border border-white/10 bg-black/90 px-6 py-3 shadow-2xl ring-1 ring-white/5 backdrop-blur-md">
                {/* Mic button */}
                <button className="group flex flex-col items-center gap-1">
                  <div
                    className={`relative flex size-14 items-center justify-center rounded-full text-white ring-1 ring-white/10 transition-all ${
                      timerState === "expired"
                        ? "bg-secondary-text"
                        : timerState === "critical"
                          ? "bg-danger shadow-danger/20 shadow-lg"
                          : timerState === "warning"
                            ? "bg-warning shadow-warning/20 shadow-lg"
                            : "bg-accent shadow-accent/20 shadow-lg"
                    }`}
                  >
                    {timerState === "expired" ? (
                      <MicOffIcon className="size-6" />
                    ) : (
                      <MicIcon className="size-6 transition-transform group-hover:scale-110" />
                    )}
                  </div>
                </button>

                {/* Audio waveform */}
                <div className="bg-secondary/50 mx-2 flex h-10 items-center gap-1.5 rounded-full border border-white/5 px-4">
                  <div className="bg-accent h-3 w-1 animate-pulse rounded-full" />
                  <div
                    className="bg-accent h-6 w-1 animate-pulse rounded-full"
                    style={{ animationDelay: "75ms" }}
                  />
                  <div
                    className="bg-accent h-4 w-1 animate-pulse rounded-full"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="bg-accent h-8 w-1 animate-pulse rounded-full"
                    style={{ animationDelay: "300ms" }}
                  />
                  <div
                    className="bg-accent h-5 w-1 animate-pulse rounded-full"
                    style={{ animationDelay: "100ms" }}
                  />
                  <div
                    className="bg-accent h-3 w-1 animate-pulse rounded-full"
                    style={{ animationDelay: "200ms" }}
                  />
                </div>

                {/* End call button */}
                <button
                  onClick={() => dispatch({ type: "INTERVIEW_ENDED" })}
                  disabled={connectionState === "ending"}
                  className="group flex flex-col items-center gap-1"
                >
                  <div className="bg-danger shadow-danger/20 hover:bg-danger/90 flex size-14 items-center justify-center rounded-full text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50">
                    <PhoneEndIcon className="size-6 transition-transform group-hover:scale-105" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* DEV CONSOLE SIDEBAR */}
      <div className="text-secondary-text flex w-[400px] shrink-0 flex-col border-l border-white/10 bg-black">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold tracking-wider text-white uppercase">
              Dev Console
            </h2>
            <span className="bg-accent/20 text-accent rounded px-1.5 py-0.5 text-[10px] font-bold">
              DEV
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`size-2 rounded-full ${connectionState === "live" ? "bg-success" : "bg-warning"}`}
            />
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
          {/* Quick Controls */}
          <section className="flex items-center justify-between">
            <StatusIndicator status={isAiSpeaking ? "speaking" : "listening"} />
            {onToggleProdView && (
              <button
                onClick={onToggleProdView}
                className="bg-warning hover:bg-warning/80 rounded px-3 py-1.5 text-xs font-medium text-black"
              >
                Preview Prod
              </button>
            )}
          </section>

          {/* State Monitor */}
          <section>
            <h3 className="mb-2 text-[10px] font-bold tracking-widest uppercase opacity-60">
              State Monitor
            </h3>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="rounded bg-white/5 p-2">
                <div className="mb-1 text-[10px] opacity-50">Connection</div>
                <div
                  className={`font-bold ${connectionState === "live" ? "text-success" : "text-warning"}`}
                >
                  {connectionState.toUpperCase()}
                </div>
              </div>
              <div className="rounded bg-white/5 p-2">
                <div className="mb-1 text-[10px] opacity-50">Phase</div>
                <div className="text-info font-bold">
                  {state.status.replace(/_/g, " ")}
                </div>
              </div>
              <div className="rounded bg-white/5 p-2">
                <div className="mb-1 text-[10px] opacity-50">Audio</div>
                <div className="font-bold text-white">
                  {isAiSpeaking ? "SPEAKING" : "LISTENING"}
                </div>
              </div>
              <div className="rounded bg-white/5 p-2">
                <div className="mb-1 text-[10px] opacity-50">Block</div>
                <div className="font-bold text-white">
                  {"blockIndex" in state ? `#${state.blockIndex + 1}` : "-"}
                </div>
              </div>
            </div>
          </section>

          {/* Transcript */}
          <section>
            <h3 className="mb-2 text-[10px] font-bold tracking-widest uppercase opacity-60">
              Transcript
            </h3>
            <div
              ref={transcriptScrollRef}
              className="h-40 overflow-y-auto rounded border border-white/10 bg-white/5 p-2"
            >
              {transcript.length === 0 && !pendingUser && !pendingAI ? (
                <p className="py-4 text-center text-xs opacity-50">
                  No transcript yet...
                </p>
              ) : (
                <div className="space-y-1">
                  {transcript.map((entry, i) => (
                    <TranscriptLine key={i} entry={entry} />
                  ))}
                  {pendingUser && (
                    <TranscriptLine
                      entry={{
                        speaker: "USER",
                        text: pendingUser,
                        is_final: false,
                      }}
                    />
                  )}
                  {pendingAI && (
                    <TranscriptLine
                      entry={{
                        speaker: "AI",
                        text: pendingAI,
                        is_final: false,
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Raw Buffers */}
          <section>
            <h3 className="mb-2 text-[10px] font-bold tracking-widest uppercase opacity-60">
              Raw Buffers
            </h3>
            <div className="space-y-2 font-mono text-xs">
              <div className="rounded border border-white/10 bg-white/5 p-2">
                <div className="mb-1 flex justify-between text-[10px] opacity-50">
                  <span>USER_BUFFER</span>
                  <span>{pendingUser?.length ?? 0} chars</span>
                </div>
                <div className="text-info min-h-[1.5em] break-all">
                  {pendingUser ?? (
                    <span className="italic opacity-50">null</span>
                  )}
                </div>
              </div>
              <div className="rounded border border-white/10 bg-white/5 p-2">
                <div className="mb-1 flex justify-between text-[10px] opacity-50">
                  <span>AI_BUFFER</span>
                  <span>{pendingAI?.length ?? 0} chars</span>
                </div>
                <div className="text-success min-h-[1.5em] break-all">
                  {pendingAI ?? <span className="italic opacity-50">null</span>}
                </div>
              </div>
            </div>
          </section>

          {/* Timer Controls */}
          {(state.status === "ANSWERING" ||
            state.status === "ANSWER_TIMEOUT_PAUSE") &&
            answerTimeLimit > 0 && (
              <section>
                <h3 className="mb-2 text-[10px] font-bold tracking-widest uppercase opacity-60">
                  Timer
                </h3>
                <div className="space-y-2">
                  {(() => {
                    const now = Date.now();
                    const remaining =
                      state.status === "ANSWER_TIMEOUT_PAUSE"
                        ? 0
                        : getRemainingSeconds(
                            state.answerStartTime,
                            answerTimeLimit,
                            now,
                          );
                    const minutes = Math.floor(remaining / 60);
                    const seconds = remaining % 60;
                    const isLow = remaining < 30;

                    return (
                      <>
                        <div
                          className={`rounded-lg p-3 text-center ${
                            isLow
                              ? "bg-danger/20 border-danger border"
                              : "border border-white/10 bg-white/5"
                          }`}
                        >
                          <div
                            className={`font-mono text-2xl font-bold ${
                              isLow ? "text-danger animate-pulse" : "text-white"
                            }`}
                          >
                            {minutes}:{String(seconds).padStart(2, "0")}
                          </div>
                          <div className="mt-1 text-[10px] opacity-50">
                            {isLow ? "Time running low!" : "Time remaining"}
                          </div>
                        </div>
                        {state.status === "ANSWERING" && (
                          <button
                            onClick={() =>
                              dispatch({ type: "USER_CLICKED_NEXT" })
                            }
                            className="bg-info hover:bg-info/80 w-full rounded px-3 py-2 text-xs font-bold text-white uppercase transition-colors"
                          >
                            Next Question →
                          </button>
                        )}
                        {state.status === "ANSWER_TIMEOUT_PAUSE" && (
                          <div className="bg-warning/20 border-warning rounded-lg border p-2 text-center">
                            <span className="text-warning text-xs font-bold">
                              ⏱️ Time&apos;s Up!
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </section>
            )}

          {/* State Inspector */}
          <section>
            <h3 className="mb-2 text-[10px] font-bold tracking-widest uppercase opacity-60">
              State Inspector
            </h3>
            <div className="max-h-32 overflow-auto rounded border border-white/10 bg-white/5 p-2">
              <pre className="font-mono text-[10px] text-white/70">
                {JSON.stringify(
                  state,
                  (key, value: unknown) => {
                    if (key === "transcript" && Array.isArray(value))
                      return `[Array(${value.length})]`;
                    if (key === "pendingUser" || key === "pendingAI")
                      return undefined;
                    return value;
                  },
                  2,
                )}
              </pre>
            </div>
          </section>

          {/* Actions */}
          <section>
            <h3 className="mb-2 text-[10px] font-bold tracking-widest uppercase opacity-60">
              Actions
            </h3>
            <div className="space-y-2">
              {/* Block Controls */}
              <h4 className="text-[10px] font-bold tracking-widest uppercase opacity-40">
                Block Controls
              </h4>
              <button
                onClick={() => dispatch({ type: "DEV_FORCE_BLOCK_COMPLETE" })}
                disabled={
                  state.status !== "ANSWERING" &&
                  state.status !== "ANSWER_TIMEOUT_PAUSE"
                }
                className="bg-warning hover:bg-warning/80 w-full rounded px-3 py-2 text-xs font-bold text-black uppercase transition-colors disabled:opacity-50"
              >
                Skip Block
              </button>
              <button
                onClick={() => dispatch({ type: "DEV_FORCE_ANSWER_TIMEOUT" })}
                disabled={state.status !== "ANSWERING"}
                className="bg-warning hover:bg-warning/80 w-full rounded px-3 py-2 text-xs font-bold text-black uppercase transition-colors disabled:opacity-50"
              >
                Answer Timeout
              </button>
              <button
                onClick={handleCheckStatus}
                className="w-full rounded bg-white/10 px-3 py-2 text-xs font-bold uppercase transition-colors hover:bg-white/20"
              >
                Log Status to Console
              </button>
              {debugInfo && (
                <div className="max-h-32 overflow-auto rounded bg-black p-2">
                  <pre className="text-warning text-[10px]">{debugInfo}</pre>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// Transcript line component
function TranscriptLine({ entry }: { entry: TranscriptEntry }) {
  const isAI = entry.speaker === "AI";
  const isPending = !entry.is_final;

  return (
    <div
      className={`flex gap-2 rounded px-1 py-0.5 text-[11px] ${isPending ? "opacity-50" : ""}`}
    >
      <span
        className={`shrink-0 font-mono font-semibold ${isAI ? "text-info" : "text-success"}`}
      >
        [{isAI ? "AI" : "U"}]
      </span>
      <span className="text-white/90">{entry.text}</span>
    </div>
  );
}

// Inline SVG Icons (same as prod)

function SmartToyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
    </svg>
  );
}

function PhoneEndIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
    </svg>
  );
}

function WaveformIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19 11c0 1.19-.34 2.3-.9 3.28l-1.23-1.23c.27-.62.43-1.31.43-2.05H19zm-4.02.22c0-.03.02-.06.02-.09V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.17l5.98 5.98v.07zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9l4.19 4.18L21 19.73 4.27 3z" />
    </svg>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z" />
    </svg>
  );
}

function ProgressRingSVG({
  timerState,
  progressOffset,
}: {
  timerState: "normal" | "warning" | "critical" | "expired";
  progressOffset: number;
}) {
  const ringColorClass = {
    normal: "text-accent",
    warning: "text-warning",
    critical: "text-danger animate-pulse-ring-danger",
    expired: "text-secondary-text",
  }[timerState];

  return (
    <svg className="absolute inset-0 size-40 -rotate-90" viewBox="0 0 100 100">
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        className="text-secondary-text/20"
      />
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="289"
        strokeDashoffset={progressOffset}
        className={`progress-ring ${ringColorClass}`}
      />
    </svg>
  );
}

function AvatarContent({
  timerState,
  isAiSpeaking,
  countdown,
}: {
  timerState: "normal" | "warning" | "critical" | "expired";
  isAiSpeaking: boolean;
  countdown: number;
}) {
  if (timerState === "critical") {
    return (
      <div className="bg-danger/10 ring-danger/30 z-20 flex size-32 items-center justify-center rounded-full ring-4">
        <span className="text-danger text-5xl font-bold tabular-nums">
          {countdown}
        </span>
      </div>
    );
  }

  if (timerState === "expired") {
    return (
      <div className="bg-secondary-text/10 ring-secondary-text/30 z-20 flex size-32 flex-col items-center justify-center rounded-full ring-4">
        <MicOffIcon className="text-secondary-text size-10" />
        <span className="text-secondary-text mt-0.5 text-[10px] font-semibold tracking-wide uppercase">
          Time Up
        </span>
      </div>
    );
  }

  return (
    <div
      className={`bg-secondary relative z-20 flex size-32 items-center justify-center rounded-full shadow-2xl ring-4 ring-black ${
        isAiSpeaking ? "animate-pulse-soft" : ""
      }`}
    >
      <SmartToyIcon className="text-secondary-text size-16" />
      <div className="absolute right-1 bottom-1 flex size-7 items-center justify-center rounded-full bg-black">
        <div className="bg-success size-4 rounded-full border-2 border-black" />
      </div>
    </div>
  );
}
