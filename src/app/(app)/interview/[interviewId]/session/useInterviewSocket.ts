import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { AudioRecorder } from "~/lib/audio/AudioRecorder";
import { AudioPlayer } from "~/lib/audio/AudioPlayer";
import { preppal } from "~/lib/interview_pb";

type SessionState =
  | "initializing"
  | "connecting"
  | "live"
  | "ending"
  | "error";

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
}

export function useInterviewSocket({
  interviewId,
  onSessionEnded,
}: UseInterviewSocketProps): UseInterviewSocketReturn {
  const [state, setState] = useState<SessionState>("initializing");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);

  // Effect to handle user interruption (barge-in)
  useEffect(() => {
    const lastEntry = transcript[transcript.length - 1];
    if (lastEntry?.speaker === "USER" && isAiSpeaking) {
      if (audioPlayerRef.current) {
        console.log("[Barge-in] User started speaking, clearing AI audio queue.");
        audioPlayerRef.current.clear();
        setIsAiSpeaking(false);
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
    timerRef.current = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
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
        audioPlayerRef.current = new AudioPlayer(24000);
        await audioPlayerRef.current.start();

        audioRecorder = new AudioRecorder();
        await audioRecorder.start((audioChunk) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            try {
              const message = preppal.ClientToServerMessage.create({
                audioChunk: { audioContent: new Uint8Array(audioChunk) },
              });
              const buffer = preppal.ClientToServerMessage.encode(message).finish();
              wsRef.current.send(buffer);
            } catch (err) {
              console.error("Error sending audio chunk:", err);
            }
          }
        });
        startTimer();
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
    setState("connecting");
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";
    const wsUrl = `${workerUrl}/${interviewId}?token=${encodeURIComponent(token)}`;
    console.log(`[WebSocket] Connecting to: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      console.log(`[WebSocket] Connected successfully`);
      setState("live");
    };

    ws.onmessage = async (event: MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) return;

      const message = preppal.ServerToClientMessage.decode(new Uint8Array(event.data));
      console.log(`[WebSocket] Received message:`, message);

      if (message.transcriptUpdate) {
        setTranscript((prev) => [...prev, {
          text: message.transcriptUpdate.text!,
          speaker: message.transcriptUpdate.speaker === "USER" ? "USER" : "AI",
          is_final: message.transcriptUpdate.isFinal!,
        }]);
      } else if (message.audioResponse) {
        if (!isAiSpeaking) {
          setIsAiSpeaking(true);
        }
        if (audioPlayerRef.current) {
          const audioData = message.audioResponse.audioContent;
          void audioPlayerRef.current.enqueue(audioData.slice().buffer);
        }
      } else if (message.turnComplete) {
        console.log("[WebSocket] Turn complete.");
        setIsAiSpeaking(false);
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
      console.log(`[WebSocket] Closed:`, event);
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
        const message = preppal.ClientToServerMessage.create({ endRequest: {} });
        const buffer = preppal.ClientToServerMessage.encode(message).finish();
        wsRef.current.send(buffer);
        wsRef.current.close(1000, "User ended interview");
      } catch (err) {
        console.error("Error sending end request:", err);
      }
    }
  };

  useEffect(() => {
    generateToken({ interviewId });

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [interviewId, generateToken]);

  return { state, transcript, elapsedTime, error, endInterview, isAiSpeaking };
}
