import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { ChatSession } from '@/models/ChatSession'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

    await connectDB()
    const sessions = await ChatSession.find({ userId: session.userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title updatedAt')
      .lean()

    return NextResponse.json({
      sessions: sessions.map((s) => ({ id: s._id.toString(), title: s.title, updatedAt: s.updatedAt })),
    })
  } catch (err) {
    console.error('Chat sessions GET error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
