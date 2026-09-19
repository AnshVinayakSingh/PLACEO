import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { GDRoom } from '@/models/GDRoom'
import { publishToUsers } from '@/lib/gd-events'

export async function GET(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })
    const { roomId } = await params

    await connectDB()
    const room = await GDRoom.findById(roomId)
    if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 })
    const isMember = room.members.some((m: any) => m.userId === session.userId)
    if (!isMember) return NextResponse.json({ error: 'You are not a member of this room.' }, { status: 403 })

    return NextResponse.json({ success: true, room })
  } catch (err) {
    console.error('GD room fetch error:', err)
    return NextResponse.json({ error: 'Could not load the room.' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })
    const { roomId } = await params

    await connectDB()
    const room = await GDRoom.findById(roomId)
    if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 })

    const member = room.members.find((m: any) => m.userId === session.userId)
    if (member) member.status = 'left'
    await room.save()

    const otherMemberIds = room.members.filter((m: any) => m.userId !== session.userId).map((m: any) => m.userId)
    publishToUsers(otherMemberIds, 'room-updated', { roomId: String(room._id) })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('GD room leave error:', err)
    return NextResponse.json({ error: 'Could not leave the room.' }, { status: 500 })
  }
}
