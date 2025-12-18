// ABOUTME: Manages the high-level lifecycle of an interview session
// ABOUTME: Handles backend API interactions for status updates, transcript submission, and feedback generation

import { INTERVIEW_STATUS } from "../constants";
import type {
  IApiClient,
  InterviewContext,
  TranscriptEntry,
} from "../interfaces";
import { generateFeedback } from "../utils/feedback";

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
  async initializeSession(interviewId: string): Promise<InterviewContext> {
    let context: InterviewContext = { jobDescription: "", resume: "" };

    try {
      console.log(
        `[InterviewLifecycleManager] Fetching context for interview ${interviewId}`,
      );
      context = await this.apiClient.getContext(interviewId);
      console.log(`[InterviewLifecycleManager] Context fetched successfully`);
    } catch (error) {
      console.error(
        `[InterviewLifecycleManager] Failed to fetch interview context (falling back to empty):`,
        error,
      );
      // We continue with empty context to allow the interview to proceed if possible
    }

    try {
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
      throw error; // This is critical for session startup
    }

    return context;
  }

  /**
   * Finalizes the interview session by submitting transcripts and generating feedback.
   */
  async finalizeSession(
    interviewId: string,
    transcript: TranscriptEntry[],
    context: InterviewContext,
  ): Promise<void> {
    try {
      const endedAt = new Date().toISOString();

      // Step 1: Save transcript - CRITICAL
      console.log(
        `[InterviewLifecycleManager] Submitting transcript for interview ${interviewId} (${transcript.length} entries)`,
      );
      await this.apiClient.submitTranscript(interviewId, transcript, endedAt);
      console.log(
        `[InterviewLifecycleManager] Transcript submitted for interview ${interviewId}`,
      );

      // Step 2: Generate and submit feedback - BEST EFFORT
      await this.generateAndSubmitFeedback(interviewId, transcript, context);

      // Step 3: Update status to COMPLETED
      await this.apiClient.updateStatus(
        interviewId,
        INTERVIEW_STATUS.COMPLETED,
      );
      console.log(
        `[InterviewLifecycleManager] Interview ${interviewId} status updated to COMPLETED`,
      );
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

  /**
   * Generates and submits feedback for the transcript.
   * Failure here does not stop the session from being marked as COMPLETED.
   */
  private async generateAndSubmitFeedback(
    interviewId: string,
    transcript: TranscriptEntry[],
    context: InterviewContext,
  ): Promise<void> {
    try {
      console.log(`[InterviewLifecycleManager] Generating feedback...`);
      const feedback = await generateFeedback(
        transcript,
        context,
        this.geminiApiKey,
      );

      console.log(
        `[InterviewLifecycleManager] Feedback generated, submitting...`,
      );
      await this.apiClient.submitFeedback(interviewId, feedback);
      console.log(
        `[InterviewLifecycleManager] Feedback submitted successfully`,
      );
    } catch (feedbackError) {
      console.error(
        `[InterviewLifecycleManager] Failed to generate or submit feedback:`,
        feedbackError,
      );
      // Best effort - do not rethrow
    }
  }
}
