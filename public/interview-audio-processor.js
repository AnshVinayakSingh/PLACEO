class PlaceoInterviewAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = new Float32Array(2048)
    this.offset = 0
  }

  process(inputs) {
    const channel = inputs[0]?.[0]
    if (!channel?.length) return true

    let sourceOffset = 0
    while (sourceOffset < channel.length) {
      const copyLength = Math.min(channel.length - sourceOffset, this.buffer.length - this.offset)
      this.buffer.set(channel.subarray(sourceOffset, sourceOffset + copyLength), this.offset)
      this.offset += copyLength
      sourceOffset += copyLength

      if (this.offset === this.buffer.length) {
        this.port.postMessage(this.buffer.slice(0))
        this.offset = 0
      }
    }
    return true
  }
}

registerProcessor('placeo-interview-audio-processor', PlaceoInterviewAudioProcessor)
