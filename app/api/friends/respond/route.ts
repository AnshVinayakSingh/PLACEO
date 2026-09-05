import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { Friendship } from '@/models/Friendship'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

    const body = await req.json()
    const friendshipId = String(body?.friendshipId || '')
    const action = body?.action

    if (!friendshipId || (action !== 'accept' && action !== 'reject')) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    await connectDB()

    const friendship = await Friendship.findById(friendshipId)
    if (!friendship) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
    }
    if (friendship.recipientId !== session.userId) {
      return NextResponse.json({ error: 'You can only respond to requests sent to you.' }, { status: 403 })
    }
    if (friendship.status !== 'pending') {
      return NextResponse.json({ error: 'This request has already been handled.' }, { status: 409 })
    }

    if (action === 'accept') {
      friendship.status = 'accepted'
      await friendship.save()
    } else {
      await friendship.deleteOne()
    }

    return NextResponse.json({ success: true, action })
  } catch (err) {
    console.error('Friends respond error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
