import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

type BusySlot = { label: string; start: string; end: string }

type DaySchedule = {
  wake: string
  sleep: string
}

type PlannerRequest = {
  weekday: DaySchedule & {
    days: string[] // e.g. ['Mon','Tue','Wed','Thu','Fri']
    collegeStart?: string
    collegeEnd?: string
    busySlots: BusySlot[]
  }
  weekend: DaySchedule & {
    days: string[] // e.g. ['Sat','Sun']
    busySlots: BusySlot[]
  }
  topics: { name: string; priority: 'high' | 'medium' | 'low' }[]
  preferences: {
    peakFocus: 'morning' | 'night'
    sessionLength: number // minutes
    weekendMode: 'light' | 'intense'
  }
}

const SYSTEM_PROMPT = `You are the PLACEO AI Smart Routine Planner. You build realistic, personalized weekly timetables for Indian college students preparing for tech placements.

You will receive the student's FIXED constraints (wake/sleep times, college hours, other busy commitments) for weekdays and weekends SEPARATELY, plus the topics they want to study this week with a priority level, and their focus preferences.

Hard rules:
1. NEVER move, remove, or overlap any fixed constraint the student gave you (wake time, sleep time, college hours, busy slots). Treat them as immovable blocks.
2. Insert meals (breakfast, lunch, dinner) at sensible times in the gaps, if the student did not already give a busy slot that covers that time.
3. Add short breaks (10-15 min) between study blocks — never schedule back-to-back deep-focus blocks longer than the student's requested session length.
4. Distribute the requested study topics across the AVAILABLE free time only, weighted by priority (high priority topics get more total time and, where possible, the student's stated peak-focus window).
5. Weekday and weekend schedules must be built and returned SEPARATELY — they usually look quite different (no college on weekends, different wake/sleep, different free-time shape). Do not just copy the weekday plan.
6. If weekendMode is "light", keep the weekend noticeably lighter on study load with more rest/free blocks. If "intense", weekends can carry more deep study blocks since there's no college.
7. Every block must have a "start" and "end" in 24-hour "HH:MM" format, not overlapping, in chronological order, covering the full day from wake to sleep (leftover unplanned time should be labeled type "free").
8. For "type": use "college" for college, "study" for any study/topic block (put the topic name in "activity"), "meal" for breakfast/lunch/dinner, "break" for short breaks, "routine" for wake-up/freshen-up/wind-down, "sleep" for the final sleep block, "busy" for user-given busy slots, "free" for unplanned free time.
9. Also return 2-4 short "insights": practical, specific observations about the plan (e.g. total study hours, whether the load looks realistic, a burnout risk flag, or a suggestion). Keep each under 200 characters.

Respond with ONLY valid JSON matching this exact shape, nothing else — no markdown fences, no commentary:
{
  "weekday": [ { "start": "06:30", "end": "07:00", "activity": "Wake up + Freshen up", "type": "routine" } ],
  "weekend": [ { "start": "08:00", "end": "08:30", "activity": "Wake up + Freshen up", "type": "routine" } ],
  "insights": [ { "title": "Weekly Focus", "text": "..." } ]
}`

