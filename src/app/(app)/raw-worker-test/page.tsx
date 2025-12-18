/**
 * @file src/app/(app)/raw-worker-test/page.tsx
 * @description A client-side component for testing raw audio websocket connections to the Cloudflare worker.
 * This page provides a simple interface to connect to the worker's debug endpoint,
 * stream microphone audio, and visualize the connection status, AI speaking state, and recording state.
 * It's designed to bypass all other application logic for direct pipeline testing.
 */
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { RawAudioClient } from "~/lib/audio/RawAudioClient";
import { TranscriptManager } from "~/lib/audio/TranscriptManager";

export default function RawWorkerTestPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    connectAttempts: 0,
    activeConnections: 0,
  });

  // Dynamic prompt context inputs
  const [persona, setPersona] = useState("professional interviewer");
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState("");

  const clientRef = useRef<RawAudioClient | null>(null);
  const transcriptManagerRef = useRef<TranscriptManager | null>(null);

  useEffect(() => {
    // 1. Instantiate the transcript manager to log sentences
    transcriptManagerRef.current = new TranscriptManager({
      onSentence: (speaker, sentence) => {
        console.log(`[${speaker}]: ${sentence}`);
      },
    });

    // 2. Instantiate the raw client
    clientRef.current = new RawAudioClient({
      onConnectionStateChange: (state) => {
        setIsConnected(state === "connected");
      },
      onRecordingStateChange: setIsRecording,
      onSpeakingStateChange: setIsAiSpeaking,
      onError: setError,
      onTranscriptUpdate: (update) => {
        transcriptManagerRef.current?.process(update);
      },
      onDebugInfo: setDebugInfo,
    });

    // Cleanup on unmount
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  const connect = useCallback(() => {
    setError(null);
    const workerUrl = (
      process.env.NEXT_PUBLIC_WORKER_URL ?? "ws://localhost:8787"
    ).replace(/^http/, "ws");

    // Encode context as query params for debug endpoint
    const params = new URLSearchParams({
      jobDescription,
      resume,
      persona,
    });
    const wsUrl = `${workerUrl}/debug/live-audio?${params.toString()}`;

    console.log(`Connecting to raw endpoint: ${wsUrl}`);
    void clientRef.current?.connect(wsUrl);
  }, [jobDescription, resume, persona]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  return (
    <main className="prose dark:prose-invert container mx-auto p-4">
      <h1>Raw Worker Connection Test</h1>
      <p>
        This page connects directly to the Cloudflare worker&apos;s debug
        endpoint, bypassing all application logic to test the raw audio
        pipeline.
      </p>

      {/* Dynamic prompt context inputs */}
      <div className="not-prose mb-6 space-y-4 rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Interview Context
        </h3>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Persona
          </label>
          <input
            type="text"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900 placeholder-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
            placeholder="e.g., Senior Technical Interviewer"
            disabled={isConnected}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900 placeholder-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
            rows={3}
            placeholder="Paste job description here..."
            disabled={isConnected}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Resume
          </label>
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900 placeholder-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
            rows={3}
            placeholder="Paste resume here..."
            disabled={isConnected}
          />
        </div>
      </div>

      {!isConnected ? (
        <button
          onClick={connect}
          className="rounded bg-blue-500 px-4 py-2 font-semibold text-white no-underline"
        >
          Start Raw Connection
        </button>
      ) : (
        <button
          onClick={disconnect}
          className="rounded bg-red-600 px-4 py-2 font-semibold text-white no-underline"
        >
          Stop Connection
        </button>
      )}

      <div className="mt-4">
        <h3>Status</h3>
        <p>
          Connection:{" "}
          {isConnected ? (
            <span className="text-green-500">Connected</span>
          ) : (
            "Disconnected"
          )}
        </p>
        <p>
          AI Speaking:{" "}
          {isAiSpeaking ? <span className="text-green-500">Yes</span> : "No"}
        </p>
        <p>
          Microphone:{" "}
          {isRecording ? (
            <span className="text-red-500">Recording</span>
          ) : (
            "Off"
          )}
        </p>
        {error && <p className="text-red-600">Error: {error}</p>}
      </div>

      <div className="mt-4">
        <h3>Debug Info</h3>
        <p>
          WebSocket Attempts: <strong>{debugInfo.connectAttempts}</strong>
        </p>
        <p>
          Active Connections:{" "}
          <strong
            className={
              debugInfo.activeConnections > 1
                ? "text-red-600"
                : "text-green-600"
            }
          >
            {debugInfo.activeConnections}
          </strong>
          {debugInfo.activeConnections > 1 && (
            <span className="ml-2 text-red-600">
              ⚠️ Multiple connections detected!
            </span>
          )}
        </p>
      </div>
    </main>
  );
}
