import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { connectDB } from '@/lib/db'
import { GDRoom } from '@/models/GDRoom'

const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

    const limiter = rateLimit(`gd-live:${session.userId}`, 6, 60_000)
    if (!limiter.ok) {
      return NextResponse.json({ error: 'Too many Live session attempts. Please wait.' }, { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds) } })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Missing GEMINI_API_KEY on the server.' }, { status: 500 })

    const body = await req.json()
    const roomId = String(body?.roomId || '')
    if (!roomId) return NextResponse.json({ error: 'roomId is required.' }, { status: 400 })

    await connectDB()
    const room = await GDRoom.findById(roomId)
    if (!room) return NextResponse.json({ error: 'GD room not found.' }, { status: 404 })
    const isMember = room.members.some((m: any) => m.userId === session.userId)
    if (!isMember) return NextResponse.json({ error: 'You are not a member of this GD room.' }, { status: 403 })

    const expireTime = new Date(Date.now() + 20 * 60 * 1000).toISOString()
    const payload = {
      uses: 1,
      expireTime,
      newSessionExpireTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('GD Live token error:', response.status, text)
      return NextResponse.json({ error: 'Could not create a secure Live session.', code: 'LIVE_TOKEN_FAILED' }, { status: 502 })
    }

    const data = await response.json()
    const token = data?.name
    if (!token) return NextResponse.json({ error: 'Gemini did not return a Live API token.' }, { status: 502 })

    return NextResponse.json({
      token,
      model: LIVE_MODEL,
      expiresAt: expireTime,
      companyName: room.companyName,
      jobRole: room.jobRole,
      topic: room.topic,
      mode: room.mode,
      members: room.members.filter((m: any) => m.status === 'joined').map((m: any) => ({ userId: m.userId, name: m.name })),
    })
  } catch (error) {
    console.error('GD live token route failed:', error)
    return NextResponse.json({ error: 'Failed to initialize the real-time AI moderator.' }, { status: 500 })
  }
}
