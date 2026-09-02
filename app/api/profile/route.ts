import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/models/User'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

    await connectDB()
    const user = await User.findById(session.userId).select(
      'name email avatarUrl bio linkedinUrl leetcodeUrl targetRole college',
    )
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl || '',
        bio: user.bio || '',
        linkedinUrl: user.linkedinUrl || '',
        leetcodeUrl: user.leetcodeUrl || '',
        targetRole: user.targetRole || '',
        college: user.college || '',
      },
    })
  } catch (err) {
    console.error('Profile GET error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

function normalizeUrl(url: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

    const body = (await req.json()) as {
      name?: string
      avatarUrl?: string
      bio?: string
      linkedinUrl?: string
      leetcodeUrl?: string
      targetRole?: string
      college?: string
    }

    if (body.avatarUrl && body.avatarUrl.length > 1_500_000) {
      return NextResponse.json({ error: 'Image is too large. Please use a smaller photo.' }, { status: 400 })
    }
    if (body.bio && body.bio.length > 200) {
      return NextResponse.json({ error: 'Bio must be 200 characters or fewer.' }, { status: 400 })
    }

    const update: Record<string, string> = {}
    if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim()
    if (typeof body.avatarUrl === 'string') update.avatarUrl = body.avatarUrl
    if (typeof body.bio === 'string') update.bio = body.bio
    if (typeof body.linkedinUrl === 'string') update.linkedinUrl = normalizeUrl(body.linkedinUrl.trim())
    if (typeof body.leetcodeUrl === 'string') update.leetcodeUrl = normalizeUrl(body.leetcodeUrl.trim())
    if (typeof body.targetRole === 'string') update.targetRole = body.targetRole.trim()
    if (typeof body.college === 'string') update.college = body.college.trim()

    await connectDB()
    const user = await User.findByIdAndUpdate(session.userId, update, { new: true })
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl || '',
        bio: user.bio || '',
        linkedinUrl: user.linkedinUrl || '',
        leetcodeUrl: user.leetcodeUrl || '',
        targetRole: user.targetRole || '',
        college: user.college || '',
      },
    })
  } catch (err) {
    console.error('Profile PATCH error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
