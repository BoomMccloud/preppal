// ABOUTME: This client encapsulates the logic for a raw audio WebSocket connection,
// handling audio recording, playback, and protobuf message serialization.
// It's designed to be used by a React hook for testing the audio pipeline.

import { AudioPlayer } from "./AudioPlayer";
import { AudioRecorder } from "./AudioRecorder";
import { preppal } from "../interview_pb.js";

type ConnectionState = "disconnected" | "connecting" | "connected";
type TranscriptUpdate = preppal.ITranscriptUpdate;

interface RawClientCallbacks {
  onConnectionStateChange?: (state: ConnectionState) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onSpeakingStateChange?: (isSpeaking: boolean) => void;
  onTranscriptUpdate?: (transcript: TranscriptUpdate) => void;
  onError?: (error: string) => void;
  onDebugInfo?: (info: {
    connectAttempts: number;
    activeConnections: number;
  }) => void;
}

export class RawAudioClient {
  private ws: WebSocket | null = null;
  private player: AudioPlayer;
  private recorder: AudioRecorder;
  private callbacks: RawClientCallbacks;
  private connectAttempts = 0;
  private activeConnections = 0;

  constructor(callbacks: RawClientCallbacks = {}) {
    this.callbacks = callbacks;
    this.player = new AudioPlayer(24000);
    this.recorder = new AudioRecorder();

    this.player.onPlaybackStateChange = (isSpeaking) => {
      this.callbacks.onSpeakingStateChange?.(isSpeaking);
    };
  }

  private updateDebugInfo() {
    this.callbacks.onDebugInfo?.({
      connectAttempts: this.connectAttempts,
      activeConnections: this.activeConnections,
    });
  }

  async connect(url: string) {
    this.connectAttempts++;
    this.updateDebugInfo();
    this.callbacks.onConnectionStateChange?.("connecting");

    try {
      await this.player.start();
      await this.player.resume();
    } catch (err) {
      console.error("Failed to initialize audio player", err);
      this.callbacks.onError?.("Failed to initialize audio player.");
      this.callbacks.onConnectionStateChange?.("disconnected");
      return;
    }

    this.ws = new WebSocket(url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = async () => {
      this.activeConnections++;
      this.updateDebugInfo();
      console.log(
        `Raw WebSocket connected. (Active: ${this.activeConnections})`,
      );
      this.callbacks.onConnectionStateChange?.("connected");
      try {
        await this.recorder.start(this.handleAudioData);
        this.callbacks.onRecordingStateChange?.(true);
      } catch (err) {
        console.error("Failed to start recording", err);
        this.callbacks.onError?.("Failed to start microphone.");
        this.disconnect();
      }
    };

    this.ws.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        this.handleServerMessage(event.data);
      }
    };

    this.ws.onerror = (err) => {
      console.error("Raw WebSocket error:", err);
      this.callbacks.onError?.("WebSocket connection error.");
      void this.cleanup();
    };

    this.ws.onclose = () => {
      this.activeConnections = Math.max(0, this.activeConnections - 1);
      this.updateDebugInfo();
      console.log(
        `Raw WebSocket disconnected. (Active: ${this.activeConnections})`,
      );
      void this.cleanup();
    };
  }

  disconnect() {
    this.ws?.close(1000, "User disconnected");
    void this.cleanup();
  }

  private cleanup = async () => {
    await this.recorder.stop();
    this.callbacks.onRecordingStateChange?.(false);
    this.player.stop();
    this.ws = null;
    this.callbacks.onConnectionStateChange?.("disconnected");
  };

  private handleAudioData = (chunk: ArrayBuffer) => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = preppal.ClientToServerMessage.create({
        audioChunk: { audioContent: new Uint8Array(chunk) },
      });
      const encodedMessage =
        preppal.ClientToServerMessage.encode(message).finish();
      this.ws.send(encodedMessage);
    }
  };

  private handleServerMessage = (data: ArrayBuffer) => {
    if (data instanceof ArrayBuffer) {
      const message = preppal.ServerToClientMessage.decode(
        new Uint8Array(data),
      );

      if (
        message.audioResponse?.audioContent &&
        message.audioResponse.audioContent.length > 0
      ) {
        void this.player.enqueue(message.audioResponse.audioContent);
      } else if (message.transcriptUpdate) {
        this.callbacks.onTranscriptUpdate?.(message.transcriptUpdate);
      }
    } else {
      console.log("Received text message:", data);
    }
  };
}
