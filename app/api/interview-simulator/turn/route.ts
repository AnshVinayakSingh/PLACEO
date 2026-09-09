import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { INTERVIEW_COOKIE, verifyInterviewSession } from '@/lib/interview-security'
import { rateLimit } from '@/lib/rate-limit'
import { callGeminiForJSON } from '@/lib/gemini-interview'

export async function POST(req: Request) {
  try {
    const jar = await cookies()
    const raw = jar.get(INTERVIEW_COOKIE)?.value
    const session = raw ? await verifyInterviewSession(raw) : null
    if (!session) return NextResponse.json({ error: 'Secure interview session required.' }, { status: 401 })
    const limiter = rateLimit(`interview-turn:${session.uid}`, 80, 60_000)
    if (!limiter.ok) return NextResponse.json({ error: 'Interview turn rate limit reached.' }, { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds) } })
    const body = await req.json()
    const result = await callGeminiForJSON<{
      response: string
      nextQuestion?: string
      finished?: boolean
      reason?: string
    }>(
      process.env.GEMINI_API_KEY || '',
      `You are a realistic ${body.persona === 'vikram' ? 'male lead engineer' : 'female senior recruiter'} conducting an adaptive placement interview. Respond conversationally. Answer the candidate's own questions directly. Otherwise briefly acknowledge their answer and ask exactly one fresh follow-up question. Never use a fixed question bank and never invent candidate facts. Output only JSON.`,
      `Track: ${body.track}\nDifficulty: ${body.level}/5\nJob description: ${String(body.jobDescription || '').slice(0, 8000)}\nResume: ${String(body.resumeText || '').slice(0, 10000)}\nCurrent interviewer question: ${body.currentQuestion || ''}\nCandidate response: ${body.candidateAnswer || ''}\nConversation so far:\n${JSON.stringify((body.history || []).slice(-12))}\n\nReturn {"response":"spoken interviewer reply","nextQuestion":"one next question or empty","finished":false,"reason":""}.`,
      { temperature: 0.85, maxOutputTokens: 500 },
    )

    if (!result.ok) return NextResponse.json({ error: 'Adaptive interviewer unavailable.' }, { status: 502 })
    return NextResponse.json({ success: true, ...result.data })
  } catch (error) {
    console.error('Interview turn error:', error)
    return NextResponse.json({ error: 'Could not generate the next interview turn.' }, { status: 500 })
  }
}
