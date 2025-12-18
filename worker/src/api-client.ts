// ABOUTME: API client for communicating with Next.js backend tRPC endpoints
// ABOUTME: Handles interview status updates and transcript submission with authentication

import type {
  IApiClient,
  TranscriptEntry,
  InterviewContext,
  FeedbackData,
} from "./interfaces/index.js";

export class ApiClient implements IApiClient {
  constructor(
    private apiUrl: string,
    private workerSecret: string,
  ) {}

  async updateStatus(interviewId: string, status: string): Promise<void> {
    // Use single endpoint for tRPC calls
    const url = `${this.apiUrl}/api/trpc/interview.updateStatus`;

    console.log(
      `[API] Calling updateStatus for interview ${interviewId} to ${status}: ${url}`,
    );

    // Format request according to tRPC single request format with superjson
    const requestBody = {
      json: {
        interviewId,
        status,
      },
    };

    console.log(`[API] Request body:`, JSON.stringify(requestBody, null, 2));

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.workerSecret}`,
        },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      console.error(
        `[API] Network error calling updateStatus for interview ${interviewId}:`,
        error,
      );
      throw new Error(
        `Network error calling updateStatus: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    console.log(
      `[API] updateStatus response for interview ${interviewId}: ${response.status} ${response.statusText}`,
    );

    // Log response headers for debugging
    console.log(`[API] Response headers:`, [...response.headers.entries()]);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[API] updateStatus HTTP error details for interview ${interviewId}:`,
        errorText,
      );
      throw new Error(
        `HTTP error calling updateStatus: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    // Parse tRPC response
    let jsonResponse: any;
    try {
      const responseText = await response.text();
      console.log(`[API] Raw response text:`, responseText);
      jsonResponse = JSON.parse(responseText);
    } catch (error) {
      console.error(
        `[API] Failed to parse JSON response for updateStatus interview ${interviewId}:`,
        error,
      );
      throw new Error(
        `Failed to parse JSON response from updateStatus: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    console.log(
      `[API] Parsed JSON response:`,
      JSON.stringify(jsonResponse, null, 2),
    );

    if (jsonResponse.error) {
      const error = jsonResponse.error;
      console.error(
        `[API] updateStatus tRPC error for interview ${interviewId}:`,
        error,
      );
      throw new Error(
        `tRPC error in updateStatus: ${error.json?.message || "Unknown tRPC error"}`,
      );
    }

    console.log(
      `[API] Successfully updated status for interview ${interviewId} to ${status}`,
    );
  }

  async submitTranscript(
    interviewId: string,
    transcript: TranscriptEntry[],
    endedAt: string,
  ): Promise<void> {
    // Use single endpoint for tRPC calls
    const url = `${this.apiUrl}/api/trpc/interview.submitTranscript`;

    console.log(
      `[API] Calling submitTranscript for interview ${interviewId} with ${transcript.length} entries: ${url}`,
    );

    // Format request according to tRPC single request format with superjson
    const requestBody = {
      json: {
        interviewId,
        transcript,
        endedAt,
      },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.workerSecret}`,
        },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      console.error(
        `[API] Network error calling submitTranscript for interview ${interviewId}:`,
        error,
      );
      throw new Error(
        `Network error calling submitTranscript: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    console.log(
      `[API] submitTranscript response for interview ${interviewId}: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[API] submitTranscript HTTP error details for interview ${interviewId}:`,
        errorText,
      );
      throw new Error(
        `HTTP error calling submitTranscript: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    // Parse tRPC response
    let jsonResponse: any;
    try {
      jsonResponse = await response.json();
    } catch (error) {
      console.error(
        `[API] Failed to parse JSON response for submitTranscript interview ${interviewId}:`,
        error,
      );
      throw new Error(
        `Failed to parse JSON response from submitTranscript: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    if (jsonResponse.error) {
      const error = jsonResponse.error;
      console.error(
        `[API] submitTranscript tRPC error for interview ${interviewId}:`,
        error,
      );
      throw new Error(
        `tRPC error in submitTranscript: ${error.json?.message || "Unknown tRPC error"}`,
      );
    }

    console.log(
      `[API] Successfully submitted transcript for interview ${interviewId} with ${transcript.length} entries`,
    );
  }

  async submitFeedback(
    interviewId: string,
    feedback: FeedbackData,
  ): Promise<void> {
    const url = `${this.apiUrl}/api/trpc/interview.submitFeedback`;

    console.log(
      `[API] Calling submitFeedback for interview ${interviewId}: ${url}`,
    );

    const requestBody = {
      json: {
        interviewId,
        ...feedback,
      },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.workerSecret}`,
        },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      console.error(`[API] Network error calling submitFeedback:`, error);
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] submitFeedback HTTP error:`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const jsonResponse: any = await response.json();
    if (jsonResponse.error) {
      throw new Error(
        `tRPC error: ${jsonResponse.error.json?.message || "Unknown error"}`,
      );
    }

    console.log(
      `[API] Successfully submitted feedback for interview ${interviewId}`,
    );
  }

  async getContext(interviewId: string): Promise<InterviewContext> {
    const url = `${this.apiUrl}/api/trpc/interview.getContext?batch=1&input=${encodeURIComponent(
      JSON.stringify({ "0": { json: { interviewId } } }),
    )}`;

    console.log(
      `[API] Calling getContext for interview ${interviewId}: ${url}`,
    );

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.workerSecret}`,
        },
      });
    } catch (error) {
      console.error(`[API] Network error calling getContext:`, error);
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const jsonResponse: any = await response.json();
    const result = jsonResponse[0];

    if (result.error) {
      throw new Error(
        `tRPC error: ${result.error.json?.message || "Unknown error"}`,
      );
    }

    // Handle superjson response format - data is wrapped in json property
    const data = result.result.data.json ?? result.result.data;
    console.log(`[API] getContext returning:`, JSON.stringify(data));
    return data;
  }
}
