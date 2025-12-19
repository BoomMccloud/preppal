// ABOUTME: Protobuf API client for communicating with Next.js backend
// ABOUTME: Uses binary protobuf encoding for type-safe worker↔API communication

import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import {
  WorkerApiRequestSchema,
  type WorkerApiResponse,
  WorkerApiResponseSchema,
  GetContextRequestSchema,
  UpdateStatusRequestSchema,
  SubmitTranscriptRequestSchema,
  SubmitFeedbackRequestSchema,
  InterviewStatus,
} from "./lib/proto/interview_pb.js";
import type {
  IApiClient,
  InterviewContext,
  FeedbackData,
} from "./interfaces/index.js";

/**
 * Decodes a WorkerApiResponse from binary protobuf
 */
function decodeResponse(buffer: ArrayBuffer): WorkerApiResponse {
  return fromBinary(WorkerApiResponseSchema, new Uint8Array(buffer));
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
  private async sendRequest(payload: Uint8Array): Promise<WorkerApiResponse> {
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
    if (decoded.response.case === "error") {
      throw new Error(
        `API Error (${decoded.response.value.code}): ${decoded.response.value.message}`,
      );
    }

    return decoded;
  }

  /**
   * Fetches interview context (job description, resume, persona, duration)
   */
  async getContext(interviewId: string): Promise<InterviewContext> {
    console.log(`[API] getContext for interview ${interviewId}`);

    const request = create(WorkerApiRequestSchema, {
      request: {
        case: "getContext",
        value: create(GetContextRequestSchema, { interviewId }),
      },
    });
    const payload = toBinary(WorkerApiRequestSchema, request);
    const response = await this.sendRequest(payload);

    if (response.response.case !== "getContext") {
      throw new Error("Unexpected response: missing getContext");
    }

    const ctx = response.response.value;
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
    const statusMap: Record<string, InterviewStatus> = {
      IN_PROGRESS: InterviewStatus.IN_PROGRESS,
      COMPLETED: InterviewStatus.COMPLETED,
      ERROR: InterviewStatus.ERROR,
    };

    const protoStatus =
      statusMap[status] ?? InterviewStatus.STATUS_UNSPECIFIED;

    const request = create(WorkerApiRequestSchema, {
      request: {
        case: "updateStatus",
        value: create(UpdateStatusRequestSchema, {
          interviewId,
          status: protoStatus,
          endedAt:
            status === "COMPLETED" || status === "ERROR"
              ? new Date().toISOString()
              : "",
        }),
      },
    });
    const payload = toBinary(WorkerApiRequestSchema, request);
    const response = await this.sendRequest(payload);

    if (response.response.case !== "updateStatus" || !response.response.value.success) {
      throw new Error("Unexpected response: updateStatus failed");
    }

    console.log(
      `[API] Successfully updated status for interview ${interviewId}`,
    );
  }

  /**
   * Submits serialized protobuf transcript blob
   */
  async submitTranscript(
    interviewId: string,
    transcript: Uint8Array,
    endedAt: string,
  ): Promise<void> {
    console.log(
      `[API] submitTranscript for interview ${interviewId} (${transcript.length} bytes)`,
    );

    const request = create(WorkerApiRequestSchema, {
      request: {
        case: "submitTranscript",
        value: create(SubmitTranscriptRequestSchema, {
          interviewId,
          transcript,
          endedAt,
        }),
      },
    });
    const payload = toBinary(WorkerApiRequestSchema, request);
    const response = await this.sendRequest(payload);

    if (response.response.case !== "submitTranscript" || !response.response.value.success) {
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

    const request = create(WorkerApiRequestSchema, {
      request: {
        case: "submitFeedback",
        value: create(SubmitFeedbackRequestSchema, {
          interviewId,
          summary: feedback.summary,
          strengths: feedback.strengths,
          contentAndStructure: feedback.contentAndStructure,
          communicationAndDelivery: feedback.communicationAndDelivery,
          presentation: feedback.presentation,
        }),
      },
    });
    const payload = toBinary(WorkerApiRequestSchema, request);
    const response = await this.sendRequest(payload);

    if (response.response.case !== "submitFeedback" || !response.response.value.success) {
      throw new Error("Unexpected response: submitFeedback failed");
    }

    console.log(
      `[API] Successfully submitted feedback for interview ${interviewId}`,
    );
  }
}
