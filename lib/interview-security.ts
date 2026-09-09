import { SignJWT, jwtVerify } from 'jose'

export const INTERVIEW_COOKIE = 'placeo_interview_session'

export type InterviewSessionClaims = {
  sid: string
  uid: string
  track: string
  level: number
  questionCount: number
  persona: 'priya' | 'vikram'
  jti: string
}

function getInterviewSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is required for interview security.')
  return new TextEncoder().encode(`${secret}:interview-v2`)
}

export async function signInterviewSession(payload: InterviewSessionClaims) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('45m')
    .sign(getInterviewSecret())
}

export async function verifyInterviewSession(token: string) {
  try {
    const { payload } = await jwtVerify(token, getInterviewSecret())
    return payload as unknown as InterviewSessionClaims
  } catch {
    return null
  }
}

export function makeInterviewSessionId() {
  return `int_${crypto.randomUUID().replaceAll('-', '')}`
}

export function safeText(value: unknown, max = 4000) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max)
}
