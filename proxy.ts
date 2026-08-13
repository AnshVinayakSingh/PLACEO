import { NextResponse, type NextRequest } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'

const PROTECTED_ROUTES = [
  '/dashboard',
  '/ai-mentor',
  '/ai-planner',
  '/skill-analyzer',
  '/roadmap',
  '/interview-simulator',
  '/gd-simulator',
  '/coding-hub',
  '/notes-simplifier',
  '/resume-analyzer',
  '/leaderboard',
  '/settings',
  '/profile',
]

const AUTH_ROUTES = ['/login', '/signup']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null

  const isProtected = PROTECTED_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
  const isAuthRoute = AUTH_ROUTES.includes(pathname)

  if (isProtected && !session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/ai-mentor/:path*',
    '/ai-planner/:path*',
    '/skill-analyzer/:path*',
    '/roadmap/:path*',
    '/interview-simulator/:path*',
    '/gd-simulator/:path*',
    '/coding-hub/:path*',
    '/notes-simplifier/:path*',
    '/resume-analyzer/:path*',
    '/leaderboard/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/login',
    '/signup',
  ],
}
