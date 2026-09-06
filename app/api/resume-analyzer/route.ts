import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

type AnalyzeRequest = { jobDescription: string; resumeText: string }

const MAX_INPUT_LENGTH = 12000

const SYSTEM_PROMPT = `You are a strict, no-nonsense ATS + technical recruiter screening resumes for real Indian tech placements. The student needs an honest, realistic assessment, not encouragement. Being falsely positive wastes their time and gets them rejected in the real world — so be blunt, specific, and grounded in evidence.

You will receive a JOB DESCRIPTION and a RESUME (raw extracted text, formatting/line breaks may be imperfect — read past that, don't penalize for extraction artifacts).

Rules:
1. Estimate "currentShortlistChance" (0-100, integer) for THIS resume against THIS job description specifically — not a generic resume quality score. Base it on real overlap: required skills/tools present vs missing, relevant experience/projects vs irrelevant ones, seniority match, and ATS-parseability. If the resume is empty, unrelated to the role, or has almost no matching skills/keywords, the honest answer is a low number, including 0 or single digits — do not round up to be encouraging. Do not default to a "safe middle" number like 50-60 out of politeness; commit to what the evidence actually supports.
2. "verdict": one blunt sentence stating where they realistically stand (e.g. "This resume would likely be auto-filtered out — under 20% of the required stack is present.").
3. "strengths": what's genuinely already working, if anything. Can be an empty array if there is truly nothing notable — do not invent a strength to be nice.
4. "formatIssues": concrete ATS/formatting/readability problems actually visible in this resume text (e.g. missing sections, no quantified impact, inconsistent tense, too long/short, buried contact info, no clear skills section). Only list issues that are actually present — don't pad with generic advice that doesn't apply here.
5. "missingKeywords": specific skills/tools/terms that appear in the job description (or are standard for this role) but are missing from the resume, each with which resume section to add it to.
6. "keywordsToReplace": weak/vague phrasing in the resume that should be swapped for stronger, JD-aligned, quantified language — give the actual "from" text (or a close paraphrase of it) and the improved "to" version.
7. "skillsToAdd": concrete skills/technologies the student should actually go learn to close the gap for this specific role (not just resume wording fixes — real skill gaps).
8. "weakProjects": call out specific existing projects (by the name/description given) that are too generic, low-impact, or irrelevant to this role, and why. Can be empty if projects are genuinely fine.
9. "recommendedProjects": 2-4 concrete, named project ideas (with a one-line description) that would meaningfully strengthen this resume for THIS specific job description — tailored to the actual role, not generic "build a to-do app" suggestions.
10. "projectedShortlistChance": if the student applies ALL the above suggestions (keywords, format fixes, and realistically completes the recommended projects), estimate the new shortlist chance. Be honest about ceilings — a fundamentally mismatched resume (wrong field entirely, no relevant base skills) cannot jump to 90%+ just from wording and one or two projects; cap the projected number realistically and explain why in "projectedCaveat". If the resume is already strong, the projected number can be a modest, realistic improvement over the current score, not an inflated jump.
11. "projectedCaveat": one or two honest sentences on what the projected number assumes and its limits (e.g. "This assumes genuine hands-on project experience, not just resume wording — recruiters will probe this in interviews.").
12. Never invent facts about the resume that aren't there. Ground everything in the actual text provided.

Respond with ONLY valid JSON matching this exact shape, nothing else — no markdown fences, no commentary:
{
  "currentShortlistChance": 24,
  "verdict": "...",
  "strengths": ["..."],
  "formatIssues": [ { "issue": "...", "fix": "..." } ],
  "missingKeywords": [ { "keyword": "...", "addWhere": "Skills section" } ],
  "keywordsToReplace": [ { "from": "...", "to": "...", "reason": "..." } ],
  "skillsToAdd": ["..."],
  "weakProjects": [ { "project": "...", "whyWeak": "...", "suggestion": "..." } ],
  "recommendedProjects": [ { "name": "...", "description": "...", "whyRelevant": "..." } ],
  "projectedShortlistChance": 55,
  "projectedCaveat": "..."
}`

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Please log in to use the Resume Analyzer.' }, { status: 401 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Resume Analyzer is not configured yet. Missing GEMINI_API_KEY on the server.' },
        { status: 500 },
      )
    }

    const body = (await req.json()) as AnalyzeRequest
    const jobDescription = body?.jobDescription?.trim()
    const resumeText = body?.resumeText?.trim()

    if (!jobDescription || jobDescription.length < 30) {
      return NextResponse.json(
        { error: 'Please paste a fuller job description (at least a few sentences) before analyzing.' },
        { status: 400 },
      )
    }
    if (!resumeText || resumeText.length < 50) {
      return NextResponse.json(
        { error: 'Please upload a resume with readable text content before analyzing.' },
        { status: 400 },
      )
    }

    const trimmedJD = jobDescription.slice(0, MAX_INPUT_LENGTH)
    const trimmedResume = resumeText.slice(0, MAX_INPUT_LENGTH)

    const userPrompt = `JOB DESCRIPTION:\n${trimmedJD}\n\nRESUME (extracted text):\n${trimmedResume}`

    const responseSchema = {
      type: 'object',
      properties: {
        currentShortlistChance: { type: 'integer' },
        verdict: { type: 'string' },
        strengths: { type: 'array', items: { type: 'string' } },
        formatIssues: {
          type: 'array',
          items: {
            type: 'object',
            properties: { issue: { type: 'string' }, fix: { type: 'string' } },
            required: ['issue', 'fix'],
          },
        },
        missingKeywords: {
          type: 'array',
          items: {
            type: 'object',
            properties: { keyword: { type: 'string' }, addWhere: { type: 'string' } },
            required: ['keyword', 'addWhere'],
          },
        },
        keywordsToReplace: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              reason: { type: 'string' },
            },
            required: ['from', 'to', 'reason'],
          },
        },
        skillsToAdd: { type: 'array', items: { type: 'string' } },
        weakProjects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              project: { type: 'string' },
              whyWeak: { type: 'string' },
              suggestion: { type: 'string' },
            },
            required: ['project', 'whyWeak', 'suggestion'],
          },
        },
        recommendedProjects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              whyRelevant: { type: 'string' },
            },
            required: ['name', 'description', 'whyRelevant'],
          },
        },
        projectedShortlistChance: { type: 'integer' },
        projectedCaveat: { type: 'string' },
      },
      required: [
        'currentShortlistChance',
        'verdict',
        'strengths',
        'formatIssues',
        'missingKeywords',
        'keywordsToReplace',
        'skillsToAdd',
        'weakProjects',
        'recommendedProjects',
        'projectedShortlistChance',
        'projectedCaveat',
      ],
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
            temperature: 0.35,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
            responseSchema,
          },
        }),
      },
    )

    if (!res.ok) {
      const errText = await res.text()
      console.error('Gemini API error (resume-analyzer):', res.status, errText)
      if (res.status === 429) {
        return NextResponse.json(
          {
            error:
              "The Resume Analyzer has hit today's free usage limit. This resets automatically — try again in a few minutes.",
          },
          { status: 429 },
        )
      }
      return NextResponse.json(
        { error: 'The Resume Analyzer is having trouble right now. Please try again.' },
        { status: 502 },
      )
    }

    const data = await res.json()
    const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      console.error('Resume Analyzer: empty response from Gemini', JSON.stringify(data).slice(0, 500))
      return NextResponse.json(
        { error: 'The Resume Analyzer could not generate an analysis. Please try again.' },
        { status: 502 },
      )
    }

    let analysis: { currentShortlistChance?: number; formatIssues?: unknown[] }
    try {
      analysis = JSON.parse(rawText)
    } catch (err) {
      console.error('Resume Analyzer: failed to parse Gemini JSON', err, rawText.slice(0, 500))
      return NextResponse.json(
        { error: 'The Resume Analyzer returned an unexpected response. Please try again.' },
        { status: 502 },
      )
    }

    if (typeof analysis.currentShortlistChance !== 'number') {
      return NextResponse.json(
        { error: 'The Resume Analyzer returned an incomplete analysis. Please try again.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ analysis })
  } catch (err) {
    console.error('Resume Analyzer route error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
