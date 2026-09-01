import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

type RoadmapRequest = { skill: string }

const SYSTEM_PROMPT = `You are the PLACEO AI Career Roadmap Generator. You build detailed, realistic, phase-by-phase learning roadmaps for Indian college students preparing for tech placements, for whatever skill/track they name (it may be a common one like DSA, Web Development, DevOps, AI/ML — or something niche they typed themselves, like Data Analytics, Cybersecurity, Cloud Computing, Blockchain, etc.). Always treat the given skill as valid and generate a full roadmap for it, even if it is not a common track.

Rules:
1. Break the roadmap into 4 to 6 sequential PHASES that together span a realistic total timeline (state it, e.g. "10-12 weeks"). Early phases cover fundamentals with a day-by-day or week-by-week time breakdown; later phases build up to advanced topics and interview readiness.
2. Every phase must list concrete topics with a specific time allocation (e.g. "3 days", "1 week") and a priority (high/medium/low) reflecting how important that topic is for placements in this skill.
3. Whenever a phase is a natural checkpoint for hands-on practice (usually after foundational topics are covered, and again later for a portfolio-worthy build), include 2-4 CONCRETE, NAMED project ideas for that phase (e.g. "Build a URL shortener with rate limiting", not "build a project"). Early pure-fundamentals phases can have an empty projects list.
4. Include a separate "interviewFocus" section: 5-8 topics most frequently tested in interviews for this skill, each with an importance level (high/medium/low), a short frequency note (e.g. "Asked in most SDE interviews", "Common in 60%+ of DSA rounds"), and 2-4 real, well-known companies known for emphasizing that topic. Keep company associations realistic and general (e.g. Amazon for DSA/System Design, Google for algorithms/scale, TCS/Infosys/Wipro for service-based fundamentals) — do not fabricate specific, unverifiable claims.
5. Include 2-4 short, practical "proTips" specific to this skill and placement prep (not generic motivational fluff).
6. Keep all text concise and scannable — this will be rendered as cards in a UI, not read as an essay.

Respond with ONLY valid JSON matching this exact shape, nothing else — no markdown fences, no commentary:
{
  "skillName": "DSA",
  "overview": "One or two sentence summary of what this roadmap covers and who it's for.",
  "totalDuration": "10-12 weeks",
  "phases": [
    {
      "phaseTitle": "Phase 1: Language & Fundamentals",
      "timeframe": "Day 1 - Day 10",
      "topics": [ { "name": "Arrays & Strings", "duration": "3 days", "priority": "high" } ],
      "projects": []
    }
  ],
  "interviewFocus": [
    { "topic": "Dynamic Programming", "importance": "high", "frequency": "Asked in most product-based interviews", "companies": ["Amazon", "Google", "Microsoft"] }
  ],
  "proTips": ["..."]
}`

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Please log in to use the Career Roadmap Generator.' }, { status: 401 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Roadmap Generator is not configured yet. Missing GEMINI_API_KEY on the server.' },
        { status: 500 },
      )
    }

    const body = (await req.json()) as RoadmapRequest
    const skill = body?.skill?.trim()
    if (!skill) {
      return NextResponse.json({ error: 'Please choose or type a skill to generate a roadmap for.' }, { status: 400 })
    }

    const userPrompt = `Generate a full roadmap for this skill/track: "${skill}"`

    const responseSchema = {
      type: 'object',
      properties: {
        skillName: { type: 'string' },
        overview: { type: 'string' },
        totalDuration: { type: 'string' },
        phases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              phaseTitle: { type: 'string' },
              timeframe: { type: 'string' },
              topics: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    duration: { type: 'string' },
                    priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                  },
                  required: ['name', 'duration', 'priority'],
                },
              },
              projects: { type: 'array', items: { type: 'string' } },
            },
            required: ['phaseTitle', 'timeframe', 'topics', 'projects'],
          },
        },
        interviewFocus: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              importance: { type: 'string', enum: ['high', 'medium', 'low'] },
              frequency: { type: 'string' },
              companies: { type: 'array', items: { type: 'string' } },
            },
            required: ['topic', 'importance', 'frequency', 'companies'],
          },
        },
        proTips: { type: 'array', items: { type: 'string' } },
      },
      required: ['skillName', 'overview', 'totalDuration', 'phases', 'interviewFocus', 'proTips'],
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
            responseSchema,
          },
        }),
      },
    )

    if (!res.ok) {
      const errText = await res.text()
      console.error('Gemini API error (roadmap):', res.status, errText)
      if (res.status === 429) {
        return NextResponse.json(
          {
            error:
              "The Roadmap Generator has hit today's free usage limit. This resets automatically — try again in a few minutes.",
          },
          { status: 429 },
        )
      }
      return NextResponse.json(
        { error: 'The Roadmap Generator is having trouble right now. Please try again.' },
        { status: 502 },
      )
    }

    const data = await res.json()
    const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      console.error('Roadmap: empty response from Gemini', JSON.stringify(data).slice(0, 500))
      return NextResponse.json(
        { error: 'The Roadmap Generator could not generate a roadmap. Please try again.' },
        { status: 502 },
      )
    }

    let roadmap: { phases: unknown[]; interviewFocus: unknown[] }
    try {
      roadmap = JSON.parse(rawText)
    } catch (err) {
      console.error('Roadmap: failed to parse Gemini JSON', err, rawText.slice(0, 500))
      return NextResponse.json(
        { error: 'The Roadmap Generator returned an unexpected response. Please try again.' },
        { status: 502 },
      )
    }

    if (!Array.isArray(roadmap.phases) || !roadmap.phases.length) {
      return NextResponse.json(
        { error: 'The Roadmap Generator returned an incomplete roadmap. Please try again.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ roadmap })
  } catch (err) {
    console.error('Roadmap route error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
