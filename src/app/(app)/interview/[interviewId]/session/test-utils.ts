import * as interview_pb from "~/lib/interview_pb";

/**
 * Utility functions for creating test protobuf messages
 */

export const createTranscriptUpdateMessage = (
  speaker: "AI" | "USER",
  text: string,
  is_final: boolean = true
): ArrayBuffer => {
  const transcriptUpdate = interview_pb.preppal.TranscriptUpdate.create({
    speaker: speaker === "AI" ? interview_pb.preppal.Speaker.AI : interview_pb.preppal.Speaker.USER,
    text,
    is_final,
  });

  const message = interview_pb.preppal.ServerToClientMessage.create({
    transcript_update: transcriptUpdate,
  });

  const buffer = interview_pb.preppal.ServerToClientMessage.encode(message).finish();
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

export const createAudioResponseMessage = (audioData: Uint8Array): ArrayBuffer => {
  const audioResponse = interview_pb.preppal.AudioResponse.create({
    audio_content: audioData,
  });

  const message = interview_pb.preppal.ServerToClientMessage.create({
    audio_response: audioResponse,
  });

  const buffer = interview_pb.preppal.ServerToClientMessage.encode(message).finish();
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

export const createSessionEndedMessage = (
  reason: interview_pb.preppal.SessionEnded.Reason = interview_pb.preppal.SessionEnded.Reason.USER_INITIATED
): ArrayBuffer => {
  const sessionEnded = interview_pb.preppal.SessionEnded.create({
    reason,
  });

  const message = interview_pb.preppal.ServerToClientMessage.create({
    session_ended: sessionEnded,
  });

  const buffer = interview_pb.preppal.ServerToClientMessage.encode(message).finish();
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

export const createErrorMessage = (code: number, message: string): ArrayBuffer => {
  const errorResponse = interview_pb.preppal.ErrorResponse.create({
    code,
    message,
  });

  const serverMessage = interview_pb.preppal.ServerToClientMessage.create({
    error: errorResponse,
  });

  const buffer = interview_pb.preppal.ServerToClientMessage.encode(serverMessage).finish();
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

export const createEndRequestMessage = (): ArrayBuffer => {
  const endRequest = interview_pb.preppal.EndRequest.create();
  
  const message = interview_pb.preppal.ClientToServerMessage.create({
    end_request: endRequest,
  });

  const buffer = interview_pb.preppal.ClientToServerMessage.encode(message).finish();
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};