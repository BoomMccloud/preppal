"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useInterviewSocket } from "./useInterviewSocket";
import { StatusIndicator } from "~/app/_components/StatusIndicator";

interface SessionContentProps {
  interviewId: string;
}

export function SessionContent({ interviewId }: SessionContentProps) {
  const router = useRouter();
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Check interview status - block if not PENDING
  const { data: interview, isLoading } = api.interview.getById.useQuery(
    {
      id: interviewId,
    },
    {
      refetchInterval: 1000,
    },
  );

  const { data: interviewStatus } = api.debug.getInterviewStatus.useQuery(
    { interviewId },
    {
      enabled: !!interviewId,
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  );

  const handleCheckStatus = async () => {
    try {
      const response = await api.debug.getInterviewStatus.fetch({
        interviewId,
      });
      setDebugInfo(JSON.stringify(response, null, 2));
    } catch (error) {
      setDebugInfo(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  useEffect(() => {
    if (!isLoading && interview) {
      if (interview.status === "COMPLETED") {
        router.push(`/interview/${interviewId}/feedback`);
      }
    }
  }, [interview, isLoading, router, interviewId]);

  // WebSocket connection and state management
  const { state, transcript, elapsedTime, error, endInterview, isAiSpeaking } =
    useInterviewSocket({
      interviewId,
      onSessionEnded: () => {
        router.push(`/interview/${interviewId}/feedback`);
      },
    });

  // Auto-scroll to latest transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

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
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Connecting state
  if (state === "initializing" || state === "connecting") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">
          <div>Connecting...</div>
          <div className="mt-4">
            <button
              onClick={handleCheckStatus}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Check Interview Status
            </button>
          </div>
          {debugInfo && (
            <div className="mt-4 rounded bg-gray-100 p-2">
              <pre className="text-xs">{debugInfo}</pre>
            </div>
          )}
          <div className="mt-4 text-sm text-gray-500">
            Current interview status: {interview?.status || "Unknown"}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold text-red-600">Connection Error</h1>
          <p className="text-gray-700">
            {error ?? "Connection lost. Please return to the dashboard."}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Return to Dashboard
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
          <h1 className="text-xl font-semibold">Interview Session</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleCheckStatus}
              className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
            >
              Check Status
            </button>
            <StatusIndicator status={isAiSpeaking ? "speaking" : "listening"} />
            <div className="font-mono text-lg">{formatTime(elapsedTime)}</div>
          </div>
        </div>
        {debugInfo && (
          <div className="mt-2 rounded bg-gray-100 p-2">
            <pre className="text-xs">{debugInfo}</pre>
          </div>
        )}
      </div>

      {/* Transcript area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {transcript.length === 0 ? (
            <div className="text-center text-gray-500">
              <p>Waiting for the interview to begin...</p>
              <p className="mt-2 text-sm">
                Current interview status: {interview?.status || "Unknown"}
              </p>
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
                    {entry.speaker === "AI" ? "AI Interviewer" : "You"}
                  </div>
                  <div className="text-sm">{entry.text}</div>
                </div>
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* Controls */}
      <div className="border-t bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl justify-center">
          <button
            onClick={endInterview}
            disabled={state === "ending"}
            className="rounded-full bg-red-600 px-8 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state === "ending" ? "Ending..." : "End Interview"}
          </button>
        </div>
      </div>
    </div>
  );
}
