import { NextResponse } from 'next/server'
import { callGeminiForJSON } from '@/lib/gemini-interview'

interface CandidateQA {
  questionId: string
  question: string
  userTranscript: string
  timeTakenSeconds: number
  expectedKeyPoints?: string[]
  modelAnswer?: string
  skill?: string
  roundName?: string
}

interface EvaluateRequest {
  track: string
  level: number
  violationsCount: number
  qaList: CandidateQA[]
}

interface AIEvaluationShape {
  overallScore: number
  grade: string
  readinessStatus: string
  parameterScores: { technical: number; communication: number; behavioral: number; integrity: number }
  selectionProbability: { current: number; projected: number; boost: number; rationale: string }
  identifiedWeaknesses: string[]
  actionableRoadmap: { title: string; description: string; priority: string }[]
  questionReviews: { id: string; question: string; candidateAnswer: string; score: number; feedback: string; idealModelAnswer: string }[]
}

/**
 * Ask Gemini to strictly grade the actual transcripts against the rubric. Returns
 * null (never throws) on any failure so the caller can fall back to the deterministic
 * keyword-based scorer below — the feature must keep working even without AI.
 */
async function evaluateWithAI(
  track: string,
  level: number,
  violationsCount: number,
  qaList: CandidateQA[],
  attemptedCount: number
): Promise<AIEvaluationShape | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const systemInstruction = `You are an extremely strict senior technical recruiter grading a real placement interview call transcript. You output ONLY valid JSON, no markdown, no commentary.
HARD RULES you must always follow:
- A question with an empty, "[No answer spoken]", "[No response recorded]", "[Skipped...]" or clearly non-substantive transcript (e.g. "I don't know", under ~5 real words) MUST score 0 for that question. Never award partial credit for silence or a refusal to answer.
- Never invent or assume content the candidate did not actually say. Grade only the literal transcript text provided.
- If NO questions were meaningfully answered at all, the overallScore and selectionProbability.current MUST both be 0, grade "F", readinessStatus "High Rejection Risk ❌".
- Be harsh but fair: vague, generic, or textbook-parroted answers score low-to-mid even if some correct keywords appear. Reward specific, correct, well-articulated answers with real examples.
- Proctor integrity: violationsCount 0 -> integrity ~95-100, violationsCount 1 -> integrity ~55-65 (one warning was issued), violationsCount >=2 -> integrity <=15 (the call was disconnected for repeated violations).`

  const qaBlock = qaList
    .map(
      (qa, i) =>
        `Q${i + 1} [${qa.skill ? `skill: ${qa.skill}` : qa.roundName || track}]: ${qa.question}\nExpected key points: ${(qa.expectedKeyPoints || []).join('; ') || 'n/a'}\nCandidate's actual transcript: "${qa.userTranscript || '[No answer spoken]'}"\nTime taken: ${qa.timeTakenSeconds}s`
    )
    .join('\n\n')

  const userPrompt = `Track: ${track} | Difficulty level: ${level}/5 | Proctor violations this call: ${violationsCount} | Questions answered with real content: ${attemptedCount}/${qaList.length}

TRANSCRIPT TO GRADE:
${qaBlock}

Return ONLY this JSON shape:
{
  "overallScore": number (0-100),
  "grade": "A" | "B" | "C" | "D" | "F",
  "readinessStatus": string (e.g. "Placement Ready 🚀", "Moderate Competency ⚠️", "High Rejection Risk ❌"),
  "parameterScores": { "technical": number, "communication": number, "behavioral": number, "integrity": number },
  "selectionProbability": { "current": number, "projected": number, "boost": number, "rationale": string },
  "identifiedWeaknesses": [string, ...up to 5],
  "actionableRoadmap": [{ "title": string, "description": string, "priority": "High"|"Medium"|"Low" }, ...2-4 items],
  "questionReviews": [{ "id": "<use the exact question text as id if unsure>", "question": string, "candidateAnswer": string, "score": number, "feedback": string, "idealModelAnswer": string }, ... one per question in order]
}`

  const result = await callGeminiForJSON<AIEvaluationShape>(apiKey, systemInstruction, userPrompt, {
    temperature: 0.3,
    maxOutputTokens: 4096,
  })

  if (!result.ok) return null
  if (typeof result.data?.overallScore !== 'number' || !Array.isArray(result.data?.questionReviews)) return null
  return result.data
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EvaluateRequest
    const { track = 'hr', level = 2, violationsCount = 0, qaList = [] } = body

    if (!qaList || qaList.length === 0) {
      return NextResponse.json({
        success: true,
        overallScore: 0,
        grade: 'F',
        readinessStatus: 'High Rejection Risk ❌',
        parameterScores: { technical: 0, communication: 0, behavioral: 0, integrity: 0 },
        selectionProbability: {
          current: 0,
          projected: 40,
          boost: 40,
          rationale: 'No responses were provided during the interview call. Active speaking is mandatory for placement consideration.',
        },
        identifiedWeaknesses: ['Did not answer interview questions', 'Session was disconnected before attempting answers'],
        actionableRoadmap: [
          {
            title: 'Participate Actively in Voice Rounds',
            description: 'Speak your thought process aloud even if unsure of the exact answer.',
            priority: 'High',
          },
        ],
        questionReviews: [],
      })
    }

    const isSubstantiveAnswer = (raw: string) => {
      const answer = (raw || '').trim()
      const lower = answer.toLowerCase()
      if (!answer) return false
      if (answer === '[No response recorded]' || answer.startsWith('[Skipped') || answer === '[No answer spoken]') return false
      if (lower.includes("i don't know") || lower.includes('no idea') || lower.includes('skip') || lower.includes('pass')) return false
      return answer.length >= 5
    }

    const preAttemptedCount = qaList.filter((qa) => isSubstantiveAnswer(qa.userTranscript)).length

    // ── PRIMARY PATH: real AI grading of the actual transcripts ─────────────────
    const aiEval = await evaluateWithAI(track, level, violationsCount, qaList, preAttemptedCount)
    if (aiEval) {
      // Hard guardrail: never let a model hallucinate a positive score when nothing
      // substantive was actually said. This is the exact "72% with zero answers" bug.
      if (preAttemptedCount === 0) {
        return NextResponse.json({
          success: true,
          overallScore: 0,
          grade: 'F',
          readinessStatus: 'High Rejection Risk ❌',
          parameterScores: { technical: 0, communication: 0, behavioral: 0, integrity: violationsCount >= 2 ? 15 : violationsCount === 1 ? 60 : 95 },
          selectionProbability: { current: 0, projected: 40, boost: 40, rationale: 'No responses were provided during the interview call. Active speaking is mandatory for placement consideration.' },
          identifiedWeaknesses: ['Did not answer any interview questions with real content'],
          actionableRoadmap: [
            { title: 'Participate Actively in Voice Rounds', description: 'Speak your thought process aloud even if unsure of the exact answer.', priority: 'High' },
          ],
          questionReviews: qaList.map((qa) => ({
            id: qa.questionId,
            question: qa.question,
            candidateAnswer: qa.userTranscript || '[No answer spoken]',
            score: 0,
            feedback: 'Unanswered.',
            idealModelAnswer: qa.modelAnswer || 'Detailed answer with concrete examples.',
          })),
        })
      }

      return NextResponse.json({ success: true, source: 'ai', ...aiEval })
    }

    // ── FALLBACK PATH: deterministic keyword-coverage scorer, used only if Gemini
    // is unavailable/unconfigured/rate-limited — the feature must never go blank ──
    let totalPoints = 0
    let attemptedCount = 0
    const questionReviews = []
    const weaknessesSet = new Set<string>()

    for (const qa of qaList) {
      const answer = (qa.userTranscript || '').trim()
      const isSkippedOrEmpty = !isSubstantiveAnswer(answer)

      const expectedPoints = qa.expectedKeyPoints || []
      let qScore = 0
      let feedback = ''

      if (isSkippedOrEmpty) {
        qScore = 0
        feedback = 'Unanswered or passed by candidate. Zero marks awarded.'
        if (qa.skill) weaknessesSet.add(`Lacked knowledge in ${qa.skill}`)
        else weaknessesSet.add('Passed questions without attempting answers')
      } else {
        attemptedCount++
        const wordCount = answer.split(/\s+/).length
        const lowerAnswer = answer.toLowerCase()

        let matchedCount = 0
        const missingPoints: string[] = []

        for (const pt of expectedPoints) {
          const keywords = pt.toLowerCase().split(/[^a-z0-9]+/).filter((w: string) => w.length > 3)
          const hits = keywords.filter((kw: string) => lowerAnswer.includes(kw))
          if (hits.length >= Math.min(2, keywords.length)) {
            matchedCount++
          } else {
            missingPoints.push(pt)
          }
        }

        const coverageRatio = expectedPoints.length > 0 ? matchedCount / expectedPoints.length : 0.4
        const lengthScore = Math.min(50, wordCount * 1.8)
        const contentScore = coverageRatio * 50

        // Strictness scaling
        const raw = Math.round(lengthScore + contentScore - level * 2)
        qScore = Math.max(10, Math.min(100, raw))

        if (qScore >= 75) {
          feedback = 'Strong answer! Good conceptual grasp and articulation.'
        } else if (qScore >= 45) {
          feedback = 'Partially correct, but lacked technical specifics or depth.'
          if (qa.skill) weaknessesSet.add(`Superficial knowledge in ${qa.skill}`)
        } else {
          feedback = 'Vague answer with little technical substance.'
          if (qa.skill) weaknessesSet.add(`Struggled with core logic in ${qa.skill}`)
        }
      }

      totalPoints += qScore
      questionReviews.push({
        id: qa.questionId,
        question: qa.question,
        candidateAnswer: answer || '[No answer spoken]',
        score: qScore,
        feedback,
        idealModelAnswer: qa.modelAnswer || 'Detailed technical answer with examples.',
      })
    }

    // Strict math: Average of ALL questions (skipped count as 0)
    const averageRawScore = Math.round(totalPoints / qaList.length)

    // Proctor integrity
    let integrityScore = 100
    if (violationsCount === 1) {
      integrityScore = 60
      weaknessesSet.add('Eye contact warning: Candidate looked away/at mobile phone during call')
    } else if (violationsCount >= 2) {
      integrityScore = 15
      weaknessesSet.add('Severe proctor violation: Multiple eye contact/device infractions')
    }

    // Dimension breakdown strictly derived from actual performance
    const technicalAccuracy = Math.round(averageRawScore * 0.95)
    const communicationClarity = attemptedCount > 0 ? Math.round(averageRawScore * 0.9) : 0
    const behavioralMaturity = attemptedCount > 0 ? Math.round(averageRawScore * 0.85) : 0

    // Strict Overall Score
    let overallScore = 0
    if (attemptedCount > 0) {
      overallScore = Math.round(
        technicalAccuracy * 0.45 +
        communicationClarity * 0.25 +
        behavioralMaturity * 0.15 +
        integrityScore * 0.15
      )
    }

    // Strictly penalize if more than half questions skipped
    if (attemptedCount < Math.ceil(qaList.length / 2)) {
      overallScore = Math.min(overallScore, Math.round(overallScore * 0.6))
    }

    // Grade and Status
    let grade = 'F'
    let readinessStatus = 'High Rejection Risk ❌'
    if (overallScore >= 80) {
      grade = 'A'
      readinessStatus = 'Placement Ready 🚀'
    } else if (overallScore >= 60) {
      grade = 'B'
      readinessStatus = 'Moderate Competency ⚠️'
    } else if (overallScore >= 40) {
      grade = 'C'
      readinessStatus = 'Needs Polish ⚠️'
    } else if (overallScore >= 20) {
      grade = 'D'
      readinessStatus = 'Low Readiness ❌'
    } else {
      grade = 'F'
      readinessStatus = 'High Rejection Risk ❌'
    }

    // Genuine selection probability: If score is 0, chance is 0%!
    const currentChance = Math.min(85, Math.round(overallScore * 0.75))
    const projectedChance = Math.min(92, Math.max(currentChance + 35, 65))
    const boost = projectedChance - currentChance

    if (weaknessesSet.size === 0) {
      weaknessesSet.add('Provide more concrete production examples')
      weaknessesSet.add('Structure answers using the STAR method')
    }

    const identifiedWeaknesses = Array.from(weaknessesSet).slice(0, 5)

    const actionableRoadmap = [
      {
        title: 'Master the STAR Framework (Situation, Task, Action, Result)',
        description: 'Structure every scenario response clearly stating the challenge, your technical actions, and the measurable business outcome.',
        priority: 'High',
      },
      {
        title: 'Reinforce Core Computer Science Fundamentals',
        description: 'Review hashing internals, concurrency models, and database index operations.',
        priority: 'High',
      },
      {
        title: 'Maintain Constant Eye Contact with the Camera',
        description: 'Keep your gaze locked on the webcam to project confidence and eliminate integrity flags.',
        priority: 'Medium',
      },
    ]

    return NextResponse.json({
      success: true,
      source: 'fallback-heuristic',
      overallScore,
      grade,
      readinessStatus,
      parameterScores: {
        technical: technicalAccuracy,
        communication: communicationClarity,
        behavioral: behavioralMaturity,
        integrity: integrityScore,
      },
      selectionProbability: {
        current: currentChance,
        projected: projectedChance,
        boost,
        rationale:
          overallScore === 0
            ? 'Current placement selection chance is 0% because questions were left unanswered. Consistent mock practice will bring your baseline up.'
            : `Addressing gaps in ${identifiedWeaknesses[0]} will increase your placement selection probability by +${boost}%.`,
      },
      identifiedWeaknesses,
      actionableRoadmap,
      questionReviews,
    })
  } catch (err: unknown) {
    console.error('Failed to evaluate interview answers:', err)
    return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 })
  }
}
