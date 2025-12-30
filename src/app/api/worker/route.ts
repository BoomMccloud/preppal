// ABOUTME: Protobuf endpoint for Cloudflare Worker communication
// ABOUTME: Handles all worker-to-API requests via a single endpoint with binary protobuf encoding

import { type NextRequest, NextResponse } from "next/server";
import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import {
  WorkerApiRequestSchema,
  WorkerApiResponseSchema,
  GetContextResponseSchema,
  UpdateStatusResponseSchema,
  SubmitTranscriptResponseSchema,
  SubmitFeedbackResponseSchema,
  ApiErrorSchema,
  InterviewStatus as ProtoInterviewStatus,
} from "~/lib/proto/interview_pb";
import { db } from "~/server/db";
import {
  type Prisma,
  InterviewStatus,
  InterviewDuration,
  BlockLanguage,
} from "@prisma/client";
import { getTemplate } from "~/lib/interview-templates";
import { buildBlockPrompt } from "~/lib/interview-templates/prompt";

/**
 * Validates worker authentication via shared secret
 */
function validateWorkerAuth(authHeader: string | null): boolean {
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.substring(7);
  const workerSecret = process.env.WORKER_SHARED_SECRET;
  return workerSecret !== undefined && token === workerSecret;
}

/**
 * Creates an error response
 */
function createErrorResponse(code: number, message: string): Uint8Array {
  const error = create(ApiErrorSchema, { code, message });
  const response = create(WorkerApiResponseSchema, {
    response: { case: "error", value: error },
  });
  return toBinary(WorkerApiResponseSchema, response);
}

/**
 * Creates a NextResponse with protobuf content type
 */
function protobufResponse(data: Uint8Array, status = 200): NextResponse {
  // Convert Uint8Array to Buffer for NextResponse compatibility
  const buffer = Buffer.from(data);
  return new NextResponse(buffer, {
    status,
    headers: { "Content-Type": "application/x-protobuf" },
  });
}

// ---- Handler Functions ----

// Duration enum to milliseconds mapping
const DURATION_MS_MAP: Record<InterviewDuration, number> = {
  [InterviewDuration.SHORT]: 10 * 60 * 1000, // 10 minutes
  [InterviewDuration.STANDARD]: 30 * 60 * 1000, // 30 minutes
  [InterviewDuration.EXTENDED]: 60 * 60 * 1000, // 60 minutes
};

async function handleGetContext(
  interviewId: string,
  blockNumber?: number,
): Promise<{ case: "getContext" | "error"; value: Uint8Array }> {
  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    select: {
      jobDescriptionSnapshot: true,
      resumeSnapshot: true,
      persona: true,
      duration: true,
      isBlockBased: true,
      templateId: true,
    },
  });

  if (!interview) {
    return {
      case: "error",
      value: createErrorResponse(404, "Interview not found"),
    };
  }

  // Standard interview (no block) - return existing behavior
  if (!interview.isBlockBased || blockNumber === undefined) {
    const durationMs = DURATION_MS_MAP[interview.duration] ?? 30 * 60 * 1000;

    const response = create(GetContextResponseSchema, {
      jobDescription: interview.jobDescriptionSnapshot ?? "",
      resume: interview.resumeSnapshot ?? "",
      persona: interview.persona ?? "professional interviewer",
      durationMs,
    });

    const fullResponse = create(WorkerApiResponseSchema, {
      response: { case: "getContext", value: response },
    });

    return {
      case: "getContext",
      value: toBinary(WorkerApiResponseSchema, fullResponse),
    };
  }

  // Block-based interview - get template and build block-specific prompt
  const template = interview.templateId
    ? getTemplate(interview.templateId)
    : null;

  if (!template) {
    return {
      case: "error",
      value: createErrorResponse(404, "Interview template not found"),
    };
  }

  const templateBlock = template.blocks[blockNumber - 1]; // 1-indexed
  if (!templateBlock) {
    return {
      case: "error",
      value: createErrorResponse(
        404,
        `Block ${blockNumber} not found in template`,
      ),
    };
  }

  // Mark block as IN_PROGRESS and set startedAt
  await db.interviewBlock.update({
    where: {
      interviewId_blockNumber: {
        interviewId,
        blockNumber,
      },
    },
    data: {
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });

  // Build block-specific system prompt
  const systemPrompt = buildBlockPrompt({
    blockNumber,
    totalBlocks: template.blocks.length,
    language: templateBlock.language,
    question: templateBlock.question.content,
    answerTimeLimitSec: template.answerTimeLimitSec,
    jobDescription: interview.jobDescriptionSnapshot ?? "",
    candidateResume: interview.resumeSnapshot ?? "",
    persona: template.persona ?? "professional interviewer",
  });

  const response = create(GetContextResponseSchema, {
    jobDescription: interview.jobDescriptionSnapshot ?? "",
    resume: interview.resumeSnapshot ?? "",
    persona: template.persona ?? "professional interviewer",
    durationMs: template.answerTimeLimitSec * 1000, // Use answer time limit
    systemPrompt,
    language: templateBlock.language,
  });

  const fullResponse = create(WorkerApiResponseSchema, {
    response: { case: "getContext", value: response },
  });

  return {
    case: "getContext",
    value: toBinary(WorkerApiResponseSchema, fullResponse),
  };
}

