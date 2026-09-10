import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { INTERVIEW_COOKIE, verifyInterviewSession } from '@/lib/interview-security'
import { rateLimit } from '@/lib/rate-limit'
import { connectDB } from '@/lib/db'
import { InterviewSession } from '@/models/InterviewSession'

// gemini-2.5-flash-native-audio-preview-12-2025 has been unreliable in production
// since ~2026-05-27 (frequent mid-turn WebSocket code=1011 drops, which is what
// shows up to candidates as "the AI is slow / keeps cutting out"). Google's own
// migration guide points to gemini-3.1-flash-live-preview as the lower-latency
// replacement. Override on Render with GEMINI_LIVE_MODEL if needed.
const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview'

export async function POST(req: Request) {
  try {
    const jar = await cookies()
    const raw = jar.get(INTERVIEW_COOKIE)?.value
    const session = raw ? await verifyInterviewSession(raw) : null
    if (!session) return NextResponse.json({ error: 'Secure interview session required.' }, { status: 401 })
    const limiter = rateLimit(`interview-live:${session.uid}`, 4, 60_000)
    if (!limiter.ok) return NextResponse.json({ error: 'Too many Live session attempts. Please wait.' }, { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds) } })
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY on the server.' }, { status: 500 })
    }

    const body = await req.json()
    void body // job description / resume text are no longer needed here — the browser
    // builds the full system instruction itself (see interview-call-room.tsx)
    // since this account's API can't lock it server-side yet (see note below).

    let priorQuestionsAsked: string[] = []
    try {
      await connectDB()
      const sessionRecord = await InterviewSession.findOne({ sessionId: session.sid, userId: session.uid }).select('priorQuestionsAsked').lean()
      priorQuestionsAsked = (sessionRecord?.priorQuestionsAsked || []) as string[]
    } catch (historyError) {
      console.warn('Could not load prior-question history for live token:', historyError)
    }

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    // NOTE: this account's current auth_tokens API version rejects the
    // `liveConnectConstraints` field ("Unknown name liveConnectConstraints ...
    // Cannot find field") — confirmed against the live Render deployment — so
    // the session config cannot be locked server-side yet on this account/API
    // version. Falling back to the original unconstrained-token approach: the
    // browser supplies the model/system-instruction/config after the socket is
    // authenticated (see interview-call-room.tsx). Revisit locking this down
    // once Google exposes liveConnectConstraints for this project/API version.
    const payload = {
      uses: 1,
      expireTime,
      newSessionExpireTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('Gemini Live token error:', response.status, text)
      let reason = ''
      try {
        const parsed = JSON.parse(text)
        reason = String(parsed?.error?.message || parsed?.error?.status || '').slice(0, 300)
      } catch {}
      return NextResponse.json(
        { error: 'Could not create a secure Gemini Live session.', code: 'LIVE_TOKEN_FAILED', reason: process.env.NODE_ENV !== 'production' ? reason : undefined },
        { status: 502 },
      )
    }

    const data = await response.json()
    const token = data?.name
    if (!token) {
      return NextResponse.json({ error: 'Gemini did not return a Live API token.' }, { status: 502 })
    }

    try {
      await connectDB()
      await InterviewSession.updateOne(
        { sessionId: session.sid, userId: session.uid },
        { $set: { status: 'live', startedAt: new Date() } },
      )
    } catch (dbError) {
      console.warn('Could not mark interview session live:', dbError)
    }

    return NextResponse.json({ token, model: LIVE_MODEL, expiresAt: expireTime, priorQuestions: priorQuestionsAsked })
  } catch (error) {
    console.error('Live token route failed:', error)
    return NextResponse.json({ error: 'Failed to initialize the real-time AI interviewer.' }, { status: 500 })
  }
}
