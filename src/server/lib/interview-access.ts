/**
 * Interview access control utilities.
 * Handles owner vs guest access logic for interviews.
 */
import {
  type PrismaClient,
  type Interview,
  type InterviewDuration,
} from "@prisma/client";
import { randomBytes } from "crypto";

/** Duration mapping in milliseconds */
export const DURATION_MS: Record<InterviewDuration, number> = {
  SHORT: 10 * 60 * 1000, // 10 minutes
  STANDARD: 30 * 60 * 1000, // 30 minutes
  EXTENDED: 60 * 60 * 1000, // 60 minutes
};

/** Generate a URL-safe random token for guest access */
export function generateGuestToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Check interview access for owner or guest */
export async function getInterviewWithAccess(
  db: PrismaClient,
  interviewId: string,
  userId?: string,
  token?: string,
): Promise<{ interview: Interview; isGuest: boolean } | null> {
  const interview = await db.interview.findUnique({
    where: { id: interviewId },
  });
  if (!interview) return null;

  // Owner access
  if (userId && interview.userId === userId) {
    return { interview, isGuest: false };
  }

  // Guest access
  if (
    token &&
    interview.guestToken === token &&
    interview.guestExpiresAt &&
    interview.guestExpiresAt > new Date()
  ) {
    return { interview, isGuest: true };
  }

  return null;
}
