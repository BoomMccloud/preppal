// ABOUTME: Manages the high-level lifecycle of an interview session
// ABOUTME: Handles backend API interactions for status updates, transcript submission, and feedback storage

import { INTERVIEW_STATUS } from "../constants";
import type {
  IApiClient,
  InterviewContext,
  ITranscriptManager,
} from "../interfaces";

/**
 * Manages the high-level lifecycle of an interview session.
 * Encapsulates backend API interactions and business logic for session state changes.
 */
export class InterviewLifecycleManager {
  constructor(
    private apiClient: IApiClient,
    private geminiApiKey: string,
  ) {}

  /**
   * Initializes the interview session by fetching context and updating status.
   */
  async initializeSession(
    interviewId: string,
    blockNumber?: number,
  ): Promise<InterviewContext> {
    let context: InterviewContext = {
      jobDescription: "",
      resume: "",
      persona: "professional interviewer",
      durationMs: 30 * 60 * 1000, // Default 30 minutes
    };

    try {
      console.log(
        `[InterviewLifecycleManager] Fetching context for interview ${interviewId}${blockNumber ? ` (block ${blockNumber})` : ""}`,
      );
      context = await this.apiClient.getContext(interviewId, blockNumber);
      console.log(`[InterviewLifecycleManager] Context fetched successfully`);
    } catch (error) {
      console.error(
        `[InterviewLifecycleManager] Failed to fetch interview context (falling back to empty):`,
        error,
      );
      // We continue with empty context to allow the interview to proceed if possible
    }

    try {
      // For block-based interviews, the backend marks the block as IN_PROGRESS during getContext.
      // We still update the overall interview status if it's not already IN_PROGRESS.
      await this.apiClient.updateStatus(
        interviewId,
        INTERVIEW_STATUS.IN_PROGRESS,
      );
      console.log(`[InterviewLifecycleManager] Status updated to IN_PROGRESS`);
    } catch (error) {
      console.error(
        `[InterviewLifecycleManager] Failed to update status to IN_PROGRESS:`,
        error,
      );
      // We don't throw here if context was successfully fetched, as the interview can still proceed
    }

    return context;
  }

  /**
   * Finalizes the interview session by submitting transcripts and generating feedback.
   * @param interviewId - The interview ID
   * @param transcriptManager - The transcript manager with aggregated turns
   * @param context - Interview context for feedback generation
   * @param blockNumber - Optional block number for block-based interviews
   */
  async finalizeSession(
    interviewId: string,
    transcriptManager: ITranscriptManager,
    context: InterviewContext,
    blockNumber?: number,
  ): Promise<void> {
    try {
      const endedAt = new Date().toISOString();

      // Get serialized transcript (protobuf binary) for DB storage
      const serializedTranscript = transcriptManager.serializeTranscript();

      // Step 1: Save transcript - CRITICAL
      console.log(
        `[InterviewLifecycleManager] Submitting transcript for interview ${interviewId}${blockNumber ? ` block ${blockNumber}` : ""} (${serializedTranscript.length} bytes)`,
      );
      await this.apiClient.submitTranscript(
        interviewId,
        serializedTranscript,
        endedAt,
        blockNumber,
      );
      console.log(
        `[InterviewLifecycleManager] Transcript submitted for interview ${interviewId}`,
      );

      // Step 2: Update status
      // If it's a block, we don't mark the whole interview as COMPLETED.
      // The backend handles marking the block as COMPLETED during submitTranscript if blockNumber is provided.
      if (!blockNumber) {
        await this.apiClient.updateStatus(
          interviewId,
          INTERVIEW_STATUS.COMPLETED,
        );
        console.log(
          `[InterviewLifecycleManager] Interview ${interviewId} status updated to COMPLETED`,
        );
      } else {
        console.log(
          `[InterviewLifecycleManager] Block ${blockNumber} for interview ${interviewId} finalized`,
        );
      }
    } catch (error) {
      console.error(
        `[InterviewLifecycleManager] Failed to finalize session for interview ${interviewId}:`,
        error,
      );
      // If critical steps failed, attempt to mark as ERROR
      await this.handleError(interviewId, error as Error);
    }
  }

  /**
   * Reports an error for the interview session.
   */
  async handleError(interviewId: string, error: Error): Promise<void> {
    console.error(
      `[InterviewLifecycleManager] Reporting error for interview ${interviewId}:`,
      error.message,
    );
    try {
      await this.apiClient.updateStatus(interviewId, INTERVIEW_STATUS.ERROR);
    } catch (statusError) {
      console.error(
        `[InterviewLifecycleManager] Failed to update status to ERROR:`,
        statusError,
      );
    }
  }
}
