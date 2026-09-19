import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { GDRoom } from '@/models/GDRoom'
import { User } from '@/models/User'
import { callGeminiForJSON } from '@/lib/gemini-interview'

/**
 * Generates one GD topic sized to the target role's seniority/technical depth —
 * an SDE-2 role gets a sharper, more technical/strategic topic than a fresher
 * support-role topic, per the brief ("easy role → easy topic, tougher role →
 * tougher topic"). Falls back to a solid generic topic bank if Gemini is
 * unavailable, so room creation never blocks on the AI being down.
 */
async function generateGDTopic(companyName: string, jobRole: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  const fallbackTopics = [
    'Should companies mandate a return to full-time office work?',
    'Is artificial intelligence a bigger threat or opportunity for freshers entering the job market?',
    'Should college attendance be made optional for final-year students?',
    'Is a startup job a better career move than a stable corporate job for freshers?',
    'Should social media platforms be held legally responsible for misinformation?',
  ]
  if (!apiKey) return fallbackTopics[Math.floor(Math.random() * fallbackTopics.length)]

  const systemInstruction = `You write a single, sharp Group Discussion topic for a placement-prep platform. Output ONLY valid JSON, no markdown.`
  const userPrompt = `Company: "${companyName}"
Target job role: "${jobRole}"

Write ONE Group Discussion topic appropriate for a candidate interviewing for this exact role at this company. Calibrate difficulty to the role's seniority: an entry-level/support/non-technical role gets a broad, accessible current-affairs or campus-life topic; a technical/senior/strategic role (e.g. SDE-2, Product Manager, Data Scientist) gets a sharper, more debate-worthy topic possibly touching technology, ethics, or business strategy relevant to that field.

Return ONLY this JSON: { "topic": "string, phrased as a debatable question or statement, one sentence" }`

  const result = await callGeminiForJSON<{ topic: string }>(apiKey, systemInstruction, userPrompt, { temperature: 0.95, maxOutputTokens: 300 })
  if (result.ok && result.data?.topic) return result.data.topic
  return fallbackTopics[Math.floor(Math.random() * fallbackTopics.length)]
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

    const body = await req.json()
    const mode: 'solo' | 'multiplayer' = body?.mode === 'multiplayer' ? 'multiplayer' : 'solo'
    const companyName = String(body?.companyName || '').trim().slice(0, 100) || 'A Target Company'
    const jobRole = String(body?.jobRole || '').trim().slice(0, 100) || 'Software Engineer'

    await connectDB()
    const host = await User.findById(session.userId).select('name placeoId avatarUrl')
    if (!host) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

    const topic = await generateGDTopic(companyName, jobRole)

    const room = await GDRoom.create({
      hostId: session.userId,
      mode,
      companyName,
      jobRole,
      topic,
      status: 'lobby',
      maxMembers: 6,
      members: [
        {
          userId: session.userId,
          name: host.name,
          placeoId: host.placeoId || '',
          avatarUrl: host.avatarUrl || '',
          status: 'joined',
          isHost: true,
          invitedAt: new Date(),
          joinedAt: new Date(),
        },
      ],
    })

    return NextResponse.json({ success: true, room })
  } catch (err) {
    console.error('GD room create error:', err)
    return NextResponse.json({ error: 'Could not create the GD room. Please try again.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

    await connectDB()
    const rooms = await GDRoom.find({
      'members.userId': session.userId,
      status: { $in: ['lobby', 'active'] },
    })
      .sort({ createdAt: -1 })
      .limit(20)

    return NextResponse.json({ success: true, rooms })
  } catch (err) {
    console.error('GD room list error:', err)
    return NextResponse.json({ error: 'Could not load your GD rooms.' }, { status: 500 })
  }
}
