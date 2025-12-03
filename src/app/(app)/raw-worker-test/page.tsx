"use client";

import React, { useState, useEffect, useRef } from "react";
import { AudioRecorder } from "~/lib/audio/AudioRecorder";
import { AudioPlayer } from "~/lib/audio/AudioPlayer";
import { preppal } from "~/lib/interview_pb.js";

// A simplified hook for managing the raw WebSocket connection
const useRawSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);

  const connect = async () => {
    const workerUrl = (
      process.env.NEXT_PUBLIC_WORKER_URL ?? "ws://localhost:8787"
    ).replace(/^http/, "ws");
    const wsUrl = `${workerUrl}/debug/live-audio`;

    console.log(`Connecting to raw endpoint: ${wsUrl}`);

    // 1. Initialize Audio Services first
    try {
      audioPlayerRef.current = new AudioPlayer(24000);
      await audioPlayerRef.current.start();
      await audioPlayerRef.current.resume(); // Resume after user gesture
      audioRecorderRef.current = new AudioRecorder();
      await audioRecorderRef.current.start((audioChunk) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {

          // 1. Create the top-level message
          const clientMessage = new preppal.ClientToServerMessage();

          // 2. Create the audio chunk payload
          const audioChunkPayload = new preppal.AudioChunk();
          audioChunkPayload.audioContent = audioChunk;

          // 3. Set the payload on the top-level message
          clientMessage.audioChunk = audioChunkPayload;

          // 4. Serialize the message to a Uint8Array
          const serializedMessage =
            preppal.ClientToServerMessage.encode(clientMessage).finish();

          wsRef.current.send(serializedMessage);
        }
      });
    } catch (err) {
      setError("Failed to initialize audio devices.");
      console.error(err);
      return;
    }

    // 2. Connect WebSocket
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Raw WebSocket connected.");
      setIsConnected(true);
    };

    ws.onmessage = async (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        const message = preppal.ServerToClientMessage.decode(
          new Uint8Array(event.data),
        );

        if (message.audioResponse) {
          const audioResponse = message.audioResponse;
          const audioContent = audioResponse?.audioContent;
          if (audioContent) {
            setIsAiSpeaking(true); // Simplified for the test
            void audioPlayerRef.current?.enqueue(audioContent);
          }
        } else if (message.transcriptUpdate) {
          const transcript = message.transcriptUpdate;
          console.log(
            `Received transcript: [${transcript?.speaker}] ${transcript?.text}`,
          );
        }
      } else {
        // In this raw test, we can just log text messages (like transcripts)
        console.log("Received text message:", event.data);
      }
    };

    ws.onerror = (err) => {
      console.error("Raw WebSocket error:", err);
      setError("WebSocket connection error.");
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log("Raw WebSocket disconnected.");
      setIsConnected(false);
      // Clean up audio
      if (audioPlayerRef.current) {
        audioPlayerRef.current.stop();
        audioPlayerRef.current = null;
      }
      if (audioRecorderRef.current) {
        void audioRecorderRef.current.stop();
        audioRecorderRef.current = null;
      }
    };
  };

  const disconnect = () => {
    wsRef.current?.close(1000, "User disconnected");
  };

  return { isConnected, error, isAiSpeaking, connect, disconnect };
};

export default function RawWorkerTestPage() {
  const { isConnected, error, isAiSpeaking, connect, disconnect } = useRawSocket();

  return (
    <main className="container mx-auto p-4 prose dark:prose-invert">
      <h1>Raw Worker Connection Test</h1>
      <p>
        This page connects directly to the Cloudflare worker's debug endpoint,
        bypassing all application logic to test the raw audio pipeline.
      </p>
      {!isConnected ? (
        <button onClick={() => void connect()} className="no-underline rounded bg-blue-500 px-4 py-2 font-semibold text-white">
          Start Raw Connection
        </button>
      ) : (
        <button onClick={disconnect} className="no-underline rounded bg-red-600 px-4 py-2 font-semibold text-white">
          Stop Connection
        </button>
      )}

      <div className="mt-4">
        <h3>Status</h3>
        <p>Connection: {isConnected ? <span className="text-green-500">Connected</span> : "Disconnected"}</p>
        <p>AI Speaking: {isAiSpeaking ? <span className="text-green-500">Yes</span> : "No"}</p>
        {error && <p className="text-red-600">Error: {error}</p>}
      </div>
    </main>
  );
}
