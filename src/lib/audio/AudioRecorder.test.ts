import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { AudioRecorder } from "./AudioRecorder";

// Mock browser APIs
const mockGetUserMedia = vi.fn();
const mockAudioContext = {
  close: vi.fn(),
  audioWorklet: {
    addModule: vi.fn(),
  },
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
  })),
  sampleRate: 48000,
};

describe("AudioRecorder", () => {
  let audioRecorder: AudioRecorder;

  beforeEach(() => {
    audioRecorder = new AudioRecorder();

    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, "mediaDevices", {
      writable: true,
      value: {
        getUserMedia: mockGetUserMedia,
      },
    });

    // Mock AudioContext
    Object.defineProperty(window, "AudioContext", {
      writable: true,
      value: vi.fn(() => mockAudioContext),
    });

    // Mock AudioWorkletNode
    Object.defineProperty(window, "AudioWorkletNode", {
      writable: true,
      value: vi.fn(() => ({
        port: {
          onmessage: null,
          postMessage: vi.fn(),
        },
        connect: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("start", () => {
    it("should request microphone permissions", async () => {
      const mockStream = { getTracks: () => [] };
      mockGetUserMedia.mockResolvedValue(mockStream);

      const onAudioData = vi.fn();
      await audioRecorder.start(onAudioData);

      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    it("should initialize AudioContext with correct parameters", async () => {
      const mockStream = { getTracks: () => [] };
      mockGetUserMedia.mockResolvedValue(mockStream);

      const onAudioData = vi.fn();
      await audioRecorder.start(onAudioData);

      expect(window.AudioContext).toHaveBeenCalledWith();
    });

    it("should add audio worklet module", async () => {
      const mockStream = { getTracks: () => [] };
      mockGetUserMedia.mockResolvedValue(mockStream);
      mockAudioContext.audioWorklet.addModule.mockResolvedValue(undefined);

      const onAudioData = vi.fn();
      await audioRecorder.start(onAudioData);

      expect(mockAudioContext.audioWorklet.addModule).toHaveBeenCalledWith(
        "/audio-processor.js",
      );
    });
  });

  describe("stop", () => {
    it("should stop all media tracks and close audio context", async () => {
      const mockTrack = { stop: vi.fn() };
      const mockStream = { getTracks: () => [mockTrack] };
      mockGetUserMedia.mockResolvedValue(mockStream);

      const onAudioData = vi.fn();
      await audioRecorder.start(onAudioData);

      audioRecorder.stop();

      expect(mockTrack.stop).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });
  });

  describe("permission handling", () => {
    it("should handle permission denial", async () => {
      mockGetUserMedia.mockRejectedValue(new Error("Permission denied"));

      const onAudioData = vi.fn();

      await expect(audioRecorder.start(onAudioData)).rejects.toThrow(
        "Permission denied",
      );
    });
  });
});
