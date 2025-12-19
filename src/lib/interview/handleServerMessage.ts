/**
 * Handler for processing decoded server messages.
 * Provides a clean callback-based interface for message routing.
 */

import type {
  ServerToClientMessage,
  TranscriptUpdate,
} from "~/lib/proto/interview_pb";

export interface MessageHandlers {
  onTranscript: (update: TranscriptUpdate) => void;
  onAudio: (data: Uint8Array) => void;
  onSessionEnded: (reason: number) => void;
  onError: (message: string) => void;
}

/**
 * Routes a decoded server message to the appropriate handler.
 */
export function handleServerMessage(
  message: ServerToClientMessage,
  handlers: MessageHandlers,
): void {
  const { payload } = message;

  switch (payload.case) {
    case "transcriptUpdate":
      handlers.onTranscript(payload.value);
      break;
    case "audioResponse":
      if (payload.value.audioContent?.length) {
        handlers.onAudio(payload.value.audioContent);
      }
      break;
    case "sessionEnded":
      handlers.onSessionEnded(payload.value.reason ?? 0);
      break;
    case "error":
      handlers.onError(payload.value.message ?? "Unknown error");
      break;
  }
}
