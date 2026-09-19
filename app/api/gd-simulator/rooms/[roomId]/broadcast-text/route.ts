import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { GDRoom } from '@/models/GDRoom'
import { publishToUsers } from '@/lib/gd-events'

export async function POST(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })
    const { roomId } = await params
    const body = await req.json()
    const speakerName = String(body?.speakerName || '').slice(0, 80)
    const text = String(body?.text || '').trim().slice(0, 2000)
    if (!text) return NextResponse.json({ error: 'text is required.' }, { status: 400 })

    await connectDB()
    const room = await GDRoom.findById(roomId).select('members hostId').lean()
    if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 })
    const members = room.members as { userId: string }[]
    if (!members.some((m) => m.userId === session.userId)) {
      return NextResponse.json({ error: 'Not a member of this room.' }, { status: 403 })
    }

    const otherIds = members.filter((m) => m.userId !== session.userId).map((m) => m.userId)
    publishToUsers(otherIds, 'gd-transcript-line', {
      roomId,
      speakerUserId: session.userId,
      speakerName: speakerName || 'Participant',
      text,
      at: Date.now(),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('GD broadcast-text error:', err)
    return NextResponse.json({ error: 'Broadcast failed.' }, { status: 500 })
  }
}