function buildUserPrompt(body: PlannerRequest): string {
  const lines: string[] = []

  lines.push('WEEKDAY CONSTRAINTS')
  lines.push(`- Applies to: ${body.weekday.days.join(', ') || 'Mon-Fri'}`)
  lines.push(`- Wake up: ${body.weekday.wake}`)
  lines.push(`- Sleep: ${body.weekday.sleep}`)
  if (body.weekday.collegeStart && body.weekday.collegeEnd) {
    lines.push(`- College: ${body.weekday.collegeStart} to ${body.weekday.collegeEnd} (FIXED, do not schedule anything else in this window)`)
  } else {
    lines.push('- No college/office on these days.')
  }
  if (body.weekday.busySlots.length) {
    lines.push('- Other fixed weekday busy slots:')
    body.weekday.busySlots.forEach((s) => lines.push(`  • ${s.label}: ${s.start} to ${s.end} (FIXED)`))
  }

  lines.push('')
  lines.push('WEEKEND CONSTRAINTS')
  lines.push(`- Applies to: ${body.weekend.days.join(', ') || 'Sat-Sun'}`)
  lines.push(`- Wake up: ${body.weekend.wake}`)
  lines.push(`- Sleep: ${body.weekend.sleep}`)
  if (body.weekend.busySlots.length) {
    lines.push('- Other fixed weekend busy slots:')
    body.weekend.busySlots.forEach((s) => lines.push(`  • ${s.label}: ${s.start} to ${s.end} (FIXED)`))
  } else {
    lines.push('- No other fixed weekend commitments.')
  }

  lines.push('')
  lines.push('TOPICS TO STUDY THIS WEEK (with priority)')
  if (body.topics.length) {
    body.topics.forEach((t) => lines.push(`- ${t.name}: ${t.priority} priority`))
  } else {
    lines.push('- (none given — leave free time mostly as "free" blocks, do not invent study topics)')
  }

  lines.push('')
  lines.push('PREFERENCES')
  lines.push(`- Peak focus time: ${body.preferences.peakFocus === 'morning' ? 'Morning' : 'Night'}`)
  lines.push(`- Preferred max study session length: ${body.preferences.sessionLength} minutes`)
  lines.push(`- Weekend mode: ${body.preferences.weekendMode === 'light' ? 'Light / rest-focused' : 'Intense / extra study'}`)

  return lines.join('\n')
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Please log in to use the AI Planner.' }, { status: 401 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI Planner is not configured yet. Missing GEMINI_API_KEY on the server.' },
        { status: 500 },
      )
    }

    const body = (await req.json()) as PlannerRequest

    if (!body?.weekday?.wake || !body?.weekday?.sleep || !body?.weekend?.wake || !body?.weekend?.sleep) {
      return NextResponse.json(
        { error: 'Please fill in wake-up and sleep times for both weekdays and weekends.' },
        { status: 400 },
      )
    }

    const userPrompt = buildUserPrompt(body)

    const responseSchema = {
      type: 'object',
      properties: {
        weekday: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start: { type: 'string' },
              end: { type: 'string' },
              activity: { type: 'string' },
              type: {
                type: 'string',
                enum: ['routine', 'college', 'study', 'meal', 'break', 'sleep', 'busy', 'free'],
              },
            },
            required: ['start', 'end', 'activity', 'type'],
          },
        },
        weekend: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start: { type: 'string' },
              end: { type: 'string' },
              activity: { type: 'string' },
              type: {
                type: 'string',
                enum: ['routine', 'college', 'study', 'meal', 'break', 'sleep', 'busy', 'free'],
              },
            },
            required: ['start', 'end', 'activity', 'type'],
          },
        },
        insights: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              text: { type: 'string' },
            },
            required: ['title', 'text'],
          },
        },
      },
      required: ['weekday', 'weekend', 'insights'],
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
      console.error('Gemini API error (ai-planner):', res.status, errText)
      if (res.status === 429) {
        return NextResponse.json(
          {
            error:
              "The AI Planner has hit today's free usage limit. This resets automatically — try again in a few minutes.",
          },
          { status: 429 },
        )
      }
      return NextResponse.json(
        { error: 'The AI Planner is having trouble generating your plan right now. Please try again.' },
        { status: 502 },
      )
    }

    const data = await res.json()
    const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    const finishReason: string | undefined = data?.candidates?.[0]?.finishReason

    if (!rawText) {
      console.error('AI Planner: empty response from Gemini', JSON.stringify(data).slice(0, 500))
      return NextResponse.json(
        { error: 'The AI Planner could not generate a plan. Please try again.' },
        { status: 502 },
      )
    }

    if (finishReason === 'MAX_TOKENS') {
      console.warn('AI Planner response hit MAX_TOKENS and may be truncated.')
    }

    let plan: { weekday: unknown[]; weekend: unknown[]; insights: unknown[] }
    try {
      plan = JSON.parse(rawText)
    } catch (err) {
      console.error('AI Planner: failed to parse Gemini JSON', err, rawText.slice(0, 500))
      return NextResponse.json(
        { error: 'The AI Planner returned an unexpected response. Please try again.' },
        { status: 502 },
      )
    }

    if (!Array.isArray(plan.weekday) || !Array.isArray(plan.weekend)) {
      return NextResponse.json(
        { error: 'The AI Planner returned an incomplete plan. Please try again.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ plan })
  } catch (err) {
    console.error('AI Planner route error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
