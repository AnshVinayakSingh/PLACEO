import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

const QUESTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          options: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            minItems: 4,
            maxItems: 4,
          },
          correctIndex: { type: 'INTEGER' },
          explanation: { type: 'STRING' },
        },
        required: ['question', 'options', 'correctIndex', 'explanation'],
      },
    },
  },
  required: ['questions'],
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Please log in to take an assessment.' }, { status: 401 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Assessments are not configured yet. Missing GEMINI_API_KEY on the server.' },
        { status: 500 },
      )
    }

    const { topic, subtopic, difficulty = 'medium', count = 5 } = (await req.json()) as {
      topic: string
      subtopic?: string
      difficulty?: 'easy' | 'medium' | 'hard'
      count?: number
    }

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'A topic is required.' }, { status: 400 })
    }
    const questionCount = Math.min(Math.max(Number(count) || 5, 1), 10)
    const focusTopic = subtopic ? `${topic} — specifically the subtopic "${subtopic}"` : topic

    const prompt = `Generate ${questionCount} unique multiple-choice quiz questions to test a student's knowledge of ${focusTopic}, for placement/interview preparation, at ${difficulty} difficulty.

Rules:
- Each question must have exactly 4 options.
- Exactly one option is correct; correctIndex is its 0-based index into options.
- Include a short (1-3 sentence) explanation of why the correct answer is right, written for someone learning the concept.
- Vary question types: conceptual understanding, code/output prediction where relevant, and applied scenarios.
- Do not repeat the same question phrasing across the set.
- Keep each question and each option concise (fit on a few lines).`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            responseMimeType: 'application/json',
            responseSchema: QUESTION_SCHEMA,
          },
        }),
      },
    )

    if (!res.ok) {
      const errText = await res.text()
      console.error('Gemini quiz API error:', res.status, errText)
      if (res.status === 429) {
        return NextResponse.json(
          {
            error:
              "Today's free question-generation limit has been reached. This resets automatically — try again in a few minutes, or later today.",
          },
          { status: 429 },
        )
      }
      return NextResponse.json(
        { error: 'Could not generate questions right now. Please try again.' },
        { status: 502 },
      )
    }

    const data = await res.json()
    const raw: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!raw) {
      return NextResponse.json({ error: 'No questions were generated. Please try again.' }, { status: 502 })
    }

    let parsed: { questions: unknown[] }
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.error('Failed to parse quiz JSON:', raw)
      return NextResponse.json({ error: 'Generated questions were malformed. Please try again.' }, { status: 502 })
    }

    return NextResponse.json({ questions: parsed.questions })
  } catch (err) {
    console.error('Skill quiz route error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
