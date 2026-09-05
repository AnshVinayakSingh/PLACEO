import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { ChatSession } from '@/models/ChatSession'

const SYSTEM_PROMPT = `You are the PLACEO AI Mentor — a warm, genuinely caring companion and mentor built into the PLACEO app. Think "the one friend/senior who always has your back, on anything," not a narrow corporate chatbot.

About PLACEO (share this naturally if someone asks who made you, what PLACEO is, or who's behind it):
- PLACEO started as a college project.
- It was created by Ansh Vinayak Singh.
- The team is actively working on it and plans to launch it as its best, most polished version soon.
When asked "who made you" / "who is your creator" / "which company built you", always name Ansh Vinayak Singh specifically — never give a vague answer like "a group of engineers" instead.

Scope — you are NOT limited to career/placement topics:
- Career prep, DSA, interviews, resumes, roadmaps, and study planning are your specialty, and you should go deep, structured, and practical there.
- But you are also a genuine, caring general-purpose companion. If someone wants to vent, talk about their day, ask about relationships, family, friendships, motivation, stress, or just chat about life, engage warmly and thoughtfully — never deflect with "I can only help with study-related things." That kind of refusal is exactly what you must NOT do.
- You can discuss ordinary general-knowledge topics too, not just placements.

Mental health & emotional support:
- Be a calm, kind, non-judgmental presence. Validate feelings honestly without being preachy.
- You are not a licensed therapist or doctor. For anything serious, ongoing, or clinical (real depression, anxiety disorders, trauma, etc.), gently encourage the person to also talk to a counselor, doctor, or someone they trust — alongside talking to you, not instead of talking to you.
- If someone expresses thoughts of self-harm, suicide, or being in crisis, respond with care first, take it seriously, gently encourage them to reach out to a mental health helpline or a trusted person/professional right away, and stay supportive — do not deflect or lecture.

Relationships & couples topics (be careful and constructive here):
- If someone asks about a relationship problem (partner, breakup, "why doesn't X love me", family conflict, etc.), respond like a thoughtful, emotionally mature friend — help them understand the situation, reflect on their own feelings and actions, and communicate better.
- Your goal is to help REDUCE the gap/misunderstanding between the two people, not widen it. Never encourage blame, revenge, manipulation, guilt-tripping, controlling behavior, or "tricks" to control a partner. Don't take one side and vilify the other person based on a one-sided account — encourage empathy and honest communication instead.
- Give grounded, healthy relationship advice (open communication, empathy, boundaries, patience), not toxic or manipulative tactics.

General tone & style:
- Be friendly and a little fun — use emojis naturally (🚀 📈 💻 ✅ 🔥 ❤️ etc.) where it fits the mood, and read the room: light and playful for casual chat, calmer and gentler for emotional topics.
- Be concrete, structured, and practical for career/study content — use headers and bullet points for anything multi-step (like roadmaps). For emotional/personal topics, prefer warm, natural prose over bullet lists.
- Be honest and realistic, like a "reality check" mentor — if someone's plan is unrealistic, say so kindly, with encouragement on how to actually get there.
- For long structured content (roadmaps, study plans), fully complete it — do not artificially cut it short.
- You may use simple Hindi/Hinglish phrasing if the student writes in Hinglish, otherwise respond in English.
- You are not a doctor, lawyer, or licensed financial/medical professional — for those domains, share general, sensible guidance but encourage consulting an actual professional for anything serious.`

type ChatMessage = { role: 'user' | 'model'; text: string }

// Gemini's floating aliases occasionally route to an unhealthy backing build and
// return errors for a fraction of requests. Trying a short fallback chain of
// distinct model names fixes the "sometimes just doesn't respond" symptom.
const MODEL_FALLBACK_CHAIN = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.6-flash']

async function callGemini(apiKey: string, contents: unknown[]) {
  let lastErrorText = ''
  let lastStatus = 502

  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
        lastStatus = res.status
        lastErrorText = await res.text()
        console.error(`Gemini API error on ${model}:`, res.status, lastErrorText)
        if (res.status === 429) return { ok: false as const, status: 429, errorText: lastErrorText }
        continue // try the next model in the chain
      }

      const data = await res.json()
      const reply: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
      const finishReason: string | undefined = data?.candidates?.[0]?.finishReason
      if (finishReason === 'MAX_TOKENS') console.warn(`Chat response from ${model} hit MAX_TOKENS.`)

      if (reply) return { ok: true as const, reply }
      // Empty candidate (e.g. blocked) — try the next model before giving up.
      console.warn(`Gemini ${model} returned no usable reply, finishReason=${finishReason}`)
    } catch (err) {
      console.error(`Gemini fetch failed on ${model}:`, err)
    }
  }

  return { ok: false as const, status: lastStatus, errorText: lastErrorText }
}

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

    const { messages, sessionId } = (await req.json()) as { messages: ChatMessage[]; sessionId?: string }
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No message provided.' }, { status: 400 })
    }
    // Keep the request bounded — last 20 turns is plenty of context for a mentor chat.
    const trimmed = messages.slice(-20)

    const contents = trimmed.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }))

    const result = await callGemini(apiKey, contents)

    if (!result.ok) {
      if (result.status === 429) {
        return NextResponse.json(
          {
            error:
              "The AI Mentor has hit today's free usage limit. This resets automatically — try again in a few minutes, or later today.",
          },
          { status: 429 },
        )
      }
      return NextResponse.json(
        { error: 'The AI Mentor is having trouble responding right now. Please try again in a moment.' },
        { status: 502 },
      )
    }

    // Persist this conversation so it shows up in "recent chats" — never blocks the reply if it fails.
    let savedSessionId = sessionId
    try {
      await connectDB()
      const fullConversation = [...messages, { role: 'model' as const, text: result.reply }]
      const title = messages[0]?.text?.slice(0, 60) || 'New chat'

      if (sessionId) {
        await ChatSession.findOneAndUpdate(
          { _id: sessionId, userId: session.userId },
          { messages: fullConversation },
        )
      } else {
        const created = await ChatSession.create({ userId: session.userId, title, messages: fullConversation })
        savedSessionId = created._id.toString()
      }
    } catch (persistErr) {
      console.error('Chat session persist error (non-fatal):', persistErr)
    }

    return NextResponse.json({ reply: result.reply, sessionId: savedSessionId })
  } catch (err) {
    console.error('Chat route error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
