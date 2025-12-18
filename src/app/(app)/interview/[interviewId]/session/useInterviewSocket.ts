import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { AudioRecorder } from "~/lib/audio/AudioRecorder";
import { AudioPlayer } from "~/lib/audio/AudioPlayer";
import { preppal } from "~/lib/interview_pb";
import { TranscriptManager } from "~/lib/audio/TranscriptManager";

type SessionState = "initializing" | "connecting" | "live" | "ending" | "error";

interface TranscriptEntry {
  text: string;
  speaker: "AI" | "USER";
  is_final: boolean;
}

interface UseInterviewSocketProps {
  interviewId: string;
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

  const transcript = [...committedTranscript, ...pendingTranscript];

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const hasInitiatedConnection = useRef(false);
  const [connectAttempts, setConnectAttempts] = useState(0);
  const [activeConnections, setActiveConnections] = useState(0);

  const transcriptManagerRef = useRef<TranscriptManager | null>(null);

  // Initialize TranscriptManager
  if (!transcriptManagerRef.current) {
    transcriptManagerRef.current = new TranscriptManager({
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
  }

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
    let audioRecorder: AudioRecorder | null = null;

    const setupAudio = async () => {
      if (state === "live") {
        console.log("State is LIVE, setting up audio...");

        try {
          // Setup AudioPlayer
          audioPlayerRef.current = new AudioPlayer(24000);
          audioPlayerRef.current.onPlaybackStateChange = (isPlaying) => {
            setIsAiSpeaking(isPlaying);
          };
          await audioPlayerRef.current.start();
          console.log("[AudioPlayer] Successfully started");

          // Setup AudioRecorder
          audioRecorder = new AudioRecorder();
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
          });
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
      if (audioRecorder) {
        console.log("Cleaning up audio recorder...");
        void audioRecorder.stop();
      }
      if (audioPlayerRef.current) {
        console.log("Cleaning up audio player...");
        audioPlayerRef.current.stop();
        audioPlayerRef.current = null;
      }
    };
  }, [state]);

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
        console.log(`[WebSocket] Session ended`);
        setState("ending");
        onSessionEnded();
      } else if (message.error) {
        console.log(`[WebSocket] Error from server:`, message.error);
        setError(message.error?.message ?? "Unknown error");
        setState("error");
      }
    };

    ws.onerror = (event) => {
      console.error(`[WebSocket] Error:`, event);
      setError("Connection error.");
      setState("error");
    };

    ws.onclose = (event) => {
      setActiveConnections((prev) => Math.max(0, prev - 1));
      console.log(
        `[WebSocket] Closed: (Active: ${activeConnections - 1})`,
        event,
      );
      if (["live", "connecting"].includes(stateRef.current)) {
        setError("Connection lost.");
        setState("error");
      }
    };
  };

  const endInterview = () => {
    if (wsRef.current && state === "live") {
      setState("ending");
      try {
        const message = preppal.ClientToServerMessage.create({
          endRequest: {},
        });
        const buffer = preppal.ClientToServerMessage.encode(message).finish();
        wsRef.current.send(buffer);
        wsRef.current.close(1000, "User ended interview");
      } catch (err) {
        console.error("Error sending end request:", err);
      }
    }
  };

  useEffect(() => {
    // Only initiate connection once per interviewId
    if (!hasInitiatedConnection.current) {
      hasInitiatedConnection.current = true;
      generateToken({ interviewId });
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
