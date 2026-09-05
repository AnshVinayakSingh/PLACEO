import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { ChatSession } from '@/models/ChatSession'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

    const { id } = await params
    await connectDB()
    const chatSession = await ChatSession.findOne({ _id: id, userId: session.userId }).lean()
    if (!chatSession) return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })

    return NextResponse.json({
      id: chatSession._id.toString(),
      title: chatSession.title,
      messages: chatSession.messages,
    })
  } catch (err) {
    console.error('Chat session GET error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
