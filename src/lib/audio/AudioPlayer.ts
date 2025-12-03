export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private queue: AudioBuffer[] = [];
  private isPlaying = false;
  private sampleRate: number;

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

  public stop() {
    console.log("Stopping audio player...");
    this.isPlaying = false;
    this.queue = [];
    if (this.audioContext) {
      void this.audioContext.close().then(() => {
        this.audioContext = null;
      });
    }
  }

  // Receives a raw 16-bit PCM ArrayBuffer and adds it to the queue.
  public async enqueue(pcm16ArrayBuffer: ArrayBuffer) {
    if (!this.audioContext) return;

    // 1. Convert the 16-bit PCM data into the Float32 format the Web Audio API needs.
    const pcm16 = new Int16Array(pcm16ArrayBuffer);
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

    source.onended = () => {
      // When this buffer finishes, play the next one.
      void this.playNextInQueue();
    };
  }
}
