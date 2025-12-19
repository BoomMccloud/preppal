import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { AudioRecorder } from "~/lib/audio/AudioRecorder";
import { AudioPlayer } from "~/lib/audio/AudioPlayer";
import { preppal } from "~/lib/interview_pb";
import { TranscriptManager } from "~/lib/audio/TranscriptManager";
import {
  INTERVIEW_DURATION_MS,
  SAFETY_TIMEOUT_GRACE_MS,
  WS_CLOSE_USER_INITIATED,
  WS_CLOSE_TIMEOUT,
  WS_CLOSE_GEMINI_ENDED,
  WS_CLOSE_ERROR,
  type InterviewDuration,
} from "~/lib/constants/interview";

type SessionState = "initializing" | "connecting" | "live" | "ending" | "error";

interface TranscriptEntry {
  text: string;
  speaker: "AI" | "USER";
  is_final: boolean;
}

interface UseInterviewSocketProps {
  interviewId: string;
  guestToken?: string;
  duration: InterviewDuration;
  onSessionEnded: () => void;
}

interface UseInterviewSocketReturn {
  state: SessionState;
  transcript: TranscriptEntry[];
  elapsedTime: number;
  error: string | null;
  endInterview: () => void;
  isAiSpeaking: boolean;
  debugInfo: {
    connectAttempts: number;
    activeConnections: number;
  };
}

