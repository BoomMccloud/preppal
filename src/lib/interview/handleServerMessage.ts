/**
 * Handler for processing decoded server messages.
 * Provides a clean callback-based interface for message routing.
 */

import type { preppal } from "~/lib/interview_pb";

export interface MessageHandlers {
  onTranscript: (update: preppal.ITranscriptUpdate) => void;
  onAudio: (data: Uint8Array) => void;
  onSessionEnded: (reason: number) => void;
  onError: (message: string) => void;
}

/**
 * Routes a decoded server message to the appropriate handler.
 */
export function handleServerMessage(
  message: preppal.ServerToClientMessage,
  handlers: MessageHandlers,
): void {
  if (message.transcriptUpdate) {
    handlers.onTranscript(message.transcriptUpdate);
  } else if (message.audioResponse?.audioContent?.length) {
    handlers.onAudio(message.audioResponse.audioContent);
  } else if (message.sessionEnded) {
    handlers.onSessionEnded(message.sessionEnded.reason ?? 0);
  } else if (message.error) {
    handlers.onError(message.error.message ?? "Unknown error");
  }
}
