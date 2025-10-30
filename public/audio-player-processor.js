class AudioPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // A buffer to hold all incoming audio chunks.
    this.chunks = [];
    // An offset to track our position within the first chunk in the queue.
    this.chunkOffset = 0;

    // Listen for chunks sent from the main thread.
    this.port.onmessage = (event) => {
      const chunk = event.data; // This is a Float32Array
      this.chunks.push(chunk);
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0];

    let samplesWritten = 0;
    // Keep writing samples until the output channel is full.
    while (samplesWritten < channel.length) {
      if (this.chunks.length === 0) {
        // No more data to play; fill the rest with silence.
        for (let i = samplesWritten; i < channel.length; i++) {
          channel[i] = 0;
        }
        break; // Exit the while loop
      }

      // Get the current chunk we're reading from.
      const currentChunk = this.chunks[0];
      const remainingInChunk = currentChunk.length - this.chunkOffset;
      const toWrite = Math.min(channel.length - samplesWritten, remainingInChunk);

      // Copy the data from our chunk to the output buffer.
      for (let i = 0; i < toWrite; i++) {
        channel[samplesWritten + i] = currentChunk[this.chunkOffset + i];
      }

      this.chunkOffset += toWrite;
      samplesWritten += toWrite;

      // If we've finished reading the current chunk, discard it.
      if (this.chunkOffset >= currentChunk.length) {
        this.chunks.shift();
        this.chunkOffset = 0;
      }
    }

    // Return true to keep the processor alive.
    return true;
  }
}

registerProcessor('audio-player-processor', AudioPlayerProcessor);