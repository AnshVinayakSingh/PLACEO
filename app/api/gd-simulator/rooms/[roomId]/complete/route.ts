import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { GDRoom } from '@/models/GDRoom'
import { callGeminiForJSON } from '@/lib/gemini-interview'

interface TranscriptLineInput {
  speaker: string
  text: string
  at: number
  offTopic?: boolean
}

interface GDFeedback {
  overallSummary: string
  participantFeedback: {
    name: string
    contributionScore: number
    clarityScore: number
    stayedOnTopic: boolean
    strengths: string[]
    improvements: string[]
  }[]
}

async function generateGDFeedback(topic: string, transcript: TranscriptLineInput[]): Promise<GDFeedback | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || transcript.length === 0) return null

  const systemInstruction = `You are a strict Group Discussion panel evaluator. Output ONLY valid JSON, no markdown. Be honest and specific — never inflate scores for participants who barely spoke or stayed off-topic.`
  const transcriptBlock = transcript.map((t) => `${t.speaker}: ${t.text}`).join('\n')
  const userPrompt = `GD Topic: "${topic}"

Full transcript:
${transcriptBlock}

Return ONLY this JSON:
{
  "overallSummary": "2-3 sentence summary of how the discussion went",
  "participantFeedback": [
    { "name": "string (exclude 'GD Coach AI')", "contributionScore": number (0-100, based on how much substantive content they added), "clarityScore": number (0-100), "stayedOnTopic": boolean, "strengths": [string,...], "improvements": [string,...] }
  ]
}`

  const result = await callGeminiForJSON<GDFeedback>(apiKey, systemInstruction, userPrompt, { temperature: 0.4, maxOutputTokens: 2048 })
  if (!result.ok) return null
  return result.data
}

export async function POST(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })
    const { roomId } = await params
    const body = await req.json()
    const transcript: TranscriptLineInput[] = Array.isArray(body?.transcript) ? body.transcript : []

    await connectDB()
    const room = await GDRoom.findById(roomId)
    if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 })
    const isMember = room.members.some((m: any) => m.userId === session.userId)
    if (!isMember) return NextResponse.json({ error: 'Not a member of this room.' }, { status: 403 })

    room.transcript = transcript.map((t) => ({ speaker: t.speaker, text: t.text, timestamp: new Date(t.at), flaggedOffTopic: !!t.offTopic }))
    room.status = 'completed'
    room.endedAt = new Date()

    const feedback = await generateGDFeedback(room.topic || '', transcript)
    if (feedback) {
      const current = (room.feedbackByUserId as Record<string, unknown>) || {}
      room.feedbackByUserId = { ...current, all: feedback }
    }
    await room.save()

    return NextResponse.json({ success: true, feedback: feedback || null })
  } catch (err) {
    console.error('GD complete error:', err)
    return NextResponse.json({ error: 'Could not finalize the GD session.' }, { status: 500 })
  }
}
