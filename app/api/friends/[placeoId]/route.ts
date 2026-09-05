import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/User'
import { Friendship } from '@/models/Friendship'
import { getUserStats } from '@/lib/user-stats'

export async function GET(req: Request, { params }: { params: Promise<{ placeoId: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

    const { placeoId } = await params
    if (!/^\d{10}$/.test(placeoId)) {
      return NextResponse.json({ error: 'Invalid PLACEO ID.' }, { status: 400 })
    }

    await connectDB()

    const target = await User.findOne({ placeoId }).select('name avatarUrl bio placeoId createdAt')
    if (!target) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const isFriend = await Friendship.findOne({
      status: 'accepted',
      $or: [
        { requesterId: session.userId, recipientId: target._id },
        { requesterId: target._id, recipientId: session.userId },
      ],
    })

    if (!isFriend && String(target._id) !== session.userId) {
      return NextResponse.json({ error: 'You can only view a friend\u2019s profile.' }, { status: 403 })
    }

    const stats = await getUserStats(String(target._id))

    return NextResponse.json({
      profile: {
        name: target.name,
        avatarUrl: target.avatarUrl || '',
        bio: target.bio || '',
        placeoId: target.placeoId,
        memberSince: target.createdAt,
        stats,
      },
    })
  } catch (err) {
    console.error('Friend profile error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
