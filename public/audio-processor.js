class ResamplingProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.nativeSampleRate = options.processorOptions.nativeSampleRate;
    this.targetSampleRate = options.processorOptions.targetSampleRate;
    this.resamplingRatio = this.nativeSampleRate / this.targetSampleRate;
    this.buffer = new Float32Array(this.nativeSampleRate * 5); // 5 seconds of buffer
    this.bufferOffset = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }

    // 1. Mix down to mono and add to buffer
    const monoInput = new Float32Array(input[0].length);
    for (let i = 0; i < input[0].length; i++) {
      let sum = 0;
      for (let channel = 0; channel < input.length; channel++) {
        sum += input[channel][i];
      }
      monoInput[i] = sum / input.length;
    }

    // Check if buffer has enough space
    if (this.bufferOffset + monoInput.length > this.buffer.length) {
      console.error("Audio buffer overflow");
      return true;
    }
    this.buffer.set(monoInput, this.bufferOffset);
    this.bufferOffset += monoInput.length;

    // 2. Resample and send chunks
    const outputSamples = [];
    let lastSampleIndex = 0;

    for (let i = 0; i < this.bufferOffset - 1; i += this.resamplingRatio) {
      const index = Math.floor(i);
      const fraction = i - index;

      const sample1 = this.buffer[index];
      const sample2 = this.buffer[index + 1];

      // Linear interpolation
      const interpolatedSample = sample1 + (sample2 - sample1) * fraction;
      outputSamples.push(interpolatedSample);

      lastSampleIndex = index + 1;
    }

    if (outputSamples.length > 0) {
      // Convert to 16-bit PCM
      const pcm16 = new Int16Array(outputSamples.length);
      for (let i = 0; i < outputSamples.length; i++) {
        const s = Math.max(-1, Math.min(1, outputSamples[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }

    // 3. Shift the remaining buffer
    const remaining = this.buffer.slice(lastSampleIndex, this.bufferOffset);
    this.buffer.fill(0);
    this.buffer.set(remaining, 0);
    this.bufferOffset = remaining.length;

    return true; // Keep the processor alive
  }
}

registerProcessor("resampling-processor", ResamplingProcessor);
