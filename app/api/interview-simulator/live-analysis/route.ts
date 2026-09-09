import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { INTERVIEW_COOKIE, safeText, verifyInterviewSession } from '@/lib/interview-security'
import { rateLimit } from '@/lib/rate-limit'
import { callGeminiForJSON } from '@/lib/gemini-interview'

const ANALYSIS_MODEL = 'gemini-3.1-flash-lite'

type Analysis = {
  technicalDepth: number
  communication: number
  reasoning: number
  confidence: number
  relevance: number
  evidence: string
  nextProbe: string
}

export async function POST(req: Request) {
  try {
    const jar = await cookies()
    const raw = jar.get(INTERVIEW_COOKIE)?.value
    const session = raw ? await verifyInterviewSession(raw) : null
    if (!session) return NextResponse.json({ error: 'Secure interview session required.' }, { status: 401 })
    const limiter = rateLimit(`interview-live-analysis:${session.uid}:${session.sid}`, 20, 60_000)
    if (!limiter.ok) return NextResponse.json({ error: 'Live analysis rate limit reached.' }, { status: 429 })
    const body = await req.json()
    const question = safeText(body.question, 1800)
    const answer = safeText(body.answer, 5000)
    if (!question || !answer) return NextResponse.json({ error: 'Question and answer are required.' }, { status: 400 })
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Gemini API is not configured.' }, { status: 503 })

    const result = await callGeminiForJSON<Analysis>(
      apiKey,
      `You are the silent assessment engine running beside a live interview. Do not act as the interviewer. Grade only what the candidate actually said. Never invent missing facts. Return strict JSON only. Scores are 0-100. nextProbe should be one short, useful probe for the live interviewer, not a model answer.`,
      `Track: ${session.track}\nDifficulty: ${session.level}/5\nInterviewer question: ${question}\nCandidate answer: ${answer}\n\nReturn exactly: {"technicalDepth":number,"communication":number,"reasoning":number,"confidence":number,"relevance":number,"evidence":string,"nextProbe":string}`,
      { temperature: 0.15, maxOutputTokens: 700 },
    )
    if (!result.ok) return NextResponse.json({ error: 'Live analysis unavailable.' }, { status: 502 })
    const data = result.data
    const clamp = (v: unknown) => Math.max(0, Math.min(100, Number(v) || 0))
    return NextResponse.json({
      success: true,
      model: ANALYSIS_MODEL,
      analysis: {
        technicalDepth: clamp(data.technicalDepth),
        communication: clamp(data.communication),
        reasoning: clamp(data.reasoning),
        confidence: clamp(data.confidence),
        relevance: clamp(data.relevance),
        evidence: safeText(data.evidence, 500),
        nextProbe: safeText(data.nextProbe, 700),
      },
    })
  } catch (error) {
    console.error('Live interview analysis failed:', error)
    return NextResponse.json({ error: 'Live analysis failed.' }, { status: 500 })
  }
}
