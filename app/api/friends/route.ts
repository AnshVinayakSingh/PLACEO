import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/User'
import { Friendship } from '@/models/Friendship'
import { getUserStats } from '@/lib/user-stats'

type PublicUser = { id: string; name: string; avatarUrl: string; placeoId: string }

function toPublicUser(u: { _id: unknown; name: string; avatarUrl?: string; placeoId?: string }): PublicUser {
  return {
    id: String(u._id),
    name: u.name,
    avatarUrl: u.avatarUrl || '',
    placeoId: u.placeoId || '',
  }
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

    await connectDB()

    const relations = await Friendship.find({
      $or: [{ requesterId: session.userId }, { recipientId: session.userId }],
    })

    const accepted = relations.filter((r) => r.status === 'accepted')
    const incoming = relations.filter((r) => r.status === 'pending' && r.recipientId === session.userId)
    const outgoing = relations.filter((r) => r.status === 'pending' && r.requesterId === session.userId)

    const otherIdOf = (r: (typeof relations)[number]) =>
      r.requesterId === session.userId ? r.recipientId : r.requesterId

    const friendIds = accepted.map(otherIdOf)
    const incomingIds = incoming.map((r) => r.requesterId)
    const outgoingIds = outgoing.map((r) => r.recipientId)

    const allIds = Array.from(new Set([...friendIds, ...incomingIds, ...outgoingIds]))
    const users = await User.find({ _id: { $in: allIds } }).select('name avatarUrl placeoId')
    const userById = new Map(users.map((u) => [String(u._id), u]))

    // Real ranked leaderboard: your friends + you, ranked by the same score everyone sees on their own dashboard.
    const myStats = await getUserStats(session.userId)
    const friendStatsList = await Promise.all(
      friendIds.map(async (id) => {
        const u = userById.get(id)
        if (!u) return null
        const stats = await getUserStats(id)
        return { ...toPublicUser(u), stats, isYou: false }
      }),
    )
    const me = await User.findById(session.userId).select('name avatarUrl placeoId')
    const leaderboard = [
      ...friendStatsList.filter((f): f is NonNullable<typeof f> => f !== null),
      ...(me ? [{ ...toPublicUser(me), stats: myStats, isYou: true }] : []),
    ].sort((a, b) => b.stats.score - a.stats.score)

    const incomingRequests = incoming
      .map((r) => {
        const u = userById.get(r.requesterId)
        return u ? { friendshipId: String(r._id), user: toPublicUser(u) } : null
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    const outgoingRequests = outgoing
      .map((r) => {
        const u = userById.get(r.recipientId)
        return u ? { friendshipId: String(r._id), user: toPublicUser(u) } : null
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    return NextResponse.json({ leaderboard, incomingRequests, outgoingRequests })
  } catch (err) {
    console.error('Friends GET error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

    const body = await req.json()
    const placeoId = String(body?.placeoId || '').trim()
    if (!/^\d{10}$/.test(placeoId)) {
      return NextResponse.json({ error: 'Enter a valid 10-digit PLACEO ID.' }, { status: 400 })
    }

    await connectDB()

    const target = await User.findOne({ placeoId })
    if (!target) {
      return NextResponse.json({ error: 'No user found with that ID.' }, { status: 404 })
    }
    if (String(target._id) === session.userId) {
      return NextResponse.json({ error: "You can't add yourself." }, { status: 400 })
    }

    const existing = await Friendship.findOne({
      $or: [
        { requesterId: session.userId, recipientId: target._id },
        { requesterId: target._id, recipientId: session.userId },
      ],
    })

    if (existing) {
      return NextResponse.json(
        { error: existing.status === 'accepted' ? 'You are already friends.' : 'A request is already pending.' },
        { status: 409 },
      )
    }

    await Friendship.create({ requesterId: session.userId, recipientId: target._id, status: 'pending' })

    return NextResponse.json({ success: true, sentTo: target.name })
  } catch (err) {
    console.error('Friends POST error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
