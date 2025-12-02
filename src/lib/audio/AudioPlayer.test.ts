import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { AudioPlayer } from "./AudioPlayer";

// Mock browser APIs
const mockAudioContext = {
  close: vi.fn(),
  audioWorklet: {
    addModule: vi.fn(),
  },
  destination: {},
  sampleRate: 16000,
};

describe("AudioPlayer", () => {
  let audioPlayer: AudioPlayer;

  beforeEach(() => {
    audioPlayer = new AudioPlayer();

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
    it("should initialize AudioContext with correct sample rate", async () => {
      await audioPlayer.start();

      expect(window.AudioContext).toHaveBeenCalledWith({ sampleRate: 16000 });
    });

    it("should add audio player worklet module", async () => {
      mockAudioContext.audioWorklet.addModule.mockResolvedValue(undefined);

      await audioPlayer.start();

      expect(mockAudioContext.audioWorklet.addModule).toHaveBeenCalledWith(
        "/audio-player-processor.js",
      );
    });

    it("should connect worklet node to audio destination", async () => {
      const mockConnect = vi.fn();
      Object.defineProperty(window, "AudioWorkletNode", {
        writable: true,
        value: vi.fn(() => ({
          port: {
            onmessage: null,
            postMessage: vi.fn(),
          },
          connect: mockConnect,
        })),
      });

      await audioPlayer.start();

      expect(mockConnect).toHaveBeenCalledWith(mockAudioContext.destination);
    });
  });

  describe("stop", () => {
    it("should close audio context", async () => {
      await audioPlayer.start();
      audioPlayer.stop();

      expect(mockAudioContext.close).toHaveBeenCalled();
    });
  });

  describe("enqueue", () => {
    it("should convert PCM16 to PCM32 and post to worklet", async () => {
      const mockPostMessage = vi.fn();
      Object.defineProperty(window, "AudioWorkletNode", {
        writable: true,
        value: vi.fn(() => ({
          port: {
            onmessage: null,
            postMessage: mockPostMessage,
          },
          connect: vi.fn(),
        })),
      });

      await audioPlayer.start();

      // Create a mock PCM16 buffer
      const pcm16Data = new Int16Array([1000, 2000, 3000]);
      const buffer = pcm16Data.buffer;

      audioPlayer.enqueue(buffer);

      expect(mockPostMessage).toHaveBeenCalled();
      // Verify that the posted data is a Float32Array
      const callArgs = mockPostMessage.mock.calls[0];
      expect(callArgs?.[0]).toBeInstanceOf(Float32Array);
      // Verify transferable buffer was used
      expect(callArgs?.[1]).toEqual([callArgs?.[0].buffer]);
    });

    it("should not process if worklet node is not initialized", () => {
      const mockPostMessage = vi.fn();
      Object.defineProperty(window, "AudioWorkletNode", {
        writable: true,
        value: vi.fn(() => ({
          port: {
            onmessage: null,
            postMessage: mockPostMessage,
          },
          connect: vi.fn(),
        })),
      });

      // Don't start the player, so workletNode remains null
      const buffer = new ArrayBuffer(10);
      audioPlayer.enqueue(buffer);

      expect(mockPostMessage).not.toHaveBeenCalled();
    });
  });
});
