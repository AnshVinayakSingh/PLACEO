import { NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { connectDB } from '@/lib/db'
import { User } from '@/models/User'
import { signSession, SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
      return NextResponse.json(
        { error: 'Google Sign-In is not configured yet. Missing GOOGLE_CLIENT_ID on the server.' },
        { status: 500 },
      )
    }

    const { credential } = (await req.json()) as { credential: string }
    if (!credential) {
      return NextResponse.json({ error: 'Missing Google credential.' }, { status: 400 })
    }

    const client = new OAuth2Client(clientId)
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId })
    const payload = ticket.getPayload()

    if (!payload?.email) {
      return NextResponse.json({ error: 'Could not verify your Google account.' }, { status: 401 })
    }

    await connectDB()

    let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] })

    if (!user) {
      user = await User.create({
        name: payload.name || payload.email.split('@')[0],
        email: payload.email.toLowerCase(),
        googleId: payload.sub,
        avatarUrl: payload.picture || '',
      })
    } else if (!user.googleId) {
      // Existing email/password account signing in with Google for the first time — link it.
      user.googleId = payload.sub
      if (!user.avatarUrl && payload.picture) user.avatarUrl = payload.picture
      await user.save()
    }

    const token = await signSession({ userId: user._id.toString(), email: user.email, name: user.name })

    const res = NextResponse.json({
      user: { id: user._id.toString(), name: user.name, email: user.email },
    })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (err) {
    console.error('Google sign-in error:', err)
    return NextResponse.json({ error: 'Google Sign-In failed. Please try again.' }, { status: 500 })
  }
}
