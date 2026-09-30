// Drop-in replacement for fetch() when calling Gemini's generateContent endpoint.
// Same idea as the fallback chain in app/api/chat/route.ts (the one that works reliably):
// if one model errors / is rate-limited / returns an empty reply, try the next model.
// Returns a normal Response, so existing `res.ok`, `res.status`, `res.json()` code keeps working.

const MODEL_FALLBACK_CHAIN = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite']

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function geminiFetch(url: string, init: RequestInit): Promise<Response> {
  let lastRes: Response | null = null
  let lastErr: unknown = null

  for (const model of MODEL_FALLBACK_CHAIN) {
    const modelUrl = url.replace(/models\/[^:/]+:/, `models/${model}:`)

    // up to 2 attempts per model (one quick retry for transient 500/503)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(modelUrl, init)

        if (res.ok) {
          // 200 but empty / blocked candidate? treat as failure and move on.
          const peek = await res.clone().json().catch(() => null)
          const text = peek?.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) return res
          console.warn(`[gemini-fetch] ${model} returned empty reply, finishReason=${peek?.candidates?.[0]?.finishReason}`)
          lastRes = res
          break // next model
        }

        const errBody = await res.clone().text()
        console.error(`[gemini-fetch] ${model} HTTP ${res.status}:`, errBody.slice(0, 300))
        lastRes = res

        if ((res.status === 500 || res.status === 503) && attempt === 0) {
          await sleep(700)
          continue // retry same model once
        }
        break // 400/404/429/etc -> next model (quotas are per-model on free tier)
      } catch (err) {
        console.error(`[gemini-fetch] network error on ${model}:`, err)
        lastErr = err
        break
      }
    }
  }

  if (lastRes) return lastRes
  throw lastErr ?? new Error('All Gemini models failed')
}
