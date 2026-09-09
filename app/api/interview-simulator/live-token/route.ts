import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { INTERVIEW_COOKIE, verifyInterviewSession } from '@/lib/interview-security'
import { rateLimit } from '@/lib/rate-limit'
import { connectDB } from '@/lib/db'
import { InterviewSession } from '@/models/InterviewSession'

// 2.5 is currently the safer low-latency default for this app. Override on Render
// with GEMINI_LIVE_MODEL when you want to test another Live model.
const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025'

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
    const persona: 'priya' | 'vikram' = session.persona
    const track = session.track
    const level = session.level
    const questionCount = session.questionCount
    const jobDescription = String(body.jobDescription || '').slice(0, 12000)
    const resumeText = String(body.resumeText || '').slice(0, 16000)

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    // Keep the ephemeral token constraints intentionally small. Google Live
    // ephemeral tokens are safest when only the model/session-resumption and
    // response modality are locked here; the browser supplies the conversational
    // settings after the WebSocket is authenticated. Locking every Live config
    // field in the token can make token creation fail as the API evolves.
    const payload = {
      uses: 1,
      expireTime,
      liveConnectConstraints: {
        model: `models/${LIVE_MODEL}`,
        config: {
          sessionResumption: {},
          responseModalities: ['AUDIO'],
        },
      },
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

    return NextResponse.json({ token, model: LIVE_MODEL, expiresAt: expireTime })
  } catch (error) {
    console.error('Live token route failed:', error)
    return NextResponse.json({ error: 'Failed to initialize the real-time AI interviewer.' }, { status: 500 })
  }
}
