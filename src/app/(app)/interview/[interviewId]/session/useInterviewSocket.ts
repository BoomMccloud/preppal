import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";

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
}

export function useInterviewSocket({
  interviewId,
  onSessionEnded,
}: UseInterviewSocketProps): UseInterviewSocketReturn {
  const [state, setState] = useState<SessionState>("initializing");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get WebSocket token
  const { mutate: generateToken } = api.interview.generateWsToken.useMutation({
    onSuccess: (data) => {
      connectWebSocket(data.token);
    },
    onError: (err) => {
      setError(err.message);
      setState("error");
    },
  });

  const connectWebSocket = (token: string) => {
    setState("connecting");

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send StartRequest
      const startRequest = {
        start_request: {
          auth_token: token,
          interview_id: interviewId,
          audio_config: {
            encoding: "LINEAR_PCM",
            sample_rate_hertz: 16000,
          },
        },
      };
      ws.send(JSON.stringify(startRequest));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.start_response) {
        // Transition to live state and start timer
        setState("live");
        startTimer();
      } else if (message.partial_transcript) {
        // Add transcript entry
        setTranscript((prev) => [...prev, message.partial_transcript]);
      } else if (message.session_ended) {
        // Session ended
        setState("ending");
        stopTimer();
        ws.close();
        onSessionEnded();
      } else if (message.error) {
        // Error from server
        setError(message.error.message);
        setState("error");
        stopTimer();
      }
    };

    ws.onerror = () => {
      setError("Connection lost. Please return to the dashboard.");
      setState("error");
      stopTimer();
    };

    ws.onclose = () => {
      if (state === "live" || state === "connecting") {
        setError("Connection lost. Please return to the dashboard.");
        setState("error");
        stopTimer();
      }
    };
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const endInterview = () => {
    if (wsRef.current && state === "live") {
      setState("ending");
      stopTimer();

      const endRequest = {
        end_request: {},
      };
      wsRef.current.send(JSON.stringify(endRequest));
    }
  };

  // Initialize connection on mount
  useEffect(() => {
    generateToken({ interviewId });

    // Cleanup on unmount
    return () => {
      stopTimer();

      if (wsRef.current) {
        // If still live, send EndRequest
        if (state === "live" && wsRef.current.readyState === WebSocket.OPEN) {
          const endRequest = {
            end_request: {},
          };
          wsRef.current.send(JSON.stringify(endRequest));
        }

        wsRef.current.close();
      }
    };
  }, [interviewId]);

  // Handle browser close/navigate with sendBeacon
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (state === "live" && wsRef.current) {
        // Use sendBeacon for reliable cleanup
        // In future, this will hit a cleanup endpoint
        navigator.sendBeacon(`/api/cleanup?interview=${interviewId}`);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [state, interviewId]);

  return {
    state,
    transcript,
    elapsedTime,
    error,
    endInterview,
  };
}
