import { WebSocketServer, WebSocket } from "ws";
import { jwtVerify } from "jose";
import { db } from "~/server/db";
import { env } from "~/env";

interface JWTPayload {
  userId: string;
  interviewId: string;
}

interface ClientToServerMessage {
  start_request?: {
    auth_token: string;
    interview_id: string;
    audio_config?: {
      encoding: string;
      sample_rate_hertz: number;
    };
  };
  audio_chunk?: {
    audio_content: string;
  };
  end_request?: Record<string, never>;
}

interface ServerToClientMessage {
  start_response?: {
    session_id: string;
  };
  audio_chunk?: {
    audio_content: string;
  };
  partial_transcript?: {
    text: string;
    speaker: "USER" | "AI";
    is_final: boolean;
  };
  session_ended?: {
    reason: "USER_INITIATED" | "AI_INITIATED" | "TIMEOUT" | "INTERNAL_ERROR";
    message?: string;
  };
  error?: {
    code: number;
    message: string;
  };
}

interface ConnectionState {
  authenticated: boolean;
  userId?: string;
  interviewId?: string;
  sessionId?: string;
}

export function startServer(port?: number) {
  const wsPort = port ?? parseInt(process.env.WSS_PORT ?? "3001", 10);
  const wss = new WebSocketServer({ port: wsPort });

  console.log(`[WebSocket] Server started on port ${wsPort}`);

  wss.on("connection", (ws: WebSocket) => {
    const state: ConnectionState = {
      authenticated: false,
    };

    console.log("[WebSocket] New connection");

    ws.on("message", async (data: Buffer) => {
      try {
        const message: ClientToServerMessage = JSON.parse(data.toString());

        // Handle StartRequest
        if (message.start_request) {
          await handleStartRequest(ws, message.start_request, state);
        }
        // Handle EndRequest
        else if (message.end_request) {
          await handleEndRequest(ws, state);
        }
        // Handle AudioChunk (MVP: not processed)
        else if (message.audio_chunk) {
          // MVP: Ignore audio chunks
          console.log("[WebSocket] Audio chunk received (ignored in MVP)");
        }
      } catch (error) {
        console.error("[WebSocket] Error handling message:", error);
        sendError(ws, 500, "Internal server error");
        ws.close();
      }
    });

    ws.on("close", () => {
      console.log("[WebSocket] Connection closed");
    });

    ws.on("error", (error) => {
      console.error("[WebSocket] Connection error:", error);
    });
  });

  return {
    close: () => {
      return new Promise<void>((resolve) => {
        wss.close(() => {
          console.log("[WebSocket] Server closed");
          resolve();
        });
      });
    },
  };
}

async function handleStartRequest(
  ws: WebSocket,
  startRequest: NonNullable<ClientToServerMessage["start_request"]>,
  state: ConnectionState,
) {
  try {
    // Verify JWT token
    const secret = new TextEncoder().encode(
      env.AUTH_SECRET ?? "fallback-secret-for-development",
    );

    let payload: JWTPayload;
    try {
      const result = await jwtVerify(startRequest.auth_token, secret);
      payload = result.payload as unknown as JWTPayload;
    } catch (error) {
      console.error("[WebSocket] JWT verification failed:", error);
      sendError(ws, 401, "Invalid authentication token");
      ws.close();
      return;
    }

    // Verify interview exists and belongs to user
    const interview = await db.interview.findUnique({
      where: {
        id: startRequest.interview_id,
        userId: payload.userId,
      },
    });

    if (!interview) {
      sendError(ws, 404, "Interview not found or unauthorized");
      ws.close();
      return;
    }

    // Update interview status to IN_PROGRESS
    await db.interview.update({
      where: { id: interview.id },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });

    // Mark connection as authenticated
    state.authenticated = true;
    state.userId = payload.userId;
    state.interviewId = interview.id;
    state.sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Send StartResponse
    const response: ServerToClientMessage = {
      start_response: {
        session_id: state.sessionId,
      },
    };
    ws.send(JSON.stringify(response));

    console.log(`[WebSocket] Session started: ${state.sessionId}`);

    // Start mock transcript streaming
    startMockTranscriptStream(ws, state);
  } catch (error) {
    console.error("[WebSocket] Error in handleStartRequest:", error);
    sendError(ws, 500, "Failed to start session");
    ws.close();
  }
}

