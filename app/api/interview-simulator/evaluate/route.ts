import { NextResponse } from 'next/server'

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EvaluateRequest
    const { track = 'hr', level = 2, violationsCount = 0, qaList = [] } = body

    if (!qaList || qaList.length === 0) {
      return NextResponse.json(
        { error: 'No interview responses found to evaluate.' },
        { status: 400 }
      )
    }

    let totalPoints = 0
    let maxPossiblePoints = qaList.length * 100
    const questionReviews = []
    const weaknessesSet = new Set<string>()

    for (const qa of qaList) {
      const answer = (qa.userTranscript || '').trim()
      const wordCount = answer ? answer.split(/\s+/).length : 0
      const expectedPoints = qa.expectedKeyPoints || []

      let qScore = 0
      const missingPoints: string[] = []
      let feedback = ''

      if (wordCount < 5) {
        qScore = 15
        feedback = 'Answer was either empty or too brief to evaluate depth.'
        if (qa.skill) weaknessesSet.add(`Unfamiliar with basic ${qa.skill} concepts`)
        else weaknessesSet.add('Gave vague or incomplete answers without technical substance')
        missingPoints.push(...expectedPoints)
      } else {
        // Keyword & key point matching
        let matches = 0
        const lowerAnswer = answer.toLowerCase()
        for (const pt of expectedPoints) {
          const ptKeywords = pt.toLowerCase().split(/[^a-z0-9]+/).filter((w: string) => w.length > 3)
          const matchedWords = ptKeywords.filter((kw: string) => lowerAnswer.includes(kw))
          if (matchedWords.length >= Math.min(2, ptKeywords.length)) {
            matches++
          } else {
            missingPoints.push(pt)
          }
        }

        const coverageRatio = expectedPoints.length > 0 ? matches / expectedPoints.length : 0.5
        
        // Base score based on coverage + word count + structure
        let base = Math.min(60, wordCount * 1.5)
        let bonus = coverageRatio * 40

        // Strictness scaling with difficulty level
        const levelPenalty = level * 2
        qScore = Math.max(20, Math.min(100, Math.round(base + bonus - levelPenalty)))

        if (qScore >= 80) {
          feedback = 'Strong answer! Demonstrated conceptual clarity and structured reasoning.'
        } else if (qScore >= 55) {
          feedback = 'Decent attempt, but missed key technical terms or architectural tradeoffs.'
          if (qa.skill) weaknessesSet.add(`Superficial depth in ${qa.skill}`)
        } else {
          feedback = 'Hesitant or fragmented answer. Lacked specific examples and core principles.'
          if (qa.skill) weaknessesSet.add(`Struggled with core logic in ${qa.skill}`)
          else weaknessesSet.add('Weak articulation under pressure')
        }
      }

      totalPoints += qScore

      questionReviews.push({
        id: qa.questionId,
        question: qa.question,
        candidateAnswer: answer || '[No response recorded]',
        score: qScore,
        feedback,
        missingPoints,
        idealModelAnswer: qa.modelAnswer || 'Clear, structured explanation with concrete examples and impact metrics.',
      })
    }

    const averageRawScore = Math.round(totalPoints / qaList.length)

    // Proctoring integrity calculation
    let integrityScore = 100
    if (violationsCount === 1) {
      integrityScore = 70
      weaknessesSet.add('Lost eye contact during the session (detected looking away/phone warning)')
    } else if (violationsCount >= 2) {
      integrityScore = 30
      weaknessesSet.add('Severe proctoring violation: Multiple eye contact / device usage infractions')
    }

    // Dimension breakdown
    const technicalAccuracy = Math.max(25, Math.min(95, Math.round(averageRawScore * 0.95)))
    const communicationClarity = Math.max(30, Math.min(95, Math.round(averageRawScore * 0.9 + (violationsCount > 0 ? -10 : 5))))
    const behavioralMaturity = Math.max(35, Math.min(92, Math.round(averageRawScore * 0.85 + 10)))

    // Overall strict weighted score
    const weightedOverall = Math.max(
      15,
      Math.min(
        100,
        Math.round(
          technicalAccuracy * 0.4 +
          communicationClarity * 0.25 +
          behavioralMaturity * 0.2 +
          integrityScore * 0.15
        )
      )
    )

    let grade = 'B'
    let readinessStatus = 'Needs Polish ⚠️'
    if (weightedOverall >= 85) {
      grade = 'A+'
      readinessStatus = 'Placement Ready 🚀'
    } else if (weightedOverall >= 75) {
      grade = 'A'
      readinessStatus = 'Placement Ready 🚀'
    } else if (weightedOverall >= 60) {
      grade = 'B'
      readinessStatus = 'Needs Polish ⚠️'
    } else if (weightedOverall >= 45) {
      grade = 'C'
      readinessStatus = 'Moderate Risk ⚠️'
    } else {
      grade = 'D'
      readinessStatus = 'High Rejection Risk ❌'
    }

    // Selection probability calculation
    const currentChance = Math.max(15, Math.min(88, Math.round(weightedOverall * 0.8)))
    const projectedChance = Math.min(94, Math.round(currentChance + 38))
    const boost = projectedChance - currentChance

    // Default weaknesses if set is empty
    if (weaknessesSet.size === 0) {
      weaknessesSet.add('Can deliver more concise opening summaries')
      weaknessesSet.add('Add quantified metrics (e.g. latency, scale) to your answers')
    }

    const identifiedWeaknesses = Array.from(weaknessesSet).slice(0, 5)

    const actionableRoadmap = [
      {
        title: 'Master the STAR Framework (Situation, Task, Action, Result)',
        description: 'Frame every project or scenario answer by stating the problem, your individual contribution, technical tools used, and the measurable business outcome.',
        priority: 'High',
      },
      {
        title: 'Reinforce Core Fundamentals & Internal Mechanisms',
        description: 'Instead of just listing tools, explain the internal data structures, caching layers, and complexity trade-offs (e.g., HashMap collision trees, GIL, ACID).',
        priority: 'High',
      },
      {
        title: 'Maintain Unbroken Eye Contact & Eliminate Filler Words',
        description: 'Keep your gaze fixed directly at the webcam lens. Replace verbal crutches like "um" and "basically" with deliberate, confident 1-second pauses.',
        priority: 'Medium',
      },
    ]

    return NextResponse.json({
      success: true,
      overallScore: weightedOverall,
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
        rationale: `Improving identified gaps in ${identifiedWeaknesses[0] || 'core concepts'} and refining structured delivery will elevate your on-campus selection probability by +${boost}%.`,
      },
      identifiedWeaknesses,
      actionableRoadmap,
      questionReviews,
    })
  } catch (err: unknown) {
    console.error('Failed to evaluate interview answers:', err)
    return NextResponse.json(
      { error: 'Could not evaluate interview. Please try again.' },
      { status: 500 }
    )
  }
}
