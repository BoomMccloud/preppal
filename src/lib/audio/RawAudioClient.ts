// ABOUTME: This client encapsulates the logic for a raw audio WebSocket connection,
// handling audio recording, playback, and protobuf message serialization.
// It's designed to be used by a React hook for testing the audio pipeline.

import { AudioPlayer } from "./AudioPlayer";
import { AudioRecorder } from "./AudioRecorder";
import { preppal } from "../interview_pb.js";

type ConnectionState = "disconnected" | "connecting" | "connected";

interface RawClientCallbacks {
  onConnectionStateChange?: (state: ConnectionState) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onSpeakingStateChange?: (isSpeaking: boolean) => void;
  onError?: (error: string) => void;
}

export class RawAudioClient {
  private ws: WebSocket | null = null;
  private player: AudioPlayer;
  private recorder: AudioRecorder;
  private callbacks: RawClientCallbacks;

  constructor(callbacks: RawClientCallbacks = {}) {
    this.callbacks = callbacks;
    this.player = new AudioPlayer(24000);
    this.recorder = new AudioRecorder();

    this.player.onPlaybackStateChange = (isSpeaking) => {
      this.callbacks.onSpeakingStateChange?.(isSpeaking);
    };
  }

  async connect(url: string) {
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
      console.log("Raw WebSocket connected.");
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
      this.handleServerMessage(event.data);
    };

    this.ws.onerror = (err) => {
      console.error("Raw WebSocket error:", err);
      this.callbacks.onError?.("WebSocket connection error.");
      this.cleanup();
    };

    this.ws.onclose = () => {
      console.log("Raw WebSocket disconnected.");
      this.cleanup();
    };
  }

  disconnect() {
    this.ws?.close(1000, "User disconnected");
    this.cleanup();
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
      const message = preppal.ServerToClientMessage.decode(new Uint8Array(data));

      if (message.audioResponse?.audioContent) {
        void this.player.enqueue(message.audioResponse.audioContent);
      } else if (message.transcriptUpdate) {
        const transcript = message.transcriptUpdate;
        console.log(
          `Received transcript: [${transcript?.speaker}] ${transcript?.text}`,
        );
      }
    } else {
      console.log("Received text message:", data);
    }
  };
}
