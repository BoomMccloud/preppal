import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { AudioRecorder } from "~/lib/audio/AudioRecorder";
import { AudioPlayer } from "~/lib/audio/AudioPlayer";
import { preppal } from "~/lib/interview_pb";

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

  // Use ref to track state for cleanup function without adding state as dependency
  const stateRef = useRef<SessionState>("initializing");
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speakingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);

  // Get WebSocket token for Cloudflare Worker
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

  const connectWebSocket = (token: string) => {
    setState("connecting");

    // Construct WebSocket URL with interview ID and token as query parameters
    const workerUrl =
      process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";
    const wsUrl = `${workerUrl}/${interviewId}?token=${encodeURIComponent(token)}`;

    console.log(`[WebSocket] Connecting to: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.binaryType = "arraybuffer"; // Set to receive binary data

    ws.onopen = () => {
      console.log(`[WebSocket] Connected successfully`);
      // Initialize audio services
      void initializeAudioServices();
    };

    ws.onmessage = async (event: MessageEvent) => {
      try {
        console.log("WebSocket message received:", {
          type: typeof event.data,
          isBuffer: event.data instanceof ArrayBuffer,
          data: event.data as unknown,
        });

        // Handle binary Protobuf messages
        if (event.data instanceof ArrayBuffer) {
          const message = preppal.ServerToClientMessage.decode(
            new Uint8Array(event.data),
          );

          console.log(`[WebSocket] Received message:`, message);

          if (message.transcriptUpdate) {
            // Add transcript entry
            setTranscript((prev) => [
              ...prev,
              {
                text: message.transcriptUpdate.text!,
                speaker:
                  message.transcriptUpdate.speaker === "USER" ? "USER" : "AI",
                is_final: message.transcriptUpdate.isFinal!,
              },
            ]);
          } else if (message.audioResponse) {
            // Play audio response
            if (audioPlayerRef.current) {
              const audioData = message.audioResponse.audioContent;
              // Create a copy of the buffer to ensure we handle views correctly
              audioPlayerRef.current.enqueue(audioData.slice().buffer);

              // Calculate duration to update speaking state
              // Assuming 24kHz sample rate (Gemini default) and 16-bit depth (2 bytes per sample)
              const sampleRate = 24000;
              const numSamples = audioData!.byteLength / 2;
              const durationMs = (numSamples / sampleRate) * 1000;

              setIsAiSpeaking(true);

              // Clear existing timer if any
              if (speakingTimerRef.current) {
                clearTimeout(speakingTimerRef.current);
              }

              // Set new timer to turn off speaking state
              speakingTimerRef.current = setTimeout(() => {
                setIsAiSpeaking(false);
                speakingTimerRef.current = null;
              }, durationMs);
            }
          } else if (message.sessionEnded) {
            // Session ended
            console.log(`[WebSocket] Session ended`);
            setState("ending");
            stopTimer();
            cleanupAudioServices();
            ws.close();
            onSessionEnded();
          } else if (message.error) {
            // Error from server
            console.log(`[WebSocket] Error from server:`, message.error);
            setError(message.error?.message ?? "Unknown error");
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

    ws.onerror = (event) => {
      console.error(`[WebSocket] Error:`, event);
      setError("Connection lost. Please return to the dashboard.");
      setState("error");
      stopTimer();
      cleanupAudioServices();
    };

    ws.onclose = (event) => {
      console.log(`[WebSocket] Closed:`, event);
      if (stateRef.current === "live" || stateRef.current === "connecting") {
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
      // Gemini defaults to 24kHz for audio output
      audioPlayerRef.current = new AudioPlayer(24000);
      await audioPlayerRef.current.start();

      // Initialize audio recorder
      audioRecorderRef.current = new AudioRecorder();
      await audioRecorderRef.current.start((audioChunk: ArrayBuffer) => {
        // Send audio chunk to WebSocket when recorded
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            const audioChunkMessage = preppal.AudioChunk.create({
              audioContent: new Uint8Array(audioChunk),
            });

            const message = preppal.ClientToServerMessage.create({
              audioChunk: audioChunkMessage,
            });

            const buffer =
              preppal.ClientToServerMessage.encode(message).finish();
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
      cleanupAudioServices();

      try {
        const endRequest = preppal.EndRequest.create();
        const message = preppal.ClientToServerMessage.create({
          endRequest: endRequest,
        });

        const buffer = preppal.ClientToServerMessage.encode(message).finish();
        wsRef.current.send(buffer);
      } catch (err) {
        console.error("Error sending end request:", err);
      }
    }
  };

  // Initialize connection on mount
  useEffect(() => {
    generateToken({ interviewId });

    // Periodically check interview status
    const statusCheckInterval = setInterval(() => {
      if (state === "connecting" || state === "live") {
        console.log(
          `[StatusCheck] Checking interview status for ${interviewId}`,
        );
        // Note: In a real implementation, you would call an API to check the status
        // For now, we're just logging that we're checking
      }
    }, 5000); // Check every 5 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(statusCheckInterval);
      stopTimer();
      cleanupAudioServices();

      if (wsRef.current) {
        // If still live, send EndRequest
        if (
          stateRef.current === "live" &&
          wsRef.current.readyState === WebSocket.OPEN
        ) {
          try {
            const endRequest = preppal.EndRequest.create();
            const message = preppal.ClientToServerMessage.create({
              endRequest: endRequest,
            });

            const buffer =
              preppal.ClientToServerMessage.encode(message).finish();
            wsRef.current.send(buffer);
          } catch (err) {
            console.error("Error sending end request on cleanup:", err);
          }
        }

        wsRef.current.close();
      }
    };
  }, [interviewId, generateToken]);

  // Handle browser close/navigate with sendBeacon
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (stateRef.current === "live" && wsRef.current) {
        cleanupAudioServices();
        // Use sendBeacon for reliable cleanup
        navigator.sendBeacon(`/api/cleanup?interview=${interviewId}`);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [interviewId]);

  return {
    state,
    transcript,
    elapsedTime,
    error,
    endInterview,
    isAiSpeaking,
  };
}
