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
    const accept = Boolean(body?.accept)

    await connectDB()
    const room = await GDRoom.findById(roomId)
    if (!room) return NextResponse.json({ error: 'This invite is no longer valid.' }, { status: 404 })

    const member = room.members.find((m: any) => m.userId === session.userId)
    if (!member) return NextResponse.json({ error: 'You were not invited to this room.' }, { status: 403 })
    if (member.status !== 'invited') return NextResponse.json({ error: 'This invite was already responded to.' }, { status: 409 })

    member.status = accept ? 'joined' : 'declined'
    if (accept) member.joinedAt = new Date()
    await room.save()

    const otherMemberIds = room.members.filter((m: any) => m.userId !== session.userId).map((m: any) => m.userId)
    publishToUsers(otherMemberIds, 'room-updated', {
      roomId: String(room._id),
      memberName: member.name,
      accepted: accept,
    })

    return NextResponse.json({ success: true, room })
  } catch (err) {
    console.error('GD invite respond error:', err)
    return NextResponse.json({ error: 'Could not respond to the invite.' }, { status: 500 })
  }
}
