import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { INTERVIEW_COOKIE, verifyInterviewSession } from '@/lib/interview-security'
import { rateLimit } from '@/lib/rate-limit'

const MODEL_FALLBACK_CHAIN = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.6-flash']

export async function POST(req: Request) {
  try {
    const jar = await cookies()
    const raw = jar.get(INTERVIEW_COOKIE)?.value
    const interviewSession = raw ? await verifyInterviewSession(raw) : null
    if (!interviewSession) return NextResponse.json({ error: 'Secure interview session required.' }, { status: 401 })
    const limiter = rateLimit(`interview-clarify:${interviewSession.uid}`, 12, 60_000)
    if (!limiter.ok) return NextResponse.json({ error: 'Interview service rate limit reached. Please wait.' }, { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds) } })
    const body = await req.json()
    const { currentQuestion = '', candidateQuery = '', track = 'technical' } = body

    if (!candidateQuery) {
      return NextResponse.json({ answer: 'Could you please repeat your question?' })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      const prompt = `You are an elite, realistic technical & HR interviewer at a top tech company (Google/Amazon/Microsoft).
Current Interview Question: "${currentQuestion}"
Candidate asked this clarifying question / cross-question: "${candidateQuery}"

Respond as the interviewer in 1 to 2 crisp, natural, conversational sentences. Clarify the constraint, assumption, or give a slight nudge without revealing the full solution, and encourage them to proceed with their answer. Keep it professional, realistic, and brief so it can be spoken out loud.`

      for (const model of MODEL_FALLBACK_CHAIN) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 150 },
              }),
            }
          )
          if (geminiRes.ok) {
            const data = await geminiRes.json()
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
            if (reply) {
              return NextResponse.json({ answer: reply })
            }
          }
        } catch (e) {
          // fallback to next model or rule-based
        }
      }
    }

    // High-speed rule-based clarification fallback
    const lower = candidateQuery.toLowerCase()
    let reply = "Good question. You can assume standard production constraints. Please go ahead with your approach."

    if (lower.includes('example')) {
      reply = "Sure! For instance, consider a standard scenario with an unsorted dataset of up to one hundred thousand records. Walk me through how you would handle that."
    } else if (lower.includes('space') || lower.includes('memory')) {
      reply = "Prioritize minimizing time complexity first. If you need auxiliary memory like a hash set or buffer, that is acceptable as long as you justify the trade-off."
    } else if (lower.includes('constraint') || lower.includes('scale') || lower.includes('size')) {
      reply = "Assume enterprise scale: the input size fits in memory, but latency is critical, so we want to avoid quadratic time complexity."
    } else if (lower.includes('hint') || lower.includes('stuck')) {
      reply = "Think about whether a hash table or two-pointer approach could eliminate the nested loop. How would you start?"
    } else if (lower.includes('negative') || lower.includes('edge')) {
      reply = "Yes, assume the input can contain edge cases like negatives, nulls, or empty inputs. How would your code safeguard against that?"
    } else if (lower.includes('language') || lower.includes('syntax')) {
      reply = "You can explain in any programming language you are most comfortable with, or plain structured logic. Take it away."
    }

    return NextResponse.json({ answer: reply })
  } catch (err) {
    console.error('Clarification error:', err)
    return NextResponse.json({
      answer: "Good question. Assume standard constraints and proceed with your reasoning.",
    })
  }
}
