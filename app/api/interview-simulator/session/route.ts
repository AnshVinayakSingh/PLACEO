import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { InterviewSession } from '@/models/InterviewSession'
import { INTERVIEW_COOKIE, makeInterviewSessionId, signInterviewSession } from '@/lib/interview-security'

export async function POST(req: Request) {
  try {
    const auth = await getSession()
    if (!auth) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    const body = await req.json()
    const track = String(body.track || 'hr').slice(0, 40)
    const level = Math.max(0, Math.min(5, Number(body.level ?? 2)))
    const questionCount = Math.max(5, Math.min(30, Number(body.questionCount ?? 10)))
    const persona = body.persona === 'vikram' ? 'vikram' : 'priya'
    const sessionId = makeInterviewSessionId()
    await connectDB()
    await InterviewSession.create({ sessionId, userId: auth.userId, track, level, questionCount, persona, status: 'created' })
    const signed = await signInterviewSession({ sid: sessionId, uid: auth.userId, track, level, questionCount, persona, jti: crypto.randomUUID() })
    const jar = await cookies()
    jar.set(INTERVIEW_COOKIE, signed, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/api/interview-simulator', maxAge: 45 * 60 })
    return NextResponse.json({ success: true, sessionId })
  } catch (error) {
    console.error('Interview session creation failed:', error)
    return NextResponse.json({ error: 'Could not create a secure interview session.' }, { status: 500 })
  }
}
