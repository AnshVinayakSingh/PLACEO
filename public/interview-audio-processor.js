class PlaceoInterviewAudioProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]
    const channel = input && input[0]
    if (channel && channel.length) {
      this.port.postMessage(channel.slice(0))
    }
    return true
  }
}

registerProcessor('placeo-interview-audio-processor', PlaceoInterviewAudioProcessor)
