import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db'
import { InterviewSession } from '@/models/InterviewSession'
import { INTERVIEW_COOKIE, safeText, verifyInterviewSession } from '@/lib/interview-security'

export async function POST(req: Request) {
  try {
    const jar = await cookies()
    const raw = jar.get(INTERVIEW_COOKIE)?.value
    const claims = raw ? await verifyInterviewSession(raw) : null
    if (!claims) return NextResponse.json({ error: 'Invalid interview session.' }, { status: 401 })
    const body = await req.json()
    const status = body.status === 'disqualified' ? 'disqualified' : 'completed'
    const transcript = Array.isArray(body.transcript)
      ? body.transcript.slice(-120).map((t: any) => ({ role: t.role === 'candidate' ? 'candidate' : 'interviewer', text: safeText(t.text, 2000), at: new Date(Number(t.at) || Date.now()) }))
      : []
    const strikeCount = Math.max(0, Math.min(2, Number(body.strikeCount || 0)))
    const finalScore = Number.isFinite(Number(body.finalScore)) ? Math.max(0, Math.min(100, Number(body.finalScore))) : undefined
    await connectDB()
    await InterviewSession.updateOne(
      { sessionId: claims.sid, userId: claims.uid },
      { $set: { status, strikeCount, endedAt: new Date(), durationSeconds: Math.max(0, Number(body.durationSeconds || 0)), transcript, finalScore } },
    )
    jar.delete(INTERVIEW_COOKIE)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Interview finalize failed:', error)
    return NextResponse.json({ error: 'Could not finalize the interview session.' }, { status: 500 })
  }
}
