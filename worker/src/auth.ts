// ABOUTME: JWT authentication for WebSocket connections to validate user and interview access
// ABOUTME: Uses jose library for token verification compatible with Cloudflare Workers runtime

import { jwtVerify } from "jose";

export interface JWTPayload {
  userId: string;
  interviewId: string;
  iat: number;
  exp: number;
}

/**
 * Validates a JWT token and returns the decoded payload
 * @throws Error if token is invalid or expired
 */
export async function validateJWT(
  token: string,
  secret: string,
): Promise<JWTPayload> {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(secret);
  // Convert to pure Uint8Array (not Buffer) for compatibility with jose in Node.js
  const secretKey = new Uint8Array(encoded);

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    // Validate that the payload has the required fields
    if (
      !payload.userId ||
      !payload.interviewId ||
      typeof payload.userId !== "string" ||
      typeof payload.interviewId !== "string"
    ) {
      throw new Error("Invalid JWT payload: missing required fields");
    }

    return {
      userId: payload.userId as string,
      interviewId: payload.interviewId as string,
      iat: payload.iat ?? 0,
      exp: payload.exp ?? 0,
    };
  } catch (error) {
    throw new Error(
      `JWT validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
