type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function rateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now()
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }
  if (current.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) }
  }
  current.count += 1
  return { ok: true, remaining: Math.max(0, limit - current.count), retryAfterSeconds: 0 }
}
