/**
 * AudioRecorder - Handles microphone capture with cancellation support via AbortSignal.
 *
 * Uses the web standard AbortSignal API for cancellable async operations, ensuring
 * proper cleanup of MediaStream and AudioContext resources even when cancelled
 * mid-initialization (e.g., user navigates away during getUserMedia prompt).
 */
export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;

  /**
   * Starts audio recording with cancellation support.
   *
   * @param onAudioData - Callback receiving resampled audio chunks (16kHz PCM)
   * @param signal - AbortSignal for cancellation. When aborted, all resources are cleaned up.
   * @throws AbortError if cancelled during initialization (handled gracefully)
   * @throws Error for other failures (e.g., permission denied)
   */
  async start(
    onAudioData: (chunk: ArrayBuffer) => void,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      signal.throwIfAborted();

      this.stream = stream;
      this.audioContext = new AudioContext();

      // IMPORTANT: The worklet file must be served publicly
      await this.audioContext.audioWorklet.addModule("/audio-processor.js");
      signal.throwIfAborted();

      const source = this.audioContext.createMediaStreamSource(this.stream);

      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        "resampling-processor",
        {
          processorOptions: {
            nativeSampleRate: this.audioContext.sampleRate, // The browser's native sample rate
            targetSampleRate: 16000, // Our target
          },
        },
      );

      // The worklet will post messages (audio chunks) back to us
      this.workletNode.port.onmessage = (event: MessageEvent) => {
        onAudioData(event.data as ArrayBuffer); // event.data is the ArrayBuffer
      };

      source.connect(this.workletNode);
      // We don't connect to the destination, to avoid the user hearing themselves.
    } catch (error) {
      this.cleanup();
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("AudioRecorder: Aborted during initialization");
        return;
      }
      console.error("Failed to start audio recording:", error);
      throw error;
    }
  }

  /**
   * Cleans up all audio resources (stream tracks, worklet node, audio context).
   * Safe to call multiple times.
   */
  private cleanup(): void {
    this.workletNode?.disconnect();
    this.workletNode = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    void this.audioContext?.close();
    this.audioContext = null;
  }

  /**
   * Returns the current MediaStream, or null if not recording.
   */
  getStream(): MediaStream | null {
    return this.stream;
  }
}
