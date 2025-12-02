import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { AudioRecorder } from "~/lib/audio/AudioRecorder";
import { AudioPlayer } from "~/lib/audio/AudioPlayer";
import * as interview_pb from "~/lib/interview_pb";

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
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);

  // Get WebSocket token for Cloudflare Worker
  const { mutate: generateToken } = api.interview.generateWorkerToken.useMutation({
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

    // Construct WebSocket URL with interview ID and token as query parameters
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8787";
    const wsUrl = `${workerUrl}/${interviewId}?token=${encodeURIComponent(token)}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.binaryType = "arraybuffer"; // Set to receive binary data

    ws.onopen = () => {
      // Initialize audio services
      initializeAudioServices();
    };

    ws.onmessage = async (event) => {
      try {
        console.log("WebSocket message received:", {
          type: typeof event.data,
          isBuffer: event.data instanceof ArrayBuffer,
          data: event.data
        });
        
        // Handle binary Protobuf messages
        if (event.data instanceof ArrayBuffer) {
          const message = interview_pb.preppal.ServerToClientMessage.decode(new Uint8Array(event.data));

          if (message.transcript_update) {
            // Add transcript entry
            setTranscript((prev) => [
              ...prev,
              {
                text: message.transcript_update!.text,
                speaker: message.transcript_update!.speaker === "USER" ? "USER" : "AI",
                is_final: message.transcript_update!.is_final,
              },
            ]);
          } else if (message.audio_response) {
            // Play audio response
            if (audioPlayerRef.current) {
              audioPlayerRef.current.enqueue(message.audio_response!.audio_content.buffer);
            }
          } else if (message.session_ended) {
            // Session ended
            setState("ending");
            stopTimer();
            cleanupAudioServices();
            ws.close();
            onSessionEnded();
          } else if (message.error) {
            // Error from server
            setError(message.error!.message);
            setState("error");
            stopTimer();
            cleanupAudioServices();
          }
        }
      } catch (err) {
        console.error("Error processing WebSocket message:", err);
        setError("Failed to process message from server");
        setState("error");
      }
    };

    ws.onerror = () => {
      setError("Connection lost. Please return to the dashboard.");
      setState("error");
      stopTimer();
      cleanupAudioServices();
    };

    ws.onclose = () => {
      if (state === "live" || state === "connecting") {
        setError("Connection lost. Please return to the dashboard.");
        setState("error");
        stopTimer();
        cleanupAudioServices();
      }
    };
  };

  const initializeAudioServices = async () => {
    try {
      // Initialize audio player
      audioPlayerRef.current = new AudioPlayer();
      await audioPlayerRef.current.start();

      // Initialize audio recorder
      audioRecorderRef.current = new AudioRecorder();
      await audioRecorderRef.current.start((audioChunk: ArrayBuffer) => {
        // Send audio chunk to WebSocket when recorded
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            const audioChunkMessage = interview_pb.preppal.AudioChunk.create({
              audio_content: new Uint8Array(audioChunk),
            });

            const message = interview_pb.preppal.ClientToServerMessage.create({
              audio_chunk: audioChunkMessage,
            });

            const buffer = interview_pb.preppal.ClientToServerMessage.encode(message).finish();
            wsRef.current.send(buffer);
          } catch (err) {
            console.error("Error sending audio chunk:", err);
          }
        }
      });

      // Transition to live state and start timer
      setState("live");
      startTimer();
    } catch (err) {
      console.error("Failed to initialize audio services:", err);
      setError("Failed to initialize audio services");
      setState("error");
    }
  };

  const cleanupAudioServices = () => {
    // Stop audio recorder
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }

    // Stop audio player
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
      audioPlayerRef.current = null;
    }
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

      try {
        const endRequest = interview_pb.preppal.EndRequest.create();
        const message = interview_pb.preppal.ClientToServerMessage.create({
          end_request: endRequest,
        });

        const buffer = interview_pb.preppal.ClientToServerMessage.encode(message).finish();
        wsRef.current.send(buffer);
      } catch (err) {
        console.error("Error sending end request:", err);
      }
    }
  };

  // Initialize connection on mount
  useEffect(() => {
    generateToken({ interviewId });

    // Cleanup on unmount
    return () => {
      stopTimer();
      cleanupAudioServices();

      if (wsRef.current) {
        // If still live, send EndRequest
        if (state === "live" && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            const endRequest = interview_pb.preppal.EndRequest.create();
            const message = interview_pb.preppal.ClientToServerMessage.create({
              end_request: endRequest,
            });

            const buffer = interview_pb.preppal.ClientToServerMessage.encode(message).finish();
            wsRef.current.send(buffer);
          } catch (err) {
            console.error("Error sending end request on cleanup:", err);
          }
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