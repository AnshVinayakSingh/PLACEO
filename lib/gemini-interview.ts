// Shared Gemini helper for the Interview Simulator (question generation + evaluation).
// Mirrors the fallback-chain pattern already used in app/api/chat/route.ts so behavior
// (and reliability under Gemini's flaky alias routing) stays consistent across the app.

const MODEL_FALLBACK_CHAIN = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.6-flash']

export type GeminiJSONResult<T> =
  | { ok: true; data: T; modelUsed: string }
  | { ok: false; status: number; errorText: string }

function extractJSON(text: string): unknown {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    // Model sometimes wraps JSON with a stray sentence before/after it — grab the
    // outermost {...} or [...] block and try again.
    const objMatch = cleaned.match(/\{[\s\S]*\}/)
    const arrMatch = cleaned.match(/\[[\s\S]*\]/)
    const candidate = objMatch?.[0] || arrMatch?.[0]
    if (candidate) return JSON.parse(candidate)
    throw new Error('No JSON found in model response')
  }
}

/**
 * Calls Gemini asking for a strict JSON response, trying each model in the fallback
 * chain in turn. Returns a parsed object of type T, or a structured failure so the
 * caller can fall back to a deterministic (non-AI) path instead of crashing.
 */
export async function callGeminiForJSON<T>(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  opts?: { temperature?: number; maxOutputTokens?: number }
): Promise<GeminiJSONResult<T>> {
  let lastStatus = 502
  let lastErrorText = 'Unknown error'

  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: opts?.temperature ?? 0.8,
              maxOutputTokens: opts?.maxOutputTokens ?? 4096,
              responseMimeType: 'application/json',
            },
          }),
        }
      )

      if (!res.ok) {
        lastStatus = res.status
        lastErrorText = await res.text()
        console.error(`[gemini-interview] ${model} HTTP ${res.status}:`, lastErrorText)
        if (res.status === 429) return { ok: false, status: 429, errorText: lastErrorText }
        continue
      }

      const data = await res.json()
      const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
      const finishReason: string | undefined = data?.candidates?.[0]?.finishReason

      if (!text) {
        console.warn(`[gemini-interview] ${model} returned no text, finishReason=${finishReason}`)
        continue
      }

      try {
        const parsed = extractJSON(text) as T
        return { ok: true, data: parsed, modelUsed: model }
      } catch (parseErr) {
        console.error(`[gemini-interview] ${model} returned invalid JSON:`, parseErr, text.slice(0, 300))
        continue
      }
    } catch (err) {
      console.error(`[gemini-interview] fetch failed on ${model}:`, err)
      lastErrorText = String(err)
    }
  }

  return { ok: false, status: lastStatus, errorText: lastErrorText }
}
