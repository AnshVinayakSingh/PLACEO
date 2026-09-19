import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { GDRoom } from '@/models/GDRoom'
import { publishToUser } from '@/lib/gd-events'

export async function POST(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })
    const { roomId } = await params
    const body = await req.json()
    const toUserId = String(body?.toUserId || '')
    const type = String(body?.type || '')
    const payload = body?.payload
    if (!toUserId || !type || payload === undefined) {
      return NextResponse.json({ error: 'toUserId, type and payload are required.' }, { status: 400 })
    }

    await connectDB()
    const room = await GDRoom.findById(roomId).select('members').lean()
    if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 })
    const members = room.members as { userId: string }[]
    if (!members.some((m) => m.userId === session.userId) || !members.some((m) => m.userId === toUserId)) {
      return NextResponse.json({ error: 'Both users must be members of this room.' }, { status: 403 })
    }

    publishToUser(toUserId, 'gd-signal', { roomId, fromUserId: session.userId, type, payload })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('GD signal relay error:', err)
    return NextResponse.json({ error: 'Signal relay failed.' }, { status: 500 })
  }
}
