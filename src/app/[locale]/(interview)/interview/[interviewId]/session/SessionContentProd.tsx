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

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

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
      className="flex h-screen flex-col overflow-hidden bg-slate-900"
    >
      {/* Header */}
      <header className="z-10 flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 py-3 backdrop-blur-sm">
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
              <span className="text-xs font-medium text-slate-400">
                {t("connected")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Back to Dev button (only in dev preview mode) */}
          {onToggleDevView && (
            <button
              onClick={onToggleDevView}
              className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-black hover:bg-yellow-400"
            >
              Back to Dev
            </button>
          )}
          {/* Timer */}
          <div className="hidden items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 md:flex">
            <TimerIcon className="size-4 text-slate-400" />
            <span className="font-mono text-sm text-slate-200">
              {formatTime(elapsedTime)}
            </span>
          </div>
        </div>
      </header>

      {/* Main video area */}
      <main className="relative flex flex-1 overflow-hidden">
        <div className="relative flex flex-1 flex-col items-center justify-center bg-black p-4">
          {/* Video container */}
          <div className="relative flex h-full max-h-full w-full items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-[#202124] shadow-2xl">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/50 via-[#202124] to-[#202124]" />

            {/* AI Avatar with ripple */}
            <div className="relative z-10 flex flex-col items-center justify-center">
              {/* Ripple rings */}
              <div className="absolute flex items-center justify-center">
                <div
                  className="animate-ripple border-accent/30 size-32 rounded-full border"
                  style={{ animationDelay: "0s" }}
                />
                <div
                  className="animate-ripple border-accent/20 absolute size-32 rounded-full border"
                  style={{ animationDelay: "0.6s" }}
                />
                <div
                  className="animate-ripple border-accent/10 absolute size-32 rounded-full border"
                  style={{ animationDelay: "1.2s" }}
                />
              </div>
              {/* Avatar circle */}
              <div className="animate-pulse-soft relative z-20 flex size-32 items-center justify-center rounded-full bg-slate-700 shadow-2xl ring-4 ring-[#202124]">
                <SmartToyIcon className="size-16 text-slate-300" />
                {/* Online indicator */}
                <div className="absolute right-1 bottom-1 flex size-7 items-center justify-center rounded-full bg-[#202124]">
                  <div className="bg-success size-4 rounded-full border-2 border-[#202124]" />
                </div>
              </div>
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
                className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md"
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
          <div className="absolute right-0 bottom-8 left-0 z-30 flex justify-center px-4">
            <div className="flex items-center gap-6 rounded-full border border-white/10 bg-slate-900/90 px-6 py-3 shadow-2xl ring-1 ring-white/5 backdrop-blur-md">
              {/* Mic button */}
              <button className="group flex flex-col items-center gap-1">
                <div className="relative flex size-14 items-center justify-center rounded-full bg-slate-700 text-white ring-1 ring-white/10 transition-all hover:bg-slate-600">
                  <MicIcon className="size-6 transition-transform group-hover:scale-110" />
                  <span className="border-accent/50 absolute inset-0 animate-ping rounded-full border opacity-30" />
                </div>
              </button>

              {/* Audio waveform */}
              <div className="mx-2 hidden h-10 items-center gap-1.5 rounded-full border border-white/5 bg-slate-800/50 px-4 sm:flex">
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

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61 1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
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
