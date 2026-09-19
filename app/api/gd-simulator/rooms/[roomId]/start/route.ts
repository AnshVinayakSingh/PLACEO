import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { GDRoom } from '@/models/GDRoom'
import { publishToUsers } from '@/lib/gd-events'

export async function POST(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })
    const { roomId } = await params

    await connectDB()
    const room = await GDRoom.findById(roomId)
    if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 })
    if (room.hostId !== session.userId) return NextResponse.json({ error: 'Only the host can start the GD.' }, { status: 403 })

    const joinedCount = room.members.filter((m: any) => m.status === 'joined').length
    if (joinedCount < 2) {
      return NextResponse.json({ error: 'Need at least 2 joined members to start the GD.' }, { status: 409 })
    }

    room.status = 'active'
    room.startedAt = new Date()
    await room.save()

    const otherMemberIds = room.members.filter((m: any) => m.userId !== session.userId && m.status === 'joined').map((m: any) => m.userId)
    publishToUsers(otherMemberIds, 'room-started', { roomId: String(room._id) })

    return NextResponse.json({ success: true, room })
  } catch (err) {
    console.error('GD room start error:', err)
    return NextResponse.json({ error: 'Could not start the GD.' }, { status: 500 })
  }
}
