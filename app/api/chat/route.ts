import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

const SYSTEM_PROMPT = `You are the PLACEO AI Mentor — an upbeat, warm, genuinely encouraging career and placement-prep mentor for college students in India preparing for tech placements (SDE, Full Stack, Data roles, etc.). Think "favorite senior who always has your back," not a corporate chatbot.

Guidelines:
- Be friendly and a little fun — use emojis naturally (🚀 📈 💻 ✅ 🔥 etc.) to add energy, celebrate wins, and keep the tone light even when the content is serious.
- Still be concrete, structured, and practical underneath the warmth — specific topics, resources, timelines, not vague motivational fluff. Use headers and bullet points for anything multi-step (like roadmaps).
- Be honest and realistic, like a "reality check" mentor — if someone's plan is unrealistic, say so kindly, with encouragement on how to actually get there.
- For long structured content (roadmaps, study plans), fully complete it — do not artificially cut it short. It is fine for these responses to be long and detailed.
- You may use simple Hindi/Hinglish phrasing if the student writes in Hinglish, otherwise respond in English.
- You are not a doctor, lawyer, or financial advisor — stay in the career/placement/study domain.`

type ChatMessage = { role: 'user' | 'model'; text: string }

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Please log in to use the AI Mentor.' }, { status: 401 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI Mentor is not configured yet. Missing GEMINI_API_KEY on the server.' },
        { status: 500 },
      )
    }

    const { messages } = (await req.json()) as { messages: ChatMessage[] }
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No message provided.' }, { status: 400 })
    }
    // Keep the request bounded — last 20 turns is plenty of context for a mentor chat.
    const trimmed = messages.slice(-20)

    const contents = trimmed.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }))

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.85, maxOutputTokens: 4096 },
        }),
      },
    )

    if (!res.ok) {
      const errText = await res.text()
      console.error('Gemini API error:', res.status, errText)
      if (res.status === 429) {
        return NextResponse.json(
          {
            error:
              "The AI Mentor has hit today's free usage limit. This resets automatically — try again in a few minutes, or later today.",
          },
          { status: 429 },
        )
      }
      return NextResponse.json(
        { error: 'The AI Mentor is having trouble responding right now. Please try again.' },
        { status: 502 },
      )
    }

    const data = await res.json()
    const reply: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    const finishReason: string | undefined = data?.candidates?.[0]?.finishReason
    if (finishReason === 'MAX_TOKENS') {
      console.warn('Chat response hit MAX_TOKENS and may be truncated.')
    }

    if (!reply) {
      return NextResponse.json(
        { error: 'The AI Mentor could not generate a response. Please try again.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('Chat route error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
