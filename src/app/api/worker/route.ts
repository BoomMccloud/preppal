// ABOUTME: Protobuf endpoint for Cloudflare Worker communication
// ABOUTME: Handles all worker-to-API requests via a single endpoint with binary protobuf encoding

import { type NextRequest, NextResponse } from "next/server";
import { preppal } from "~/lib/interview_pb";
import { db } from "~/server/db";
import { type Prisma, type SpeakerRole, InterviewStatus } from "@prisma/client";

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
 * Encodes a response to protobuf binary
 */
function encodeResponse(response: preppal.IWorkerApiResponse): Uint8Array {
  return preppal.WorkerApiResponse.encode(response).finish();
}

/**
 * Creates an error response
 */
function createErrorResponse(code: number, message: string): Uint8Array {
  return encodeResponse({
    error: { code, message },
  });
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

async function handleGetContext(
  req: preppal.IGetContextRequest,
): Promise<preppal.IWorkerApiResponse> {
  const interview = await db.interview.findUnique({
    where: { id: req.interviewId! },
    select: {
      jobDescriptionSnapshot: true,
      resumeSnapshot: true,
      persona: true,
    },
  });

  if (!interview) {
    return {
      error: { code: 404, message: "Interview not found" },
    };
  }

  return {
    getContext: {
      jobDescription: interview.jobDescriptionSnapshot ?? "",
      resume: interview.resumeSnapshot ?? "",
      persona: interview.persona ?? "professional interviewer",
    },
  };
}

async function handleUpdateStatus(
  req: preppal.IUpdateStatusRequest,
): Promise<preppal.IWorkerApiResponse> {
  // Map protobuf enum to string status
  const statusMap: Record<preppal.InterviewStatus, InterviewStatus> = {
    [preppal.InterviewStatus.STATUS_UNSPECIFIED]: InterviewStatus.PENDING,
    [preppal.InterviewStatus.IN_PROGRESS]: InterviewStatus.IN_PROGRESS,
    [preppal.InterviewStatus.COMPLETED]: InterviewStatus.COMPLETED,
    [preppal.InterviewStatus.ERROR]: InterviewStatus.ERROR,
  };

  const status = statusMap[req.status!] ?? InterviewStatus.PENDING;

  const interview = await db.interview.findUnique({
    where: { id: req.interviewId! },
  });

  if (!interview) {
    return {
      error: { code: 404, message: "Interview not found" },
    };
  }

  // Prepare update data based on status
  const updateData: Prisma.InterviewUpdateInput = {
    status,
  };

  if (status === InterviewStatus.IN_PROGRESS) {
    updateData.startedAt = new Date();
  } else if (
    status === InterviewStatus.COMPLETED ||
    status === InterviewStatus.ERROR
  ) {
    updateData.endedAt = req.endedAt ? new Date(req.endedAt) : new Date();
  }

  await db.interview.update({
    where: { id: req.interviewId! },
    data: updateData,
  });

  return {
    updateStatus: { success: true },
  };
}

async function handleSubmitTranscript(
  req: preppal.ISubmitTranscriptRequest,
): Promise<preppal.IWorkerApiResponse> {
  const entries = req.entries ?? [];

  // Perform atomic transaction: save transcript + update status
  await db.$transaction([
    db.transcriptEntry.createMany({
      data: entries.map((entry) => ({
        interviewId: req.interviewId!,
        speaker: entry.speaker! as SpeakerRole,
        content: entry.content!,
        timestamp: new Date(entry.timestamp!),
      })),
    }),
    db.interview.update({
      where: { id: req.interviewId! },
      data: {
        status: InterviewStatus.COMPLETED,
        endedAt: new Date(req.endedAt!),
      },
    }),
  ]);

  return {
    submitTranscript: { success: true },
  };
}

async function handleSubmitFeedback(
  req: preppal.ISubmitFeedbackRequest,
): Promise<preppal.IWorkerApiResponse> {
  // Check if interview exists
  const interview = await db.interview.findUnique({
    where: { id: req.interviewId! },
  });

  if (!interview) {
    return {
      error: { code: 404, message: "Interview not found" },
    };
  }

  // Create or update feedback (idempotent)
  await db.interviewFeedback.upsert({
    where: { interviewId: req.interviewId! },
    update: {
      summary: req.summary!,
      strengths: req.strengths!,
      contentAndStructure: req.contentAndStructure!,
      communicationAndDelivery: req.communicationAndDelivery!,
      presentation: req.presentation!,
    },
    create: {
      interviewId: req.interviewId!,
      summary: req.summary!,
      strengths: req.strengths!,
      contentAndStructure: req.contentAndStructure!,
      communicationAndDelivery: req.communicationAndDelivery!,
      presentation: req.presentation!,
    },
  });

  return {
    submitFeedback: { success: true },
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
    const request = preppal.WorkerApiRequest.decode(new Uint8Array(buffer));

    let response: preppal.IWorkerApiResponse;

    // Route to appropriate handler based on oneof field
    if (request.getContext) {
      console.log(
        `[Worker API] getContext for interview ${request.getContext.interviewId}`,
      );
      response = await handleGetContext(request.getContext);
    } else if (request.updateStatus) {
      console.log(
        `[Worker API] updateStatus for interview ${request.updateStatus.interviewId}`,
      );
      response = await handleUpdateStatus(request.updateStatus);
    } else if (request.submitTranscript) {
      console.log(
        `[Worker API] submitTranscript for interview ${request.submitTranscript.interviewId}`,
      );
      response = await handleSubmitTranscript(request.submitTranscript);
    } else if (request.submitFeedback) {
      console.log(
        `[Worker API] submitFeedback for interview ${request.submitFeedback.interviewId}`,
      );
      response = await handleSubmitFeedback(request.submitFeedback);
    } else {
      return protobufResponse(
        createErrorResponse(400, "Invalid request: no operation specified"),
        400,
      );
    }

    // Check if response contains an error
    if (response.error) {
      return protobufResponse(encodeResponse(response), response.error.code!);
    }

    return protobufResponse(encodeResponse(response));
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
