export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;

  async start(onAudioData: (chunk: ArrayBuffer) => void) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      console.error("Failed to start audio recording:", error);
      throw error;
    }
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  async stop() {
    console.log("Stopping audio recorder...");
    if (this.workletNode) {
      this.workletNode.disconnect();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        track.stop();
      });
      this.stream = null;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}
