export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private queue: AudioBuffer[] = [];
  private isPlaying = false;
  private sampleRate: number;
  private currentSource: AudioBufferSourceNode | null = null;

  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
  }

  public async start() {
    if (this.audioContext) return;
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    console.log(
      `[AudioPlayer] Started AudioContext. State: ${this.audioContext.state}, SampleRate: ${this.sampleRate}`,
    );
  }

  public async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
      console.log(
        `[AudioPlayer] AudioContext resumed. State: ${this.audioContext.state}`,
      );
    }
  }

  public stop() {
    console.log("Stopping audio player...");
    this.clear();
    if (this.audioContext) {
      void this.audioContext.close().then(() => {
        this.audioContext = null;
      });
    }
  }

  public clear() {
    if (this.currentSource) {
      this.currentSource.onended = null; // Prevent the loop from continuing
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.queue = [];
    this.isPlaying = false;
  }

  // Receives raw 16-bit PCM data as a Uint8Array and adds it to the queue.
  public async enqueue(pcm16Data: Uint8Array) {
    if (!this.audioContext) return;

    // 1. Convert the 16-bit PCM data into the Float32 format the Web Audio API needs.
    // The data is coming in as a byte stream (Uint8Array), and needs to be interpreted as 16-bit PCM.
    const pcm16 = new Int16Array(
      pcm16Data.buffer,
      pcm16Data.byteOffset,
      pcm16Data.byteLength / 2,
    );
    const pcm32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      pcm32[i] = pcm16[i]! / 32768.0; // Convert to -1.0 to 1.0 range
    }

    // 2. Create an AudioBuffer.
    const buffer = this.audioContext.createBuffer(
      1,
      pcm32.length,
      this.audioContext.sampleRate,
    );
    buffer.copyToChannel(pcm32, 0);

    // 3. Add to queue and start playback loop if not already started.
    this.queue.push(buffer);
    if (!this.isPlaying) {
      void this.playNextInQueue();
    }
  }

  private async playNextInQueue() {
    if (this.queue.length === 0 || !this.audioContext) {
      this.isPlaying = false;
      this.currentSource = null;
      return;
    }

    this.isPlaying = true;

    // Resume context if it's suspended (e.g., due to browser policy)
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    const buffer = this.queue.shift();
    if (!buffer) {
      this.isPlaying = false;
      return;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start();
    this.currentSource = source;

    source.onended = () => {
      // When this buffer finishes, play the next one.
      void this.playNextInQueue();
    };
  }
}
