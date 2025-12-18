// ABOUTME: Audio format conversion utilities for WebSocket audio streaming
// ABOUTME: Converts between binary PCM (Uint8Array) and base64-encoded strings for Gemini Live API

import type { IAudioConverter } from "./interfaces/index.js";

/**
 * Service for converting audio between binary and base64 formats
 */
export class AudioConverter implements IAudioConverter {
  /**
   * Convert binary audio (Uint8Array) to base64 string for Gemini
   */
  binaryToBase64(binary: Uint8Array): string {
    if (binary.length === 0) {
      return "";
    }

    // Convert Uint8Array to binary string
    let binaryString = "";
    for (let i = 0; i < binary.length; i++) {
      binaryString += String.fromCharCode(binary[i]);
    }

    // Encode to base64
    return btoa(binaryString);
  }

  /**
   * Convert base64 audio string from Gemini to binary (Uint8Array)
   */
  base64ToBinary(base64: string): Uint8Array {
    if (base64.length === 0) {
      return new Uint8Array([]);
    }

    // Decode from base64 to binary string
    const binaryString = atob(base64);

    // Convert binary string to Uint8Array
    const audioData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      audioData[i] = binaryString.charCodeAt(i);
    }

    return audioData;
  }
}
