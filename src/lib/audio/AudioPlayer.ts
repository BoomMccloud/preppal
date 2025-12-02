export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sampleRate: number;

  constructor(sampleRate = 16000) {
    this.sampleRate = sampleRate;
  }

  public async start() {
    if (this.audioContext) return;

    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });

    // The worklet file must be served publicly.
    await this.audioContext.audioWorklet.addModule(
      "/audio-player-processor.js",
    );

    this.workletNode = new AudioWorkletNode(
      this.audioContext,
      "audio-player-processor",
    );
    this.workletNode.connect(this.audioContext.destination);
  }

  public stop() {
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
      this.workletNode = null;
    }
  }

  // Receives a raw 16-bit PCM ArrayBuffer from the WebSocket.
  public enqueue(pcm16ArrayBuffer: ArrayBuffer) {
    if (!this.workletNode) return;

    // 1. Convert the 16-bit PCM data into the Float32 format the Web Audio API needs.
    const pcm16 = new Int16Array(pcm16ArrayBuffer);
    const pcm32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      pcm32[i] = pcm16[i]! / 32768.0; // Convert to -1.0 to 1.0 range
    }

    // 2. Post the Float32Array to the worklet.
    // The second argument makes this a "zero-copy" transfer for high performance.
    this.workletNode.port.postMessage(pcm32, [pcm32.buffer]);
  }
}
