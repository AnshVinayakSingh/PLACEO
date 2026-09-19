import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { GDRoom } from '@/models/GDRoom'
import { Friendship } from '@/models/Friendship'
import { User } from '@/models/User'
import { publishToUser } from '@/lib/gd-events'

export async function POST(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })
    const { roomId } = await params
    const body = await req.json()
    const friendUserId = String(body?.friendUserId || '')
    if (!friendUserId) return NextResponse.json({ error: 'friendUserId is required.' }, { status: 400 })

    await connectDB()
    const room = await GDRoom.findById(roomId)
    if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 })
    if (room.hostId !== session.userId) return NextResponse.json({ error: 'Only the host can invite people.' }, { status: 403 })
    if (room.status !== 'lobby') return NextResponse.json({ error: 'This GD has already started.' }, { status: 409 })

    const activeMembers = room.members.filter((m: any) => m.status !== 'declined' && m.status !== 'left')
    if (activeMembers.length >= room.maxMembers) {
      return NextResponse.json({ error: `Room is full (max ${room.maxMembers} members).` }, { status: 409 })
    }
    if (activeMembers.some((m: any) => m.userId === friendUserId)) {
      return NextResponse.json({ error: 'This person is already in the room.' }, { status: 409 })
    }

    // Must actually be an accepted friend of the host.
    const friendship = await Friendship.findOne({
      status: 'accepted',
      $or: [
        { requesterId: session.userId, recipientId: friendUserId },
        { requesterId: friendUserId, recipientId: session.userId },
      ],
    })
    if (!friendship) return NextResponse.json({ error: 'You can only invite accepted friends.' }, { status: 403 })

    const friend = await User.findById(friendUserId).select('name placeoId avatarUrl')
    if (!friend) return NextResponse.json({ error: 'Friend account not found.' }, { status: 404 })

    room.members.push({
      userId: friendUserId,
      name: friend.name,
      placeoId: friend.placeoId || '',
      avatarUrl: friend.avatarUrl || '',
      status: 'invited',
      isHost: false,
      invitedAt: new Date(),
    })
    await room.save()

    const host = room.members.find((m: any) => m.userId === session.userId)
    const delivered = publishToUser(friendUserId, 'gd-invite', {
      roomId: String(room._id),
      hostName: host?.name || 'A friend',
      companyName: room.companyName,
      jobRole: room.jobRole,
      memberCount: room.members.filter((m: any) => m.status === 'joined').length,
    })

    return NextResponse.json({ success: true, delivered })
  } catch (err) {
    console.error('GD invite error:', err)
    return NextResponse.json({ error: 'Could not send the invite.' }, { status: 500 })
  }
}
