class ResamplingProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    // The sample rates are passed from the main thread.
    this.nativeSampleRate = options.processorOptions.nativeSampleRate;
    this.targetSampleRate = options.processorOptions.targetSampleRate;
    this.inputBuffer = [];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    // Mix down to mono
    let monoInput = input[0];
    if (input.length > 1) {
      monoInput = new Float32Array(input[0].length);
      for (let i = 0; i < input[0].length; i++) {
        let sum = 0;
        for (let channel = 0; channel < input.length; channel++) {
          sum += input[channel][i];
        }
        monoInput[i] = sum / input.length;
      }
    }

    const audioData = monoInput;

    // Downsample by taking every Nth sample.
    const ratio = this.nativeSampleRate / this.targetSampleRate;
    const outputLength = Math.floor(audioData.length / ratio);
    
    // Safety check
    if (outputLength === 0) return true;
    
    const downsampled = new Float32Array(outputLength);
    for (let i = 0, j = 0; j < downsampled.length; i += ratio, j++) {
      // Use linear interpolation for better quality? Or simple nearest neighbor?
      // Simple nearest neighbor for performance as per original code, but with safer indexing
      const index = Math.floor(i);
      if (index < audioData.length) {
        downsampled[j] = audioData[index];
      }
    }

    // Convert from Float32 (-1.0 to 1.0) to 16-bit PCM (-32768 to 32767)
    const pcm16 = new Int16Array(downsampled.length);
    for (let i = 0; i < downsampled.length; i++) {
      // Clamp values to avoid overflow distortion
      const val = Math.max(-1, Math.min(1, downsampled[i]));
      pcm16[i] = val < 0 ? val * 32768 : val * 32767;
    }

    // Post the raw buffer back to the main thread
    this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    return true; // Keep processor alive
  }
}

registerProcessor("resampling-processor", ResamplingProcessor);
