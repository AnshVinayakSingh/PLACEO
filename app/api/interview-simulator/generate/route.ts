import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { INTERVIEW_COOKIE, verifyInterviewSession } from '@/lib/interview-security'
import { rateLimit } from '@/lib/rate-limit'
import { callGeminiForJSON } from '@/lib/gemini-interview'

export type InterviewTrack = 'hr' | 'technical' | 'communication' | 'behavioral'

export interface InterviewQuestion {
  id: string
  track: InterviewTrack
  roundName?: string
  skill?: string
  level: number
  question: string
  context?: string
  expectedKeyPoints: string[]
  timeLimitSeconds: number
  modelAnswer: string
}

interface GenerateRequest {
  track: InterviewTrack
  jobDescription?: string
  resumeText?: string
  level: number
  questionCount: number
}

const SYSTEM = `You are PLACEO's adaptive interview architect. You create the opening question for a live, human-like interview.
There is NO fixed question bank. Every opening question must be newly generated from the candidate's track, resume, job description and difficulty.
The opening question should sound like a real interviewer speaking aloud, not like a test prompt. It must be specific enough to start a meaningful conversation and must leave room for follow-up questions.
Return only valid JSON matching the requested schema.`

export async function POST(req: Request) {
  try {
    const jar = await cookies()
    const token = jar.get(INTERVIEW_COOKIE)?.value
    const interviewSession = token ? await verifyInterviewSession(token) : null
    if (!interviewSession) return NextResponse.json({ error: 'Secure interview session required.' }, { status: 401 })
    const limiter = rateLimit(`interview-generate:${interviewSession.uid}`, 8, 60_000)
    if (!limiter.ok) return NextResponse.json({ error: 'Too many interview starts. Please wait a moment.' }, { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds) } })
    const body = (await req.json()) as GenerateRequest
    const track = interviewSession.track as InterviewTrack
    const level = interviewSession.level
    const questionCount = interviewSession.questionCount
    const jobDescription = String(body.jobDescription || '').slice(0, 12000)
    const resumeText = String(body.resumeText || '').slice(0, 16000)
    if (body.persona && body.persona !== interviewSession.persona) return NextResponse.json({ error: 'Interview persona does not match the secure session.' }, { status: 409 })

    const prompt = `
Create ONE fresh opening question for a live ${track} interview.
Difficulty: ${level}/5
Target interview length: ${questionCount} substantive interviewer turns.
Job description:
${jobDescription || '(not provided — infer a realistic general role from the track)'}
Candidate resume:
${resumeText || '(not provided)'}

Rules:
- Never copy a known/template question.
- Do not dump multiple questions at once.
- For technical interviews, use the candidate's actual skills/projects when available.
- For HR/behavioral, prefer an experience-based question that can lead to natural follow-ups.
- For communication, make the first prompt conversational rather than a scripted pronunciation exam.
- The interviewer may later ask clarifications, challenge claims, change topic, or answer the candidate's own questions.
- Keep the opening question under 45 words.

JSON schema:
{
  "question": "string",
  "roundName": "string",
  "skill": "string or empty",
  "expectedKeyPoints": ["string"],
  "modelAnswer": "string"
}`

    const result = await callGeminiForJSON<{
      question: string
      roundName?: string
      skill?: string
      expectedKeyPoints?: string[]
      modelAnswer?: string
    }>(process.env.GEMINI_API_KEY || '', SYSTEM, prompt, {
      temperature: 0.95,
      maxOutputTokens: 700,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: 'Gemini could not create the opening question. Check your GEMINI_API_KEY and try again.' },
        { status: 502 },
      )
    }

    const question = String(result.data.question || '').trim()
    if (!question) {
      return NextResponse.json({ error: 'Gemini returned an empty interview question.' }, { status: 502 })
    }

    const item: InterviewQuestion = {
      id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      track,
      level,
      roundName: String(result.data.roundName || `${track} · Adaptive Round`),
      skill: String(result.data.skill || ''),
      question,
      expectedKeyPoints: Array.isArray(result.data.expectedKeyPoints) ? result.data.expectedKeyPoints.slice(0, 8) : [],
      timeLimitSeconds: Math.max(30, 90 - level * 10),
      modelAnswer: String(result.data.modelAnswer || ''),
    }

    return NextResponse.json({
      success: true,
      source: 'gemini-adaptive',
      totalQuestions: questionCount,
      questions: [item],
    })
  } catch (error) {
    console.error('Adaptive interview generation failed:', error)
    return NextResponse.json({ error: 'Could not start the adaptive interview.' }, { status: 500 })
  }
}
