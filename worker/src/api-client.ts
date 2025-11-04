// ABOUTME: API client for communicating with Next.js backend tRPC endpoints
// ABOUTME: Handles interview status updates and transcript submission with authentication

export class ApiClient {
  constructor(
    private apiUrl: string,
    private workerSecret: string
  ) {}

  async updateStatus(interviewId: string, status: string): Promise<void> {
    const url = `${this.apiUrl}/api/trpc/interview.updateStatus`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': this.workerSecret,
      },
      body: JSON.stringify({
        interviewId,
        status,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update status: ${response.status} ${response.statusText}`);
    }
  }

  async submitTranscript(interviewId: string, transcript: string): Promise<void> {
    const url = `${this.apiUrl}/api/trpc/interview.submitTranscript`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': this.workerSecret,
      },
      body: JSON.stringify({
        interviewId,
        transcript,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit transcript: ${response.status} ${response.statusText}`);
    }
  }
}
