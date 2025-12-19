/**
 * AudioRecorder - Handles microphone capture for audio streaming.
 *
 * Captures audio from the microphone, resamples to 16kHz, and delivers
 * PCM chunks via callback. Call stop() to release resources.
 */
export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;

  /**
   * Starts audio recording.
   *
   * @param onAudioData - Callback receiving resampled audio chunks (16kHz PCM)
   * @throws Error if microphone permission denied or audio setup fails
   */
  async start(onAudioData: (chunk: ArrayBuffer) => void): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.stream = stream;
      this.audioContext = new AudioContext();

      // IMPORTANT: The worklet file must be served publicly
      await this.audioContext.audioWorklet.addModule("/audio-processor.js");

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
      this.stop();
      console.error("Failed to start audio recording:", error);
      throw error;
    }
  }

  /**
   * Stops recording and releases all audio resources.
   * Safe to call multiple times.
   */
  stop(): void {
    console.log("[AudioRecorder] Stopping...");
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