async function handleUpdateStatus(
  interviewId: string,
  status: ProtoInterviewStatus,
  endedAt?: string,
): Promise<{ case: "updateStatus" | "error"; value: Uint8Array }> {
  // Map protobuf enum to string status
  const statusMap: Record<ProtoInterviewStatus, InterviewStatus> = {
    [ProtoInterviewStatus.STATUS_UNSPECIFIED]: InterviewStatus.PENDING,
    [ProtoInterviewStatus.IN_PROGRESS]: InterviewStatus.IN_PROGRESS,
    [ProtoInterviewStatus.COMPLETED]: InterviewStatus.COMPLETED,
    [ProtoInterviewStatus.ERROR]: InterviewStatus.ERROR,
  };

  const dbStatus = statusMap[status] ?? InterviewStatus.PENDING;

  const interview = await db.interview.findUnique({
    where: { id: interviewId },
  });

  if (!interview) {
    return {
      case: "error",
      value: createErrorResponse(404, "Interview not found"),
    };
  }

  // Prepare update data based on status
  const updateData: Prisma.InterviewUpdateInput = {
    status: dbStatus,
  };

  if (dbStatus === InterviewStatus.IN_PROGRESS) {
    updateData.startedAt = new Date();
  } else if (
    dbStatus === InterviewStatus.COMPLETED ||
    dbStatus === InterviewStatus.ERROR
  ) {
    updateData.endedAt = endedAt ? new Date(endedAt) : new Date();
  }

  await db.interview.update({
    where: { id: interviewId },
    data: updateData,
  });

  const response = create(UpdateStatusResponseSchema, { success: true });
  const fullResponse = create(WorkerApiResponseSchema, {
    response: { case: "updateStatus", value: response },
  });

  return {
    case: "updateStatus",
    value: toBinary(WorkerApiResponseSchema, fullResponse),
  };
}

async function handleSubmitTranscript(
  interviewId: string,
  transcript: Uint8Array,
  endedAt: string,
  blockNumber?: number,
): Promise<{ case: "submitTranscript" | "error"; value: Uint8Array }> {
  if (!transcript || transcript.length === 0) {
    return {
      case: "error",
      value: createErrorResponse(400, "Missing transcript data"),
    };
  }

  // Block-based interview: save transcript reference to InterviewBlock
  if (blockNumber !== undefined) {
    // TODO(FEAT28): Implement proper block transcript storage.
    const transcriptId = `block-${interviewId}-${blockNumber}-${Date.now()}`;

    // Update the block with transcript reference and endedAt, and mark as COMPLETED
    await db.interviewBlock.update({
      where: {
        interviewId_blockNumber: {
          interviewId,
          blockNumber,
        },
      },
      data: {
        transcriptId,
        endedAt: new Date(endedAt),
        status: "COMPLETED",
      },
    });

    // Check if this was the last block
    const totalBlocks = await db.interviewBlock.count({
      where: { interviewId },
    });

    if (blockNumber === totalBlocks) {
      await db.interview.update({
        where: { id: interviewId },
        data: {
          status: InterviewStatus.COMPLETED,
          endedAt: new Date(endedAt),
        },
      });
    }

    const response = create(SubmitTranscriptResponseSchema, { success: true });
    const fullResponse = create(WorkerApiResponseSchema, {
      response: { case: "submitTranscript", value: response },
    });

    return {
      case: "submitTranscript",
      value: toBinary(WorkerApiResponseSchema, fullResponse),
    };
  }

  // Store transcript as single protobuf blob (upsert for idempotency)
  await db.$transaction([
    db.transcriptEntry.upsert({
      where: { interviewId },
      update: {
        transcript: Buffer.from(transcript),
      },
      create: {
        interviewId,
        transcript: Buffer.from(transcript),
      },
    }),
    db.interview.update({
      where: { id: interviewId },
      data: {
        status: InterviewStatus.COMPLETED,
        endedAt: new Date(endedAt),
      },
    }),
  ]);

  const response = create(SubmitTranscriptResponseSchema, { success: true });
  const fullResponse = create(WorkerApiResponseSchema, {
    response: { case: "submitTranscript", value: response },
  });

  return {
    case: "submitTranscript",
    value: toBinary(WorkerApiResponseSchema, fullResponse),
  };
}

