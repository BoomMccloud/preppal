/**
 * AudioSession - Unified controller for audio input (microphone) and output (speaker).
 *
 * Manages the lifecycle of both AudioRecorder and AudioPlayer as a single unit,
 * ensuring they are started and stopped together.
 */
import { AudioPlayer } from "./AudioPlayer";
import { AudioRecorder } from "./AudioRecorder";

export class AudioSession {
  private recorder: AudioRecorder | null = null;
  private player: AudioPlayer | null = null;
  private isStarted = false;

  /**
   * Callback invoked when AI playback state changes (speaking/not speaking).
   */
  onPlaybackStateChange: (isPlaying: boolean) => void = () => {
    /* No-op by default */
  };

  /**
   * Starts both audio recording (microphone) and playback (speaker).
   *
   * @param onAudioData - Callback receiving recorded audio chunks (16kHz PCM)
   * @throws Error if microphone permission denied or audio setup fails
   */
  async start(onAudioData: (chunk: ArrayBuffer) => void): Promise<void> {
    if (this.isStarted) {
      console.warn("[AudioSession] Already started, ignoring duplicate start");
      return;
    }

    console.log("[AudioSession] Starting...");

    // Start player first (less likely to fail)
    this.player = new AudioPlayer(24000);
    this.player.onPlaybackStateChange = (isPlaying) => {
      this.onPlaybackStateChange(isPlaying);
    };
    await this.player.start();
    console.log("[AudioSession] AudioPlayer started");

    // Start recorder (may prompt for microphone permission)
    this.recorder = new AudioRecorder();
    await this.recorder.start(onAudioData);
    console.log("[AudioSession] AudioRecorder started");

    this.isStarted = true;
    console.log("[AudioSession] Fully started");
  }

  /**
   * Stops both recording and playback, releasing all resources.
   * Safe to call multiple times.
   */
  stop(): void {
    if (!this.isStarted && !this.recorder && !this.player) {
      return; // Nothing to stop
    }

    console.log("[AudioSession] Stopping...");

    this.recorder?.stop();
    this.recorder = null;

    this.player?.stop();
    this.player = null;

    this.isStarted = false;
    console.log("[AudioSession] Stopped");
  }

  /**
   * Enqueues audio data for playback.
   *
   * @param pcmData - Raw 16-bit PCM audio data
   */
  enqueueAudio(pcmData: Uint8Array): void {
    if (this.player) {
      void this.player.enqueue(pcmData);
    }
  }

  /**
   * Clears the audio playback queue (used for barge-in).
   */
  clearPlaybackQueue(): void {
    this.player?.clear();
  }
}
