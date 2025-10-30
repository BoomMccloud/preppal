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
    if (input.length > 0) {
      const audioData = input[0]; // This is a Float32Array

      // Downsample by taking every Nth sample.
      const ratio = this.nativeSampleRate / this.targetSampleRate;
      const downsampled = new Float32Array(Math.floor(audioData.length / ratio));
      for (let i = 0, j = 0; j < downsampled.length; i += ratio, j++) {
        downsampled[j] = audioData[Math.floor(i)];
      }

      // Convert from Float32 (-1.0 to 1.0) to 16-bit PCM (-32768 to 32767)
      const pcm16 = new Int16Array(downsampled.length);
      for (let i = 0; i < downsampled.length; i++) {
        pcm16[i] = downsampled[i] * 32767;
      }

      // Post the raw buffer back to the main thread
      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }
    return true; // Keep processor alive
  }
}

registerProcessor('resampling-processor', ResamplingProcessor);