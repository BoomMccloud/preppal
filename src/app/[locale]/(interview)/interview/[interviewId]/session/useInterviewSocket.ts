// Stateless "Dumb Driver" for interview WebSocket and audio (v5)
// This hook manages hardware (WebSocket, AudioSession) and fires events upward
// All business logic lives in the reducer - this is just I/O plumbing

import { useCallback, useEffect, useRef, useMemo } from "react";
import { api } from "~/trpc/react";
import { AudioSession } from "~/lib/audio/AudioSession";
import { TranscriptManager } from "~/lib/audio/TranscriptManager";
import {
  WS_CLOSE_BLOCK_RECONNECT,
  WS_CLOSE_USER_INITIATED,
  WS_CLOSE_TIMEOUT,
  WS_CLOSE_GEMINI_ENDED,
  WS_CLOSE_ERROR,
} from "~/lib/constants/interview";
import {
  encodeAudioChunk,
  encodeEndRequest,
  decodeServerMessage,
} from "~/lib/interview/protocol";
import { handleServerMessage } from "~/lib/interview/handleServerMessage";
import type { DriverEvents } from "./types";

// Map protobuf SessionEndReason to WebSocket close codes
// Protobuf: 0=UNSPECIFIED, 1=USER_INITIATED, 2=GEMINI_ENDED, 3=TIMEOUT
// WebSocket: 4001=USER_INITIATED, 4002=TIMEOUT, 4003=GEMINI_ENDED, 4004=ERROR
function reasonToCloseCode(reason: number): number {
  switch (reason) {
    case 1:
      return WS_CLOSE_USER_INITIATED;
    case 2:
      return WS_CLOSE_GEMINI_ENDED;
    case 3:
      return WS_CLOSE_TIMEOUT;
    default:
      return WS_CLOSE_ERROR; // UNSPECIFIED or unknown
  }
}

