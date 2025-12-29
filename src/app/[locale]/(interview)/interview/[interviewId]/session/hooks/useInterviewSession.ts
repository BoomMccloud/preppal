import { useReducer, useEffect, useCallback, useRef } from "react";
import { useRouter } from "~/i18n/navigation";
import { useInterviewSocket } from "../useInterviewSocket";
import { sessionReducer } from "../reducer";
import { TIMER_CONFIG } from "../constants";
import type {
  SessionState,
  SessionEvent,
  ReducerContext,
  Command,
} from "../types";

interface UseInterviewSessionConfig {
  blockNumber?: number;
  context?: ReducerContext;
  onMediaStream?: (stream: MediaStream) => void;
}

const defaultContext: ReducerContext = {
  answerTimeLimit: 120,
  blockDuration: 600,
  totalBlocks: 1,
};

export function useInterviewSession(
  interviewId: string,
  token?: string,
  config?: UseInterviewSessionConfig,
) {
  const router = useRouter();
  const context = config?.context ?? defaultContext;

  // Capture commands from reducer
  const pendingCommandsRef = useRef<Command[]>([]);

  // Single reducer instance
  const [state, dispatch] = useReducer(
    (state: SessionState, event: SessionEvent) => {
      const result = sessionReducer(state, event, context);
      pendingCommandsRef.current = result.commands;
      return result.state;
    },
    {
      status: "WAITING_FOR_CONNECTION",
      connectionState: "initializing",
      transcript: [],
      pendingUser: "",
      pendingAI: "",
      elapsedTime: 0,
      error: null,
      isAiSpeaking: false,
    },
  );

  // Driver initialization
  const driver = useInterviewSocket(interviewId, token, config?.blockNumber, {
    onConnectionOpen: useCallback(() => {
      dispatch({ type: "CONNECTION_ESTABLISHED" });
    }, []),
    onConnectionClose: useCallback((code: number) => {
      dispatch({ type: "CONNECTION_CLOSED", code });
    }, []),
    onConnectionError: useCallback((error: string) => {
      dispatch({ type: "CONNECTION_ERROR", error });
    }, []),
    onTranscriptCommit: useCallback((entry) => {
      dispatch({ type: "TRANSCRIPT_COMMIT", entry });
    }, []),
    onTranscriptPending: useCallback((buffers) => {
      dispatch({ type: "TRANSCRIPT_PENDING", buffers });
    }, []),
    onAudioPlaybackChange: useCallback((isSpeaking: boolean) => {
      dispatch({ type: "AI_SPEAKING_CHANGED", isSpeaking });
    }, []),
    onMediaStream: config?.onMediaStream,
  });

  // Command executor
  const executeCommand = useCallback(
    (cmd: Command) => {
      switch (cmd.type) {
        case "START_CONNECTION":
          driver.connect();
          break;
        case "CLOSE_CONNECTION":
          driver.disconnect();
          break;
        case "MUTE_MIC":
          driver.mute();
          break;
        case "UNMUTE_MIC":
          driver.unmute();
          break;
        case "STOP_AUDIO":
          driver.stopAudio();
          break;
      }
    },
    [driver],
  );

  // Execute commands after state updates
  useEffect(() => {
    const commands = pendingCommandsRef.current;
    pendingCommandsRef.current = [];

    if (commands.length > 0) {
      console.log("[useInterviewSession] Executing commands:", commands);
      commands.forEach(executeCommand);
    }
  }, [state, executeCommand]);

  // Timer intervals
  useEffect(() => {
    const tickInterval = setInterval(() => {
      dispatch({ type: "TICK" });
    }, TIMER_CONFIG.TICK_INTERVAL_MS);

    const timerInterval = setInterval(() => {
      dispatch({ type: "TIMER_TICK" });
    }, 1000);

    return () => {
      clearInterval(tickInterval);
      clearInterval(timerInterval);
    };
  }, []);

  // Navigate to feedback when interview completes
  useEffect(() => {
    if (state.status === "INTERVIEW_COMPLETE") {
      const feedbackUrl = token
        ? `/interview/${interviewId}/feedback?token=${token}`
        : `/interview/${interviewId}/feedback`;
      router.push(feedbackUrl);
    }
  }, [state.status, interviewId, token, router]);

  // Auto-connect on mount
  useEffect(() => {
    driver.connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - driver.connect() is idempotent

  return { state, dispatch, driver };
}
