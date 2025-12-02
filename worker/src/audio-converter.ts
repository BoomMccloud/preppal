// ABOUTME: Audio format conversion utilities for WebSocket audio streaming
// ABOUTME: Converts between binary PCM (Uint8Array) and base64-encoded strings for Gemini Live API

/**
 * Utility class for converting audio between binary and base64 formats
 */
export class AudioConverter {
  /**
   * Convert binary audio (Uint8Array) to base64 string for Gemini
   */
  static binaryToBase64(audioData: Uint8Array): string {
    if (audioData.length === 0) {
      return "";
    }

    // Convert Uint8Array to binary string
    let binaryString = "";
    for (let i = 0; i < audioData.length; i++) {
      binaryString += String.fromCharCode(audioData[i]);
    }

    // Encode to base64
    return btoa(binaryString);
  }

  /**
   * Convert base64 audio string from Gemini to binary (Uint8Array)
   */
  static base64ToBinary(base64Audio: string): Uint8Array {
    if (base64Audio.length === 0) {
      return new Uint8Array([]);
    }

    // Decode from base64 to binary string
    const binaryString = atob(base64Audio);

    // Convert binary string to Uint8Array
    const audioData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      audioData[i] = binaryString.charCodeAt(i);
    }

    return audioData;
  }
}
