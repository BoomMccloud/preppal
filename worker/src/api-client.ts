// ABOUTME: Protobuf API client for communicating with Next.js backend
// ABOUTME: Uses binary protobuf encoding for type-safe worker↔API communication

import { preppal } from "./lib/interview_pb.js";
import type {
  IApiClient,
  TranscriptEntry,
  InterviewContext,
  FeedbackData,
} from "./interfaces/index.js";

/**
 * Encodes a WorkerApiRequest to binary protobuf
 */
function encodeRequest(request: preppal.IWorkerApiRequest): Uint8Array {
  return preppal.WorkerApiRequest.encode(request).finish();
}

/**
 * Decodes a WorkerApiResponse from binary protobuf
 */
function decodeResponse(buffer: ArrayBuffer): preppal.WorkerApiResponse {
  return preppal.WorkerApiResponse.decode(new Uint8Array(buffer));
}

/**
 * Protobuf-based API client for worker↔API communication
 * Implements IApiClient interface with binary protobuf encoding
 */
export class ApiClient implements IApiClient {
  constructor(
    private apiUrl: string,
    private workerSecret: string,
  ) {}

  /**
   * Sends a protobuf-encoded request to the API
   */
  private async sendRequest(
    request: preppal.IWorkerApiRequest,
  ): Promise<preppal.WorkerApiResponse> {
    const payload = encodeRequest(request);

    const response = await fetch(`${this.apiUrl}/api/worker`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-protobuf",
        Authorization: `Bearer ${this.workerSecret}`,
      },
      // Cloudflare Workers fetch accepts ArrayBuffer
      body: payload.buffer.slice(
        payload.byteOffset,
        payload.byteOffset + payload.byteLength,
      ) as ArrayBuffer,
    });

    const buffer = await response.arrayBuffer();
    const decoded = decodeResponse(buffer);

    // Check for error response
    if (decoded.error) {
      throw new Error(
        `API Error (${decoded.error.code}): ${decoded.error.message}`,
      );
    }

    return decoded;
  }

  /**
   * Fetches interview context (job description, resume, persona, duration)
   */
  async getContext(interviewId: string): Promise<InterviewContext> {
    console.log(`[API] getContext for interview ${interviewId}`);

    const response = await this.sendRequest({
      getContext: { interviewId },
    });

    if (!response.getContext) {
      throw new Error("Unexpected response: missing getContext");
    }

    const ctx = response.getContext;
    // Use || instead of ?? because protobuf defaults int32 to 0, not null
    const DEFAULT_DURATION_MS = 30 * 60 * 1000;
    const durationMs = ctx.durationMs || DEFAULT_DURATION_MS;

    console.log(
      `[API] getContext returning persona: "${ctx.persona}", durationMs: ${durationMs}`,
    );

    return {
      jobDescription: ctx.jobDescription ?? "",
      resume: ctx.resume ?? "",
      persona: ctx.persona ?? "professional interviewer",
      durationMs,
    };
  }

  /**
   * Updates interview status (IN_PROGRESS, COMPLETED, ERROR)
   */
  async updateStatus(interviewId: string, status: string): Promise<void> {
    console.log(`[API] updateStatus for interview ${interviewId} to ${status}`);

    // Map string status to protobuf enum
    const statusMap: Record<string, preppal.InterviewStatus> = {
      IN_PROGRESS: preppal.InterviewStatus.IN_PROGRESS,
      COMPLETED: preppal.InterviewStatus.COMPLETED,
      ERROR: preppal.InterviewStatus.ERROR,
    };

    const protoStatus =
      statusMap[status] ?? preppal.InterviewStatus.STATUS_UNSPECIFIED;

    const response = await this.sendRequest({
      updateStatus: {
        interviewId,
        status: protoStatus,
        endedAt:
          status === "COMPLETED" || status === "ERROR"
            ? new Date().toISOString()
            : "",
      },
    });

    if (!response.updateStatus?.success) {
      throw new Error("Unexpected response: updateStatus failed");
    }

    console.log(
      `[API] Successfully updated status for interview ${interviewId}`,
    );
  }

  /**
   * Submits interview transcript and marks interview as completed
   */
  async submitTranscript(
    interviewId: string,
    transcript: TranscriptEntry[],
    endedAt: string,
  ): Promise<void> {
    console.log(
      `[API] submitTranscript for interview ${interviewId} with ${transcript.length} entries`,
    );

    const response = await this.sendRequest({
      submitTranscript: {
        interviewId,
        entries: transcript.map((entry) => ({
          speaker: entry.speaker,
          content: entry.content,
          timestamp: entry.timestamp,
        })),
        endedAt,
      },
    });

    if (!response.submitTranscript?.success) {
      throw new Error("Unexpected response: submitTranscript failed");
    }

    console.log(
      `[API] Successfully submitted transcript for interview ${interviewId}`,
    );
  }

  /**
   * Submits AI-generated feedback for the interview
   */
  async submitFeedback(
    interviewId: string,
    feedback: FeedbackData,
  ): Promise<void> {
    console.log(`[API] submitFeedback for interview ${interviewId}`);

    const response = await this.sendRequest({
      submitFeedback: {
        interviewId,
        summary: feedback.summary,
        strengths: feedback.strengths,
        contentAndStructure: feedback.contentAndStructure,
        communicationAndDelivery: feedback.communicationAndDelivery,
        presentation: feedback.presentation,
      },
    });

    if (!response.submitFeedback?.success) {
      throw new Error("Unexpected response: submitFeedback failed");
    }

    console.log(
      `[API] Successfully submitted feedback for interview ${interviewId}`,
    );
  }
}
