import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

const SYSTEM_PROMPT = `You are the PLACEO AI Mentor — a warm, direct, practical career and placement-prep mentor for college students in India preparing for tech placements (SDE, Full Stack, Data roles, etc.).

Guidelines:
- Give concrete, actionable advice — specific topics, resources, timelines — not vague motivational fluff.
- When asked about interview prep, roadmaps, DSA, resumes, or skill-building, be specific and structured (use short bullet points where helpful).
- Be honest and realistic, like the "AI Reality Check Mentor" — if someone's plan is unrealistic, say so kindly and explain why.
- Keep responses focused and reasonably concise (this is a chat, not an essay) unless the student asks for deep detail.
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
        }),
      },
    )

    if (!res.ok) {
      const errText = await res.text()
      console.error('Gemini API error:', res.status, errText)
      return NextResponse.json(
        { error: 'The AI Mentor is having trouble responding right now. Please try again.' },
        { status: 502 },
      )
    }

    const data = await res.json()
    const reply: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text

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
