import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { GDRoom } from '@/models/GDRoom'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ invites: [] })

    await connectDB()
    const rooms = await GDRoom.find({
      members: { $elemMatch: { userId: session.userId, status: 'invited' } },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()

    const invites = rooms.map((room: any) => {
      const host = room.members.find((m: any) => m.isHost)
      return {
        roomId: String(room._id),
        hostName: host?.name || 'A friend',
        companyName: room.companyName,
        jobRole: room.jobRole,
        roomStatus: room.status,
      }
    })

    return NextResponse.json({ invites })
  } catch (err) {
    console.error('GD invites list error:', err)
    return NextResponse.json({ invites: [] })
  }
}