async function handleSubmitFeedback(
  interviewId: string,
  summary: string,
  strengths: string,
  contentAndStructure: string,
  communicationAndDelivery: string,
  presentation: string,
): Promise<{ case: "submitFeedback" | "error"; value: Uint8Array }> {
  // Check if interview exists
  const interview = await db.interview.findUnique({
    where: { id: interviewId },
  });

  if (!interview) {
    return {
      case: "error",
      value: createErrorResponse(404, "Interview not found"),
    };
  }

  // Create or update feedback (idempotent)
  await db.interviewFeedback.upsert({
    where: { interviewId },
    update: {
      summary,
      strengths,
      contentAndStructure,
      communicationAndDelivery,
      presentation,
    },
    create: {
      interviewId,
      summary,
      strengths,
      contentAndStructure,
      communicationAndDelivery,
      presentation,
    },
  });

  const response = create(SubmitFeedbackResponseSchema, { success: true });
  const fullResponse = create(WorkerApiResponseSchema, {
    response: { case: "submitFeedback", value: response },
  });

  return {
    case: "submitFeedback",
    value: toBinary(WorkerApiResponseSchema, fullResponse),
  };
}

// ---- Main Handler ----

export async function POST(req: NextRequest) {
  // Validate authentication
  const authHeader = req.headers.get("authorization");
  if (!validateWorkerAuth(authHeader)) {
    return protobufResponse(createErrorResponse(401, "Unauthorized"), 401);
  }

  try {
    // Decode request
    const buffer = await req.arrayBuffer();
    const request = fromBinary(WorkerApiRequestSchema, new Uint8Array(buffer));

    let result: { case: string; value: Uint8Array };

    // Route to appropriate handler based on oneof field
    const { request: reqPayload } = request;

    switch (reqPayload.case) {
      case "getContext":
        console.log(
          `[Worker API] getContext for interview ${reqPayload.value.interviewId} block ${reqPayload.value.blockNumber}`,
        );
        result = await handleGetContext(
          reqPayload.value.interviewId,
          reqPayload.value.blockNumber,
        );
        break;

      case "updateStatus":
        console.log(
          `[Worker API] updateStatus for interview ${reqPayload.value.interviewId}`,
        );
        result = await handleUpdateStatus(
          reqPayload.value.interviewId,
          reqPayload.value.status,
          reqPayload.value.endedAt,
        );
        break;

      case "submitTranscript":
        console.log(
          `[Worker API] submitTranscript for interview ${reqPayload.value.interviewId} block ${reqPayload.value.blockNumber}`,
        );
        result = await handleSubmitTranscript(
          reqPayload.value.interviewId,
          reqPayload.value.transcript,
          reqPayload.value.endedAt,
          reqPayload.value.blockNumber,
        );
        break;

      case "submitFeedback":
        console.log(
          `[Worker API] submitFeedback for interview ${reqPayload.value.interviewId}`,
        );
        result = await handleSubmitFeedback(
          reqPayload.value.interviewId,
          reqPayload.value.summary,
          reqPayload.value.strengths,
          reqPayload.value.contentAndStructure,
          reqPayload.value.communicationAndDelivery,
          reqPayload.value.presentation,
        );
        break;

      default:
        return protobufResponse(
          createErrorResponse(400, "Invalid request: no operation specified"),
          400,
        );
    }

    // Check if response contains an error
    if (result.case === "error") {
      return protobufResponse(result.value, 400);
    }

    return protobufResponse(result.value);
  } catch (error) {
    console.error("[Worker API] Error:", error);
    return protobufResponse(
      createErrorResponse(
        500,
        error instanceof Error ? error.message : "Internal server error",
      ),
      500,
    );
  }
}
