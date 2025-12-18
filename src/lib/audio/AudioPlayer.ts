export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private isPlaying = false;
  private sampleRate: number;
  public onPlaybackStateChange: (isPlaying: boolean) => void = () => {};
  private leftoverBuffer: Uint8Array | null = null;
  private nextPlayTime = 0; // Time at which the next buffer should start playing
  private sources = new Set<AudioBufferSourceNode>();

  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
  }

  public async start() {
    if (this.audioContext) return;
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    this.nextPlayTime = this.audioContext.currentTime; // Initialize play time
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
    if (this.isPlaying) {
      this.isPlaying = false;
      this.onPlaybackStateChange(false);
    }
  }

  public clear() {
    // Stop all scheduled and playing sources
    for (const source of this.sources) {
      source.stop();
    }
    this.sources.clear();

    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
    if (this.isPlaying) {
      this.isPlaying = false;
      this.onPlaybackStateChange(false);
    }
  }

  // Receives raw 16-bit PCM data as a Uint8Array and adds it to the queue.
  public async enqueue(pcm16Data: Uint8Array) {
    if (!this.audioContext) return;
    if (pcm16Data.length === 0) return; // Skip empty buffers

    // 0. Resume context if needed
    await this.resume();

    let dataToProcess: Uint8Array;

    // 1. Prepend any leftover bytes from the previous chunk
    if (this.leftoverBuffer) {
      dataToProcess = new Uint8Array(
        this.leftoverBuffer.length + pcm16Data.length,
      );
      dataToProcess.set(this.leftoverBuffer, 0);
      dataToProcess.set(pcm16Data, this.leftoverBuffer.length);
      this.leftoverBuffer = null;
    } else {
      dataToProcess = pcm16Data;
    }

    // 2. Check for alignment, save leftover byte if necessary
    const remainder = dataToProcess.length % 2;
    if (remainder > 0) {
      this.leftoverBuffer = dataToProcess.slice(-remainder);
      dataToProcess = dataToProcess.slice(0, dataToProcess.length - remainder);
    }

    if (dataToProcess.length === 0) {
      return; // Nothing to process yet
    }

    // 3. Convert the now-aligned 16-bit PCM data into Float32
    const pcm16 = new Int16Array(
      dataToProcess.buffer,
      dataToProcess.byteOffset,
      dataToProcess.byteLength / 2,
    );
    const pcm32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      pcm32[i] = pcm16[i]! / 32768.0; // Convert to -1.0 to 1.0 range
    }

    // 4. Create an AudioBuffer.
    const buffer = this.audioContext.createBuffer(
      1,
      pcm32.length,
      this.audioContext.sampleRate,
    );
    buffer.copyToChannel(pcm32, 0);

    // 5. Schedule the buffer for playback, using the robust timing logic
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    // THE KEY: Ensure playback doesn't lag behind the current time
    this.nextPlayTime = Math.max(
      this.nextPlayTime,
      this.audioContext.currentTime,
    );

    source.start(this.nextPlayTime);
    this.sources.add(source);

    // When the source finishes, remove it from our set of active sources
    source.onended = () => {
      this.sources.delete(source);
      // If this was the last source, we are no longer playing.
      if (this.sources.size === 0 && this.isPlaying) {
        this.isPlaying = false;
        this.onPlaybackStateChange(false);
      }
    };

    // Update the time for the next buffer
    this.nextPlayTime += buffer.duration;

    // 6. Update playback state
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.onPlaybackStateChange(true);
    }
  }
}
