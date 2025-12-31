// Stateless "Dumb Driver" for interview WebSocket and audio (v5)
// This hook manages hardware (WebSocket, AudioSession) and fires events upward
// All business logic lives in the reducer - this is just I/O plumbing

import { useCallback, useEffect, useRef, useMemo } from "react";
import { api } from "~/trpc/react";
import { AudioSession } from "~/lib/audio/AudioSession";
import { TranscriptManager } from "~/lib/audio/TranscriptManager";
import { WS_CLOSE_BLOCK_RECONNECT } from "~/lib/constants/interview";
import {
  encodeAudioChunk,
  encodeEndRequest,
  decodeServerMessage,
} from "~/lib/interview/protocol";
import { handleServerMessage } from "~/lib/interview/handleServerMessage";
import type { DriverEvents } from "./types";

export function useInterviewSocket(
  interviewId: string,
  guestToken: string | undefined,
  blockNumber: number | undefined,
  events: DriverEvents,
): {
  connect: () => void;
  disconnect: () => void;
  mute: () => void;
  unmute: () => void;
  stopAudio: () => void;
  isAudioMuted: () => boolean;
  reconnectForBlock: (blockNumber: number) => void;
  debugInfo?: { connectAttempts: number; activeConnections: number };
} {
  const wsRef = useRef<WebSocket | null>(null);
  const audioSessionRef = useRef<AudioSession | null>(null);
  const hasInitiatedConnection = useRef(false);
  const connectAttemptsRef = useRef(0);
  const activeConnectionsRef = useRef(0);
  const currentBlockRef = useRef(blockNumber);

  // Keep currentBlockRef in sync with prop for reconnection
  useEffect(() => {
    currentBlockRef.current = blockNumber;
  }, [blockNumber]);

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
        } else {
          console.warn(
            `[AudioRecorder] WebSocket not open (state: ${wsRef.current?.readyState}), cannot send audio chunk`,
          );
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
            events.onConnectionClose(reason);
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

  // Generate token mutation
  const { mutate: generateToken } =
    api.interview.generateWorkerToken.useMutation({
      onSuccess: (data) => {
        connectWebSocket(data.token);
      },
      onError: (err) => {
        events.onConnectionError(err.message);
      },
    });

  // Public: Connect to interview
  const connect = useCallback(() => {
    if (!hasInitiatedConnection.current) {
      hasInitiatedConnection.current = true;
      generateToken({ interviewId, token: guestToken });
    }
  }, [interviewId, guestToken, generateToken]);

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

  // Public: Reconnect for a new block
  const reconnectForBlock = useCallback(
    (newBlockNumber: number) => {
      console.log(
        `[useInterviewSocket] reconnectForBlock(${newBlockNumber}) called`,
      );

      // Update block ref for the new connection URL
      currentBlockRef.current = newBlockNumber;

      // Close existing WebSocket connection with 4005 (block transition)
      // The stale socket guard will filter any late events from this socket
      if (wsRef.current) {
        wsRef.current.close(WS_CLOSE_BLOCK_RECONNECT, "Block transition");
        wsRef.current = null;
      }

      // HOT MIC: Keep audio session alive during block transitions
      // Audio chunks will be silently dropped until new socket opens
      // (see the wsRef.current?.readyState check in onAudioData callback)
      // DO NOT call audioSessionRef.current?.stop() here!

      // Reset connection guard so generateToken triggers a new connection
      hasInitiatedConnection.current = false;

      // Trigger new connection with updated block number
      generateToken({ interviewId, token: guestToken });
    },
    [interviewId, guestToken, generateToken],
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
      connect,
      disconnect,
      mute,
      unmute,
      stopAudio,
      isAudioMuted,
      reconnectForBlock,
      debugInfo: {
        connectAttempts: connectAttemptsRef.current,
        activeConnections: activeConnectionsRef.current,
      },
    }),
    [
      connect,
      disconnect,
      mute,
      unmute,
      stopAudio,
      isAudioMuted,
      reconnectForBlock,
    ],
  );
}
