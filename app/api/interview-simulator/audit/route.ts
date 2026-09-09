import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db'
import { InterviewSession } from '@/models/InterviewSession'
import { INTERVIEW_COOKIE, safeText, verifyInterviewSession } from '@/lib/interview-security'
import { rateLimit } from '@/lib/rate-limit'

const ALLOWED_TYPES = new Set(['fullscreen-exit','fullscreen-enter','tab-hidden','tab-visible','window-blur','window-focus','copy-attempt','paste-attempt','context-menu','camera-ended','microphone-ended','screen-share-ended','multiple-faces','no-face','looking-away','looking-down','prohibited-object','model-ready','model-error','network-reconnect','candidate-spoke','interviewer-spoke','interview-ended','live-session-resumable','proctor-warning','proctor-disqualification'])

export async function POST(req: Request) {
  try {
    const jar = await cookies()
    const raw = jar.get(INTERVIEW_COOKIE)?.value
    const claims = raw ? await verifyInterviewSession(raw) : null
    if (!claims) return NextResponse.json({ error: 'Invalid interview session.' }, { status: 401 })
    const limiter = rateLimit(`interview-audit:${claims.uid}:${claims.sid}`, 90, 60_000)
    if (!limiter.ok) return NextResponse.json({ error: 'Audit event rate limit reached.' }, { status: 429 })
    const body = await req.json()
    const type = safeText(body.type, 80)
    if (!ALLOWED_TYPES.has(type)) return NextResponse.json({ error: 'Unsupported audit event.' }, { status: 400 })
    await connectDB()
    const severity = body.severity === 'critical' ? 'critical' : body.severity === 'warning' ? 'warning' : 'info'
    const confidence = Number.isFinite(Number(body.confidence)) ? Math.max(0, Math.min(1, Number(body.confidence))) : undefined
    const detail = safeText(body.detail, 500)
    await InterviewSession.updateOne({ sessionId: claims.sid, userId: claims.uid }, { $push: { auditEvents: { type, severity, at: new Date(), detail, confidence, metadata: body.metadata || undefined } } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Interview audit event failed:', error)
    return NextResponse.json({ error: 'Audit event could not be stored.' }, { status: 500 })
  }
}
