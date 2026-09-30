// Shared, SPEED-focused Gemini helper.
// Why responses were taking minutes before:
//  1. No timeout: a busy/hung model made the request wait for ages before falling back.
//  2. "Thinking" models spend a long time reasoning before they answer.
//  3. Same-model retries + sleeps added extra waiting.
// Now: fast models first, thinking turned off where supported, hard timeout per model,
// and instant fall-through to the next model.

export const GEMINI_MODEL_CHAIN = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
]

export const GEMINI_TIMEOUT_MS = 20_000

/** Turn off "thinking" on models that support a zero budget (big speed-up, same quality for our tasks). */
export function tuneGenerationConfig<T extends Record<string, unknown>>(model: string, cfg: T): T {
  if (model.startsWith('gemini-2.5')) {
    return { ...cfg, thinkingConfig: { thinkingBudget: 0 } }
  }
  return cfg
}

export async function geminiFetch(url: string, init: RequestInit): Promise<Response> {
  let lastRes: Response | null = null
  let lastErr: unknown = null
  const baseBody = typeof init.body === 'string' ? JSON.parse(init.body) : null

  for (const model of GEMINI_MODEL_CHAIN) {
    const modelUrl = url.replace(/models\/[^:/]+:/, `models/${model}:`)
    const body = baseBody
      ? JSON.stringify({
          ...baseBody,
          generationConfig: tuneGenerationConfig(model, baseBody.generationConfig || {}),
        })
      : init.body

    try {
      const res = await fetch(modelUrl, {
        ...init,
        body,
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      })

      if (res.ok) {
        const peek = await res.clone().json().catch(() => null)
        const text = peek?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return res
        console.warn(`[gemini-fetch] ${model} empty reply, finishReason=${peek?.candidates?.[0]?.finishReason}`)
        lastRes = res
        continue
      }

      const errBody = await res.clone().text()
      console.error(`[gemini-fetch] ${model} HTTP ${res.status}:`, errBody.slice(0, 200))
      lastRes = res
    } catch (err) {
      console.error(`[gemini-fetch] ${model} failed/timeout:`, String(err).slice(0, 150))
      lastErr = err
    }
  }

  if (lastRes) return lastRes
  throw lastErr ?? new Error('All Gemini models failed')
}
