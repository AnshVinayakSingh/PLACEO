export type ProctorSignalName =
  | 'no-face'
  | 'multiple-faces'
  | 'looking-down'
  | 'looking-away'
  | 'prohibited-object'
  | 'tab-hidden'
  | 'fullscreen-exit'
  | 'camera-ended'
  | 'microphone-ended'

export type ProctorSignal = {
  name: ProctorSignalName
  confidence: number
  at: number
  durationMs?: number
}

/**
 * Temporal fusion for browser proctoring. It deliberately does not turn one
 * noisy frame into a violation. The caller decides the policy for each class
 * of event (for example, object/person = 1 warning then disqualify; gaze = 3
 * confirmed breaks per warning).
 */
export class TemporalProctorFusion {
  private active: ProctorSignal[] = []
  private readonly windowMs: number

  constructor(windowMs = 8500) {
    this.windowMs = windowMs
  }

  push(signal: ProctorSignal) {
    const confidence = Math.max(0, Math.min(1, signal.confidence))
    this.active.push({ ...signal, confidence })
    this.prune(signal.at)
  }

  private prune(now: number) {
    const floor = now - this.windowMs
    this.active = this.active.filter((s) => s.at >= floor)
  }

  score(now = Date.now()) {
    this.prune(now)
    const weights: Record<ProctorSignalName, number> = {
      'no-face': 1.0,
      'multiple-faces': 1.35,
      'looking-down': 0.85,
      'looking-away': 0.65,
      'prohibited-object': 1.5,
      'tab-hidden': 1.8,
      'fullscreen-exit': 1.5,
      'camera-ended': 2.0,
      'microphone-ended': 1.7,
    }

    let total = 0
    const bySignal = new Map<ProctorSignalName, number>()
    for (const signal of this.active) {
      const age = Math.max(0, now - signal.at)
      const decay = Math.max(0.15, 1 - age / this.windowMs)
      const contribution = weights[signal.name] * signal.confidence * decay
      total += contribution
      bySignal.set(signal.name, (bySignal.get(signal.name) || 0) + contribution)
    }

    const ranked = [...bySignal.entries()].sort((a, b) => b[1] - a[1])
    const dominant = ranked[0]
    return {
      score: Math.min(10, total),
      dominantSignal: dominant?.[0] || null,
      dominantWeight: dominant?.[1] || 0,
      sampleCount: this.active.length,
    }
  }

  reset() {
    this.active = []
  }
}
