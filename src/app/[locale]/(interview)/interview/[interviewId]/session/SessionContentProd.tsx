/**
 * SessionContentProd - Production UI component for interview session
 * Immersive video-call style interface with AI avatar and floating controls
 * Receives state and dispatch from parent (via useInterviewSession hook)
 */
"use client";

import { useEffect, useRef, type Dispatch } from "react";
import { useRouter } from "~/i18n/navigation";
import { useTranslations } from "next-intl";
import type { SessionState, SessionEvent } from "./types";
import ThemeToggle from "~/app/_components/ThemeToggle";
import { DevConsole } from "./components/DevConsole";

interface SessionContentProdProps {
  interviewId: string;
  guestToken?: string;
  state: SessionState;
  dispatch: Dispatch<SessionEvent>;
  onConnectionReady?: () => void;
  /** Toggle back to dev UI (dev mode only, when previewing prod) */
  onToggleDevView?: () => void;
}

export function SessionContentProd({
  state,
  dispatch,
  onConnectionReady,
  onToggleDevView,
}: SessionContentProdProps) {
  const router = useRouter();
  const t = useTranslations("interview.session");

  const { connectionState, transcript, elapsedTime, error, isAiSpeaking } =
    state;

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

  // Timer state calculation - pure function for testability
  type TimerState = "normal" | "warning" | "critical" | "expired";

  const getTimerState = (elapsed: number, limit: number): TimerState => {
    if (limit === 0) return "normal"; // No time limit
    const remaining = limit - elapsed;
    if (remaining <= 0) return "expired";
    const pct = remaining / limit;
    return pct <= 0.1 ? "critical" : pct <= 0.4 ? "warning" : "normal";
  };

  // Timer state and progress calculations
  // TODO: Get answerTimeLimit from context when available, defaulting to 120 for now
  const answerTimeLimit = 120; // seconds
  const timerState = getTimerState(elapsedTime, answerTimeLimit);

  // Progress ring calculations
  const circumference = 2 * Math.PI * 46; // ~289
  const remaining = answerTimeLimit - elapsedTime;
  const percentRemaining =
    answerTimeLimit > 0 ? remaining / answerTimeLimit : 1;
  const progressOffset = circumference * (1 - Math.max(0, percentRemaining));

  // Countdown for critical state (last 10 seconds)
  const countdown = Math.max(0, Math.ceil(remaining));

  // Get last AI transcript entry as current question
  const currentQuestion = transcript
    .filter((e) => e.speaker === "AI" && e.is_final)
    .pop()?.text;

  // Loading state
  if (connectionState === "initializing" || connectionState === "connecting") {
    return (
      <div
        data-testid="session-prod"
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
        data-testid="session-prod"
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

  // Live interview state - immersive UI
  return (
    <div
      data-testid="session-prod"
      className="flex h-full flex-col overflow-hidden bg-black"
    >
      {/* Header */}
      <header className="animate-fade-up z-10 flex shrink-0 items-center justify-between border-b border-black/20 bg-black/95 px-6 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* AI Icon */}
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
          {/* Back to Dev button (only in dev preview mode) */}
          {onToggleDevView && (
            <button
              onClick={onToggleDevView}
              className="bg-warning hover:bg-warning/80 rounded px-3 py-1.5 text-xs font-medium text-black"
            >
              Back to Dev
            </button>
          )}
          {/* Block Progress */}
          <div className="bg-secondary hidden items-center gap-2 rounded-lg border border-white/5 px-3 py-1.5 md:flex">
            <LayersIcon className="text-secondary-text size-4" />
            <span className="text-primary-text text-sm font-medium">
              Block {state.status === "ANSWERING" ? state.blockIndex + 1 : 1}/3
            </span>
          </div>
          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </header>

      {/* Main video area */}
      <main className="relative flex flex-1 overflow-hidden">
        <div className="animate-fade-up-delay-1 relative flex flex-1 flex-col items-center justify-center bg-black p-4">
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

              {/* Avatar Content - changes based on timer state */}
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

            {/* Current question overlay - bottom center */}
            {currentQuestion && (
              <div className="pointer-events-none absolute right-0 bottom-40 left-0 z-20 flex justify-center px-6 md:bottom-48">
                <p className="max-w-4xl rounded-xl border border-white/5 bg-black/40 p-4 text-center text-xl leading-relaxed font-medium text-white/95 drop-shadow-lg backdrop-blur-sm md:text-2xl">
                  &ldquo;{currentQuestion}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Floating control bar */}
          <div className="animate-fade-up-delay-2 absolute right-0 bottom-8 left-0 z-30 flex justify-center px-4">
            <div className="flex items-center gap-6 rounded-full border border-white/10 bg-black/90 px-6 py-3 shadow-2xl ring-1 ring-white/5 backdrop-blur-md">
              {/* Mic button - color changes with timer state */}
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
              <div className="bg-secondary/50 mx-2 hidden h-10 items-center gap-1.5 rounded-full border border-white/5 px-4 sm:flex">
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
                onClick={() => {
                  console.log(
                    "[SessionContentProd] End Interview clicked, dispatching INTERVIEW_ENDED",
                  );
                  dispatch({ type: "INTERVIEW_ENDED" });
                }}
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

      {/* Dev Console - only visible in development */}
      <DevConsole state={state} />
    </div>
  );
}

// Inline SVG Icons (no external dependencies)

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
      {/* Background ring */}
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        className="text-secondary-text/20"
      />
      {/* Progress ring */}
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
  // Critical state - show countdown number
  if (timerState === "critical") {
    return (
      <div className="bg-danger/10 ring-danger/30 z-20 flex size-32 items-center justify-center rounded-full ring-4">
        <span className="text-danger text-5xl font-bold tabular-nums">
          {countdown}
        </span>
      </div>
    );
  }

  // Expired state - show "Time Up" message
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

  // Normal/Warning state - show AI avatar
  return (
    <div
      className={`bg-secondary relative z-20 flex size-32 items-center justify-center rounded-full shadow-2xl ring-4 ring-black ${
        isAiSpeaking ? "animate-pulse-soft" : ""
      }`}
    >
      <SmartToyIcon className="text-secondary-text size-16" />
      {/* Online indicator */}
      <div className="absolute right-1 bottom-1 flex size-7 items-center justify-center rounded-full bg-black">
        <div className="bg-success size-4 rounded-full border-2 border-black" />
      </div>
    </div>
  );
}