export function useInterviewSocket({
  interviewId,
  guestToken,
  duration,
  onSessionEnded,
}: UseInterviewSocketProps): UseInterviewSocketReturn {
  const [state, setState] = useState<SessionState>("initializing");
  const [committedTranscript, setCommittedTranscript] = useState<
    TranscriptEntry[]
  >([]);
  const [pendingTranscript, setPendingTranscript] = useState<TranscriptEntry[]>(
    [],
  );
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const transcript = useMemo(
    () => [...committedTranscript, ...pendingTranscript],
    [committedTranscript, pendingTranscript],
  );

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasInitiatedConnection = useRef(false);
  const [connectAttempts, setConnectAttempts] = useState(0);
  const [activeConnections, setActiveConnections] = useState(0);

  const transcriptManagerRef = useRef<TranscriptManager | null>(null);

  // Initialize TranscriptManager
  transcriptManagerRef.current ??= new TranscriptManager({
    onSentence: (speaker, text) => {
      setCommittedTranscript((prev) => [
        ...prev,
        {
          text,
          speaker: speaker === "USER" ? "USER" : "AI",
          is_final: true,
        },
      ]);
    },
  });

  // Effect to handle user interruption (barge-in)
  useEffect(() => {
    const lastEntry = transcript[transcript.length - 1];
    if (lastEntry?.speaker === "USER" && isAiSpeaking) {
      if (audioPlayerRef.current) {
        console.log(
          "[Barge-in] User started speaking, clearing AI audio queue.",
        );
        audioPlayerRef.current.clear(); // This will trigger onPlaybackStateChange(false)
      }
    }
  }, [transcript, isAiSpeaking]);

  const { mutate: generateToken } =
    api.interview.generateWorkerToken.useMutation({
      onSuccess: (data) => {
        connectWebSocket(data.token);
      },
      onError: (err) => {
        setError(err.message);
        setState("error");
      },
    });

  const startTimer = () => {
    timerRef.current = setInterval(
      () => setElapsedTime((prev) => prev + 1),
      1000,
    );
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // State machine for managing audio resources
  useEffect(() => {
    const setupAudio = async () => {
      if (state === "live") {
        console.log("State is LIVE, setting up audio...");

        // Create AbortController for this session
        abortControllerRef.current = new AbortController();

        // Combine user abort signal with safety timeout
        // Safety timeout is longer than worker's timeout (authoritative source)
        const durationMs = INTERVIEW_DURATION_MS[duration];
        const signal = AbortSignal.any([
          abortControllerRef.current.signal,
          AbortSignal.timeout(durationMs + SAFETY_TIMEOUT_GRACE_MS),
        ]);

        try {
          // Setup AudioPlayer
          audioPlayerRef.current = new AudioPlayer(24000);
          audioPlayerRef.current.onPlaybackStateChange = (isPlaying) => {
            setIsAiSpeaking(isPlaying);
          };
          await audioPlayerRef.current.start();
          console.log("[AudioPlayer] Successfully started");

          // Setup AudioRecorder with AbortSignal
          const audioRecorder = new AudioRecorder();
          console.log("[AudioRecorder] Starting recorder...");
          let chunkCount = 0;
          await audioRecorder.start((audioChunk) => {
            chunkCount++;
            if (chunkCount <= 3) {
              console.log(
                `[AudioRecorder] Received audio chunk #${chunkCount}, size: ${audioChunk.byteLength} bytes`,
              );
            }

            if (wsRef.current?.readyState === WebSocket.OPEN) {
              try {
                const message = preppal.ClientToServerMessage.create({
                  audioChunk: { audioContent: new Uint8Array(audioChunk) },
                });
                const buffer =
                  preppal.ClientToServerMessage.encode(message).finish();
                wsRef.current.send(buffer);
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
          }, signal);
          console.log(
            "[AudioRecorder] Successfully started and capturing audio",
          );

          startTimer();
        } catch (err) {
          console.error("[setupAudio] Failed to initialize audio:", err);
          setError(
            err instanceof Error
              ? `Audio initialization failed: ${err.message}`
              : "Failed to initialize audio",
          );
          setState("error");
        }
      }
    };

    void setupAudio();

    return () => {
      stopTimer();
      // Abort the audio recorder via signal - this handles all cleanup
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      if (audioPlayerRef.current) {
        console.log("Cleaning up audio player...");
        audioPlayerRef.current.stop();
        audioPlayerRef.current = null;
      }
    };
  }, [state, duration]);

  const connectWebSocket = (token: string) => {
    // Close any existing connection before creating a new one
    if (wsRef.current) {
      console.log(
        "[WebSocket] Closing existing connection before reconnecting",
      );
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectAttempts((prev) => prev + 1);
    setState("connecting");
    const workerUrl = (
      process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787"
    ).replace(/^http/, "ws");
    const wsUrl = `${workerUrl}/${interviewId}?token=${encodeURIComponent(token)}`;
    console.log(
      `[WebSocket] Connecting to: ${wsUrl} (Attempt #${connectAttempts + 1})`,
    );

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      setActiveConnections((prev) => prev + 1);
      console.log(
        `[WebSocket] Connected successfully (Active: ${activeConnections + 1})`,
      );
      setState("live");
    };

    ws.onmessage = async (event: MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) return;

      const message = preppal.ServerToClientMessage.decode(
        new Uint8Array(event.data),
      );

      if (message.transcriptUpdate) {
        const tm = transcriptManagerRef.current;
        if (tm) {
          tm.process(message.transcriptUpdate);

          const pending: TranscriptEntry[] = [];
          // Check buffers for both speakers
          const userBuffer = tm.getBufferedText("USER");
          if (userBuffer) {
            pending.push({
              text: userBuffer,
              speaker: "USER",
              is_final: false,
            });
          }

          const aiBuffer = tm.getBufferedText("AI");
          if (aiBuffer) {
            pending.push({ text: aiBuffer, speaker: "AI", is_final: false });
          }

          setPendingTranscript(pending);
        }
      } else if (message.audioResponse) {
        if (audioPlayerRef.current) {
          const audioData = message.audioResponse.audioContent;
          if (audioData && audioData.length > 0) {
            void audioPlayerRef.current.enqueue(audioData);
          }
        }
      } else if (message.sessionEnded) {
        const reasonMap: Record<number, string> = {
          0: "UNSPECIFIED",
          1: "USER_INITIATED",
          2: "GEMINI_ENDED",
          3: "TIMEOUT",
        };
        const reasonCode = message.sessionEnded.reason ?? 0;
        const reasonName = reasonMap[reasonCode] ?? `UNKNOWN(${reasonCode})`;
        console.log(`[WebSocket] Session ended with reason: ${reasonName}`);
        // Worker signaled session end - trigger abort to clean up AudioRecorder
        abortControllerRef.current?.abort();
        setState("ending");
        onSessionEnded();
      } else if (message.error) {
        console.log(`[WebSocket] Error from server:`, message.error);
        // Worker signaled an error - also trigger abort
        abortControllerRef.current?.abort();
        setError(message.error?.message ?? "Unknown error");
        setState("error");
      }
    };

    ws.onerror = (event) => {
      console.error(`[WebSocket] Error:`, event);
      // WebSocket error - ensure cleanup
      abortControllerRef.current?.abort();
      setError("Connection error.");
      setState("error");
    };

    ws.onclose = (event) => {
      setActiveConnections((prev) => Math.max(0, prev - 1));
      console.log(
        `[WebSocket] Closed with code ${event.code}: ${event.reason} (Active: ${activeConnections - 1})`,
      );
      // WebSocket closed - ensure cleanup
      abortControllerRef.current?.abort();

      // Handle close based on code - close codes are the authoritative signal
      switch (event.code) {
        case WS_CLOSE_USER_INITIATED:
        case WS_CLOSE_TIMEOUT:
        case WS_CLOSE_GEMINI_ENDED:
          // Graceful session end - navigate to feedback
          setState("ending");
          onSessionEnded();
          break;
        case WS_CLOSE_ERROR:
          // Worker signaled an error
          setError("Session error");
          setState("error");
          break;
        default:
          // Unexpected close (1006 abnormal, etc.) - only show error if we were active
          if (["live", "connecting"].includes(stateRef.current)) {
            setError("Connection lost");
            setState("error");
          }
      }
    };
  };

  const endInterview = () => {
    if (wsRef.current && state === "live") {
      // User initiated end - trigger abort to clean up audio
      abortControllerRef.current?.abort();
      setState("ending");
      try {
        const message = preppal.ClientToServerMessage.create({
          endRequest: {},
        });
        const buffer = preppal.ClientToServerMessage.encode(message).finish();
        wsRef.current.send(buffer);
        // Don't close from client - let worker close with appropriate code
        // This ensures onclose receives the correct WS_CLOSE_USER_INITIATED code
      } catch (err) {
        console.error("Error sending end request:", err);
      }
    }
  };

  useEffect(() => {
    // Only initiate connection once per interviewId
    if (!hasInitiatedConnection.current) {
      hasInitiatedConnection.current = true;
      generateToken({ interviewId, token: guestToken });
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      // DO NOT reset hasInitiatedConnection.current here!
      // This would allow React Strict Mode to trigger a second connection
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  return {
    state,
    transcript,
    elapsedTime,
    error,
    endInterview,
    isAiSpeaking,
    debugInfo: {
      connectAttempts,
      activeConnections,
    },
  };
}
