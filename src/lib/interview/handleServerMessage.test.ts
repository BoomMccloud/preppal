/**
 * Unit tests for message handler utility.
 */

import { describe, it, expect, vi } from "vitest";
import {
  handleServerMessage,
  type MessageHandlers,
} from "./handleServerMessage";
import { preppal } from "~/lib/interview_pb";

function createMockHandlers(): MessageHandlers {
  return {
    onTranscript: vi.fn(),
    onAudio: vi.fn(),
    onSessionEnded: vi.fn(),
    onError: vi.fn(),
  };
}

describe("handleServerMessage", () => {
  it("should call onTranscript for transcript update messages", () => {
    const handlers = createMockHandlers();
    const message = preppal.ServerToClientMessage.create({
      transcriptUpdate: {
        speaker: "AI",
        text: "Hello",
        isFinal: true,
      },
    });

    handleServerMessage(message, handlers);

    expect(handlers.onTranscript).toHaveBeenCalledWith(
      message.transcriptUpdate,
    );
    expect(handlers.onAudio).not.toHaveBeenCalled();
    expect(handlers.onSessionEnded).not.toHaveBeenCalled();
    expect(handlers.onError).not.toHaveBeenCalled();
  });

  it("should call onAudio for audio response messages with content", () => {
    const handlers = createMockHandlers();
    const audioContent = new Uint8Array([1, 2, 3, 4]);
    const message = preppal.ServerToClientMessage.create({
      audioResponse: { audioContent },
    });

    handleServerMessage(message, handlers);

    expect(handlers.onAudio).toHaveBeenCalledWith(audioContent);
    expect(handlers.onTranscript).not.toHaveBeenCalled();
    expect(handlers.onSessionEnded).not.toHaveBeenCalled();
    expect(handlers.onError).not.toHaveBeenCalled();
  });

  it("should not call onAudio for empty audio content", () => {
    const handlers = createMockHandlers();
    const message = preppal.ServerToClientMessage.create({
      audioResponse: { audioContent: new Uint8Array(0) },
    });

    handleServerMessage(message, handlers);

    expect(handlers.onAudio).not.toHaveBeenCalled();
  });

  it("should call onSessionEnded with reason for session ended messages", () => {
    const handlers = createMockHandlers();
    const message = preppal.ServerToClientMessage.create({
      sessionEnded: { reason: 2 },
    });

    handleServerMessage(message, handlers);

    expect(handlers.onSessionEnded).toHaveBeenCalledWith(2);
    expect(handlers.onTranscript).not.toHaveBeenCalled();
    expect(handlers.onAudio).not.toHaveBeenCalled();
    expect(handlers.onError).not.toHaveBeenCalled();
  });

  it("should default to reason 0 when session ended has no reason", () => {
    const handlers = createMockHandlers();
    const message = preppal.ServerToClientMessage.create({
      sessionEnded: {},
    });

    handleServerMessage(message, handlers);

    expect(handlers.onSessionEnded).toHaveBeenCalledWith(0);
  });

  it("should call onError for error messages", () => {
    const handlers = createMockHandlers();
    const message = preppal.ServerToClientMessage.create({
      error: { message: "Something went wrong" },
    });

    handleServerMessage(message, handlers);

    expect(handlers.onError).toHaveBeenCalledWith("Something went wrong");
    expect(handlers.onTranscript).not.toHaveBeenCalled();
    expect(handlers.onAudio).not.toHaveBeenCalled();
    expect(handlers.onSessionEnded).not.toHaveBeenCalled();
  });

  it("should default to 'Unknown error' when error has no message", () => {
    const handlers = createMockHandlers();
    const message = preppal.ServerToClientMessage.create({
      error: {},
    });

    handleServerMessage(message, handlers);

    expect(handlers.onError).toHaveBeenCalledWith("Unknown error");
  });

  it("should not call any handler for empty messages", () => {
    const handlers = createMockHandlers();
    const message = preppal.ServerToClientMessage.create({});

    handleServerMessage(message, handlers);

    expect(handlers.onTranscript).not.toHaveBeenCalled();
    expect(handlers.onAudio).not.toHaveBeenCalled();
    expect(handlers.onSessionEnded).not.toHaveBeenCalled();
    expect(handlers.onError).not.toHaveBeenCalled();
  });
});
