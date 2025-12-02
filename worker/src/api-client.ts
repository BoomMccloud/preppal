// ABOUTME: API client for communicating with Next.js backend tRPC endpoints
// ABOUTME: Handles interview status updates and transcript submission with authentication

export interface TranscriptEntry {
  speaker: 'USER' | 'AI';
  content: string;
  timestamp: string; // ISO 8601
}

export class ApiClient {
  constructor(
    private apiUrl: string,
    private workerSecret: string
  ) {}

  async updateStatus(interviewId: string, status: string): Promise<void> {
    const url = `${this.apiUrl}/api/trpc/interview.updateStatus`;

    console.log(`[API] Calling updateStatus: ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.workerSecret}`,
      },
      body: JSON.stringify({
        interviewId,
        status,
      }),
    });

    console.log(`[API] updateStatus response: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      throw new Error(`Failed to update status: ${response.status} ${response.statusText}`);
    }
  }

  async submitTranscript(
    interviewId: string,
    transcript: TranscriptEntry[],
    endedAt: string
  ): Promise<void> {
    const url = `${this.apiUrl}/api/trpc/interview.submitTranscript`;

    console.log(`[API] Calling submitTranscript: ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.workerSecret}`,
      },
      body: JSON.stringify({
        interviewId,
        transcript,
        endedAt,
      }),
    });

    console.log(`[API] submitTranscript response: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      throw new Error(`Failed to submit transcript: ${response.status} ${response.statusText}`);
    }
  }
}
