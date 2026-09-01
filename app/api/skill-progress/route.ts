import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { QuizProgress, type ISubtopicStat } from '@/models/QuizProgress'
import { getCurriculum, SKILL_CURRICULUM } from '@/lib/skill-curriculum'

function computeWeakTopic(subtopicStats: ISubtopicStat[]): string | null {
  const attempted = subtopicStats.filter((s) => s.total > 0)
  if (attempted.length === 0) return null
  // Weak = most wrong answers overall; ties broken by lowest accuracy.
  return attempted
    .slice()
    .sort((a, b) => {
      const wrongA = a.total - a.correct
      const wrongB = b.total - b.correct
      if (wrongB !== wrongA) return wrongB - wrongA
      return a.correct / a.total - b.correct / b.total
    })[0].subtopic
}

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const skill = searchParams.get('skill')

    await connectDB()

    if (!skill) {
      // Summary for every skill in the curriculum — used by the Skill Analyzer overview cards.
      const all = await QuizProgress.find({ userId: session.userId })
      const summary = Object.keys(SKILL_CURRICULUM).map((skillName) => {
        const p = all.find((x) => x.skill === skillName)
        const questionsAnswered = p?.questionsAnswered ?? 0
        const correctAnswered = p?.correctAnswered ?? 0
        const accuracy = questionsAnswered > 0 ? Math.round((correctAnswered / questionsAnswered) * 100) : 0
        return {
          skill: skillName,
          accuracy,
          questionsAnswered,
          weakTopic: p ? computeWeakTopic(p.subtopicStats) : null,
          levelIndex: p?.levelIndex ?? 0,
        }
      })
      return NextResponse.json({ summary })
    }

    const progress = await QuizProgress.findOne({ userId: session.userId, skill })
    const curriculum = getCurriculum(skill)
    const accuracy =
      progress && progress.questionsAnswered > 0
        ? Math.round((progress.correctAnswered / progress.questionsAnswered) * 100)
        : 0

    return NextResponse.json({
      progress: progress
        ? {
            levelIndex: progress.levelIndex,
            levelName: curriculum[Math.min(progress.levelIndex, curriculum.length - 1)],
            questionsAnswered: progress.questionsAnswered,
            correctAnswered: progress.correctAnswered,
            accuracy,
            subtopicStats: progress.subtopicStats,
            weakTopic: computeWeakTopic(progress.subtopicStats),
          }
        : null,
      curriculum,
    })
  } catch (err) {
    console.error('Quiz progress GET error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

    const { skill, subtopic, correctCount, totalCount, startFromZero } = (await req.json()) as {
      skill: string
      subtopic: string
      correctCount: number
      totalCount: number
      startFromZero?: boolean
    }
    if (!skill || !subtopic) {
      return NextResponse.json({ error: 'skill and subtopic are required.' }, { status: 400 })
    }

    await connectDB()
    const curriculum = getCurriculum(skill)

    let progress = await QuizProgress.findOne({ userId: session.userId, skill })
    if (!progress) {
      progress = await QuizProgress.create({ userId: session.userId, skill, levelIndex: 0, subtopicStats: [] })
    }

    if (startFromZero) {
      progress.levelIndex = 0
      progress.questionsAnswered = 0
      progress.correctAnswered = 0
      progress.subtopicStats = []
    }

    if (typeof correctCount === 'number' && typeof totalCount === 'number' && totalCount > 0) {
      progress.questionsAnswered += totalCount
      progress.correctAnswered += correctCount

      const existingStat = progress.subtopicStats.find((s) => s.subtopic === subtopic)
      if (existingStat) {
        existingStat.correct += correctCount
        existingStat.total += totalCount
      } else {
        progress.subtopicStats.push({ subtopic, correct: correctCount, total: totalCount })
      }

      // Only auto-advance the curriculum "level" when practicing the current
      // frontier subtopic and scoring ≥80% — cherry-picking other subtopics
      // still counts toward stats/weak-topic detection but doesn't skip levels.
      const isFrontierSubtopic = subtopic === curriculum[progress.levelIndex]
      const passed = correctCount / totalCount >= 0.8
      if (isFrontierSubtopic && passed && progress.levelIndex < curriculum.length - 1) {
        progress.levelIndex += 1
      }
    }

    await progress.save()
    const accuracy =
      progress.questionsAnswered > 0
        ? Math.round((progress.correctAnswered / progress.questionsAnswered) * 100)
        : 0

    return NextResponse.json({
      progress: {
        levelIndex: progress.levelIndex,
        levelName: curriculum[Math.min(progress.levelIndex, curriculum.length - 1)],
        questionsAnswered: progress.questionsAnswered,
        correctAnswered: progress.correctAnswered,
        accuracy,
        subtopicStats: progress.subtopicStats,
        weakTopic: computeWeakTopic(progress.subtopicStats),
      },
    })
  } catch (err) {
    console.error('Quiz progress POST error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