async function handleEndRequest(ws: WebSocket, state: ConnectionState) {
  if (!state.authenticated || !state.interviewId) {
    sendError(ws, 401, "Not authenticated");
    ws.close();
    return;
  }

  try {
    // Update interview status to COMPLETED
    await db.interview.update({
      where: { id: state.interviewId },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
      },
    });

    // Create mock feedback for MVP
    await db.feedback.create({
      data: {
        interviewId: state.interviewId,
        summary:
          "**MOCK** You demonstrated good communication skills and provided thoughtful responses to the interview questions. Your answers showed understanding of the topics discussed, and you maintained a professional demeanor throughout the session.",
        strengths: `• **Clear Communication**: You articulated your thoughts clearly and concisely
• **Professional Demeanor**: Maintained professionalism throughout the interview
• **Thoughtful Responses**: Took time to consider questions before answering
• **Engaged Listener**: Showed active engagement with the interviewer's questions`,
        contentAndStructure: `Your responses were well-structured and addressed the questions directly. You provided relevant examples and maintained good flow throughout the conversation.

**Strengths:**
- Clear introduction and background
- Relevant examples to support your points
- Logical progression of ideas
- Good use of specific details

**Areas for improvement:**
- Could provide more quantitative results in examples
- Consider using the STAR method more consistently
- Expand on technical details when relevant`,
        communicationAndDelivery: `You communicated effectively with good pacing and clarity. Your delivery style was conversational yet professional.

**Strengths:**
- Good speaking pace and clarity
- Appropriate pause before answering
- Confident tone
- Good use of transitions between points

**Areas for improvement:**
- Could vary vocal tone for emphasis
- Reduce filler words slightly
- Consider adding more enthusiasm when discussing achievements`,
        presentation: `You presented yourself professionally and maintained good engagement throughout the session.

**Strengths:**
- Professional and focused demeanor
- Good attention to questions
- Appropriate level of formality
- Maintained engagement throughout

**Areas for improvement:**
- Consider more expressive body language
- Use hand gestures to emphasize key points
- Maintain consistent energy level`,
      },
    });

    console.log(
      `[WebSocket] Mock feedback created for interview: ${state.interviewId}`,
    );

    // Send SessionEnded
    const response: ServerToClientMessage = {
      session_ended: {
        reason: "USER_INITIATED",
        message: "Interview ended by user",
      },
    };
    ws.send(JSON.stringify(response));

    console.log(`[WebSocket] Session ended: ${state.sessionId}`);

    // Close connection gracefully
    ws.close();
  } catch (error) {
    console.error("[WebSocket] Error in handleEndRequest:", error);
    sendError(ws, 500, "Failed to end session");
    ws.close();
  }
}

function sendError(ws: WebSocket, code: number, message: string) {
  const response: ServerToClientMessage = {
    error: {
      code,
      message,
    },
  };
  ws.send(JSON.stringify(response));
}

function startMockTranscriptStream(ws: WebSocket, state: ConnectionState) {
  const mockScript = [
    {
      delay: 3000,
      text: "Hello and welcome to your interview. Let's begin with a classic question: tell me a bit about yourself.",
      speaker: "AI" as const,
    },
    {
      delay: 12000,
      text: "Thank you for sharing that. Based on your resume, could you elaborate on a project you're particularly proud of?",
      speaker: "AI" as const,
    },
    {
      delay: 15000,
      text: "That's a great example. Now, what would you consider to be your biggest professional strength?",
      speaker: "AI" as const,
    },
    {
      delay: 12000,
      text: "Understood. That concludes our session for today. We appreciate your time and will be in touch with the next steps.",
      speaker: "AI" as const,
    },
  ];

  let currentIndex = 0;

  function sendNextMessage() {
    if (currentIndex >= mockScript.length) {
      // End session after all messages
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          handleEndRequest(ws, state).catch(console.error);
        }
      }, 2000);
      return;
    }

    const scriptItem = mockScript[currentIndex]!;
    currentIndex++;

    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const response: ServerToClientMessage = {
          partial_transcript: {
            text: scriptItem.text,
            speaker: scriptItem.speaker,
            is_final: true,
          },
        };
        ws.send(JSON.stringify(response));
        console.log(
          `[WebSocket] Sent transcript: ${scriptItem.text.substring(0, 50)}...`,
        );

        // Schedule next message
        sendNextMessage();
      }
    }, scriptItem.delay);
  }

  // Start sending messages
  sendNextMessage();
}

// Start server if run directly (ES module check)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  startServer();
}
