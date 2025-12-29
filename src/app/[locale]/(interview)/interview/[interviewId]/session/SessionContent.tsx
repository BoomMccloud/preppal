/**
 * SessionContent - Pure UI component for interview session display
 * Receives state and dispatch from parent (via useInterviewSession hook)
 * Renders UI based on state and dispatches user actions
 */
"use client";

import { useEffect, useRef, useState, type Dispatch } from "react";
import { useRouter } from "~/i18n/navigation";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { StatusIndicator } from "~/app/_components/StatusIndicator";
import { AIAvatar } from "~/app/_components/AIAvatar";
import type { SessionState, SessionEvent } from "./types";

const IS_DEV = process.env.NODE_ENV === "development";

interface SessionContentProps {
  interviewId: string;
  guestToken?: string;
  // Required: state and dispatch from useInterviewSession hook
  state: SessionState;
  dispatch: Dispatch<SessionEvent>;
  // Optional: callback when connection is ready (used by BlockSession)
  onConnectionReady?: () => void;
}

export function SessionContent({
  interviewId,
  guestToken,
  state,
  dispatch,
  onConnectionReady,
}: SessionContentProps) {
  const router = useRouter();
  const t = useTranslations("interview.session");
  const tCommon = useTranslations("common");
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [shouldPoll, setShouldPoll] = useState(true);

  // Debug state - only used in development
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
      refetchInterval: shouldPoll ? 1000 : false, // Poll every 1 second
      retry: false, // Don't retry on error (like 404)
    },
  );

  // Stop polling if we have an error or interview is completed
  useEffect(() => {
    if (interviewError || interview?.status === "COMPLETED") {
      setShouldPoll(false);
    }
  }, [interviewError, interview?.status]);

  // Debug query - only enabled in development
  const { data: interviewStatus } = api.debug.getInterviewStatus.useQuery(
    { interviewId },
    {
      enabled: IS_DEV && !!interviewId,
      refetchInterval: 5000,
    },
  );

  // Debug handler - only used in development
  const handleCheckStatus = () => {
    if (!IS_DEV) return;
    const statusInfo = {
      interview: interview ?? null,
      interviewStatus: interviewStatus ?? null,
    };
    setDebugInfo(JSON.stringify(statusInfo, null, 2));
  };

  // Note: Navigation to feedback is handled by useInterviewSession hook
  // when state.status === "INTERVIEW_COMPLETE"

  // Get state properties
  const { connectionState, transcript, elapsedTime, error, isAiSpeaking } =
    state;

  // Auto-scroll to latest transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript.length, transcript]);

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
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">{tCommon("loading")}</div>
      </div>
    );
  }

  // Connecting state
  if (connectionState === "initializing" || connectionState === "connecting") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">
          <div>{t("connecting")}</div>
          {IS_DEV && (
            <>
              <div className="mt-4">
                <button
                  onClick={handleCheckStatus}
                  className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                  {t("checkInterviewStatus")}
                </button>
              </div>
              {debugInfo && (
                <div className="mt-4 rounded bg-gray-100 p-2">
                  <pre className="text-xs">{debugInfo}</pre>
                </div>
              )}
              <div className="mt-4 text-sm text-gray-500">
                {t("currentStatus", { status: interview?.status ?? "Unknown" })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (connectionState === "error") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold text-red-600">
            {t("connectionError")}
          </h1>
          <p className="text-gray-700">{error ?? t("connectionLost")}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {t("returnToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  // Live interview state
  return (
    <div className="flex h-screen flex-col">
      {/* Header with timer */}
      <div className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <div className="flex items-center gap-4">
            <StatusIndicator status={isAiSpeaking ? "speaking" : "listening"} />
            <div className="font-mono text-lg">{formatTime(elapsedTime)}</div>
          </div>
        </div>
        {IS_DEV && debugInfo && (
          <div className="mt-2 rounded bg-gray-100 p-2">
            <pre className="text-xs">{debugInfo}</pre>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex min-h-0 flex-1 flex-col bg-gray-50">
        {/* AI Avatar - Fixed at top */}
        <div className="shrink-0 p-6 pb-0">
          <div className="mx-auto max-w-4xl">
            <AIAvatar status={isAiSpeaking ? t("speaking") : t("listening")} />
          </div>
        </div>

        {/* Transcript - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl space-y-4">
            {transcript.length === 0 ? (
              <div className="text-center text-gray-500">
                <p>{t("waitingToBegin")}</p>
                {IS_DEV && (
                  <p className="mt-2 text-sm">
                    {t("currentStatus", {
                      status: interview?.status ?? "Unknown",
                    })}
                  </p>
                )}
              </div>
            ) : (
              transcript.map((entry, index) => (
                <div
                  key={index}
                  className={`flex ${entry.speaker === "USER" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      entry.speaker === "AI"
                        ? "bg-gray-200 text-gray-900"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    <div className="mb-1 text-xs font-semibold">
                      {entry.speaker === "AI" ? t("aiInterviewer") : t("you")}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">
                      {entry.text}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-t bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl justify-center">
          <button
            onClick={() => {
              console.log(
                "[SessionContent] End Interview clicked, dispatching INTERVIEW_ENDED",
              );
              dispatch({ type: "INTERVIEW_ENDED" });
            }}
            disabled={connectionState === "ending"}
            className="rounded-full bg-red-600 px-8 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {connectionState === "ending" ? t("ending") : t("endInterview")}
          </button>
        </div>
      </div>
    </div>
  );
}