export function useInterviewSocket(
  interviewId: string,
  guestToken: string | undefined,
  blockNumber: number | undefined,
  events: DriverEvents,
): {
  connectForBlock: (block: number) => void;
  disconnect: () => void;
  mute: () => void;
  unmute: () => void;
  stopAudio: () => void;
  isAudioMuted: () => boolean;
  debugInfo?: { connectAttempts: number; activeConnections: number };
} {
  const wsRef = useRef<WebSocket | null>(null);
  const audioSessionRef = useRef<AudioSession | null>(null);
  const connectAttemptsRef = useRef(0);
  const activeConnectionsRef = useRef(0);
  const currentBlockRef = useRef(blockNumber);

  const transcriptManagerRef = useRef<TranscriptManager | null>(null);

  // Initialize TranscriptManager
  transcriptManagerRef.current ??= new TranscriptManager({
    onSentence: (speaker, text) => {
      events.onTranscriptCommit({
        text,
        speaker: speaker === "USER" ? "USER" : "AI",
        is_final: true,
      });
    },
  });

  // Internal: Setup audio and start recording
  const setupAudio = useCallback(async () => {
    console.log("Setting up audio...");

    try {
      let chunkCount = 0;
      const audioSession = new AudioSession();
      audioSessionRef.current = audioSession;

      audioSession.onPlaybackStateChange = (isPlaying) => {
        events.onAudioPlaybackChange(isPlaying);
      };

      await audioSession.start((audioChunk) => {
        chunkCount++;
        if (chunkCount <= 3) {
          console.log(
            `[AudioRecorder] Received audio chunk #${chunkCount}, size: ${audioChunk.byteLength} bytes`,
          );
        }

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(encodeAudioChunk(audioChunk));
            if (chunkCount <= 3) {
              console.log(
                `[AudioRecorder] Sent audio chunk #${chunkCount} via WebSocket`,
              );
            }
          } catch (err) {
            console.error("Error sending audio chunk:", err);
          }
        }
      });

      // Expose MediaStream if requested
      const stream = audioSession.getRecorder()?.getStream();
      if (stream && events.onMediaStream) {
        events.onMediaStream(stream);
      }
    } catch (err) {
      console.error("[setupAudio] Failed to initialize audio:", err);
      events.onConnectionError(
        err instanceof Error
          ? `Audio initialization failed: ${err.message}`
          : "Failed to initialize audio",
      );
    }
  }, [events]);

  // Internal: Connect WebSocket
  const connectWebSocket = useCallback(
    (token: string) => {
      // Close any existing connection before creating a new one
      if (wsRef.current) {
        console.log(
          "[WebSocket] Closing existing connection before reconnecting",
        );
        wsRef.current.close();
        wsRef.current = null;
      }

      connectAttemptsRef.current += 1;
      const workerUrl = (
        process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787"
      ).replace(/^http/, "ws");
      const wsUrl = currentBlockRef.current
        ? `${workerUrl}/${interviewId}?token=${encodeURIComponent(token)}&block=${currentBlockRef.current}`
        : `${workerUrl}/${interviewId}?token=${encodeURIComponent(token)}`;
      console.log(
        `[WebSocket] Connecting to: ${wsUrl} (Attempt #${connectAttemptsRef.current})`,
      );

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        // Stale socket guard: ignore events from old sockets
        if (wsRef.current !== ws) {
          console.log(`[WebSocket] Ignoring onopen from stale socket`);
          return;
        }
        activeConnectionsRef.current += 1;
        console.log(
          `[WebSocket] Connected successfully (Active: ${activeConnectionsRef.current})`,
        );
        events.onConnectionOpen();

        // Setup audio after connection opens (only if we don't already have one)
        if (!audioSessionRef.current) {
          void setupAudio();
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        // Stale socket guard: ignore events from old sockets
        if (wsRef.current !== ws) {
          console.log(`[WebSocket] Ignoring message from stale socket`);
          return;
        }
        if (!(event.data instanceof ArrayBuffer)) return;

        const message = decodeServerMessage(event.data);

        handleServerMessage(message, {
          onTranscript: (update) => {
            const tm = transcriptManagerRef.current;
            if (tm) {
              tm.process(update);

              // Fire pending event
              events.onTranscriptPending({
                user: tm.getBufferedText("USER"),
                ai: tm.getBufferedText("AI"),
              });
            }
          },
          onAudio: (audioData) => {
            audioSessionRef.current?.enqueueAudio(audioData);
          },
          onSessionEnded: (reason) => {
            const reasonMap: Record<number, string> = {
              0: "UNSPECIFIED",
              1: "USER_INITIATED",
              2: "GEMINI_ENDED",
              3: "TIMEOUT",
            };
            const reasonName = reasonMap[reason] ?? `UNKNOWN(${reason})`;
            console.log(`[WebSocket] Session ended with reason: ${reasonName}`);
            events.onConnectionClose(reasonToCloseCode(reason));
          },
          onError: (errorMessage) => {
            console.log(`[WebSocket] Error from server: ${errorMessage}`);
            events.onConnectionError(errorMessage);
          },
        });
      };

      ws.onerror = (event) => {
        // Stale socket guard: ignore events from old sockets
        if (wsRef.current !== ws) {
          console.log(`[WebSocket] Ignoring error from stale socket`);
          return;
        }
        console.error(`[WebSocket] Error:`, event);
        events.onConnectionError("Connection error.");
      };

      ws.onclose = (event) => {
        // Stale socket guard: ignore events from old sockets
        if (wsRef.current !== ws) {
          console.log(
            `[WebSocket] Ignoring close from stale socket (code: ${event.code})`,
          );
          return;
        }
        activeConnectionsRef.current = Math.max(
          0,
          activeConnectionsRef.current - 1,
        );
        console.log(
          `[WebSocket] Closed with code ${event.code}: ${event.reason} (Active: ${activeConnectionsRef.current})`,
        );

        // Dumb pipe: always emit the raw close code, let reducer decide what it means
        events.onConnectionClose(event.code);
      };
    },
    [interviewId, events, setupAudio],
  );

  // Generate token mutation (callbacks handled per-call in connectForBlock for stale detection)
  const { mutate: generateToken } =
    api.interview.generateWorkerToken.useMutation();

  // Public: Disconnect from interview
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.send(encodeEndRequest());
        wsRef.current.close();
      } catch (err) {
        console.error("Error during disconnect:", err);
      }
    }
    audioSessionRef.current?.stop();
    audioSessionRef.current = null;
  }, []);

  // Public: Mute microphone
  const mute = useCallback(() => {
    audioSessionRef.current?.muteInput();
  }, []);

  // Public: Unmute microphone
  const unmute = useCallback(() => {
    audioSessionRef.current?.unmuteInput();
  }, []);

  // Public: Check if muted
  const isAudioMuted = useCallback(() => {
    return audioSessionRef.current?.isInputMuted() ?? false;
  }, []);

  // Public: Stop audio session
  const stopAudio = useCallback(() => {
    console.log("[useInterviewSocket] stopAudio() called");
    audioSessionRef.current?.stop();
    audioSessionRef.current = null;
    console.log("[useInterviewSocket] stopAudio() completed");
  }, []);

  // Public: Connect for a specific block (unified method, no guards)
  const connectForBlock = useCallback(
    (block: number) => {
      console.log(`[useInterviewSocket] connectForBlock(${block}) called`);

      // Close existing connection (stale socket guard handles late events)
      if (wsRef.current) {
        console.log(`[useInterviewSocket] Closing existing socket with code 4005`);
        wsRef.current.close(WS_CLOSE_BLOCK_RECONNECT, "Block transition");
        wsRef.current = null;
      }

      // Set block for URL building (data, not guard)
      currentBlockRef.current = block;

      // Capture target block in closure to detect staleness
      const targetBlock = block;

      // HOT MIC: Keep audio session alive during block transitions
      // Audio chunks will be silently dropped until new socket opens
      // (see the wsRef.current?.readyState check in onAudioData callback)

      // Connect with per-call callbacks (enables stale token detection)
      generateToken(
        { interviewId, token: guestToken },
        {
          onSuccess: (data) => {
            // STALE CHECK: If we moved to a new block while waiting, ABORT.
            if (currentBlockRef.current !== targetBlock) {
              console.log(
                `[Socket] Ignoring stale token for block ${targetBlock} (current: ${currentBlockRef.current})`,
              );
              return;
            }
            connectWebSocket(data.token);
          },
          onError: (err) => {
            events.onConnectionError(err.message);
          },
        },
      );
    },
    [interviewId, guestToken, generateToken, connectWebSocket, events],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      audioSessionRef.current?.stop();
      audioSessionRef.current = null;
    };
  }, []);

  // Memoize the return object to prevent unnecessary re-renders in consuming components
  return useMemo(
    () => ({
      connectForBlock,
      disconnect,
      mute,
      unmute,
      stopAudio,
      isAudioMuted,
      debugInfo: {
        connectAttempts: connectAttemptsRef.current,
        activeConnections: activeConnectionsRef.current,
      },
    }),
    [connectForBlock, disconnect, mute, unmute, stopAudio, isAudioMuted],
  );
}
