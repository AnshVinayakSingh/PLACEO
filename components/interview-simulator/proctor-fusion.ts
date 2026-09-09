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

type ActiveSignal = ProctorSignal & { expiresAt: number }

/**
 * Temporal fusion for browser proctoring.
 * A single noisy frame never becomes a strike. Signals are accumulated over a
 * short rolling window and decay quickly after the scene returns to normal.
 */
export class TemporalProctorFusion {
  private active: ActiveSignal[] = []
  private readonly windowMs: number

  constructor(windowMs = 8500) {
    this.windowMs = windowMs
  }

  push(signal: ProctorSignal) {
    const confidence = Math.max(0, Math.min(1, signal.confidence))
    const duration = Math.max(500, signal.durationMs ?? 1600)
    this.active.push({ ...signal, confidence, expiresAt: signal.at + duration })
    this.prune(signal.at)
  }

  private prune(now: number) {
    const floor = now - this.windowMs
    this.active = this.active.filter((s) => s.at >= floor && s.expiresAt >= now)
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

  shouldStrike(now = Date.now()) {
    const result = this.score(now)
    // Require both temporal persistence and meaningful confidence.
    return result.sampleCount >= 4 && result.score >= 3.2 && result.dominantWeight >= 1.15
  }

  reset() {
    this.active = []
  }
}
