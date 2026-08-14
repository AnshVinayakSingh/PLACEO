import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { QuizProgress } from '@/models/QuizProgress'
import { getCurriculum } from '@/lib/skill-curriculum'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const skill = searchParams.get('skill')
    if (!skill) return NextResponse.json({ error: 'skill is required.' }, { status: 400 })

    await connectDB()
    const progress = await QuizProgress.findOne({ userId: session.userId, skill })
    const curriculum = getCurriculum(skill)

    return NextResponse.json({
      progress: progress
        ? {
            levelIndex: progress.levelIndex,
            levelName: curriculum[Math.min(progress.levelIndex, curriculum.length - 1)],
            questionsAnswered: progress.questionsAnswered,
            correctAnswered: progress.correctAnswered,
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

    const { skill, correctCount, totalCount, startFromZero } = (await req.json()) as {
      skill: string
      correctCount: number
      totalCount: number
      startFromZero?: boolean
    }
    if (!skill) return NextResponse.json({ error: 'skill is required.' }, { status: 400 })

    await connectDB()
    const curriculum = getCurriculum(skill)

    let progress = await QuizProgress.findOne({ userId: session.userId, skill })
    if (!progress) {
      progress = await QuizProgress.create({ userId: session.userId, skill, levelIndex: 0 })
    }

    if (startFromZero) {
      progress.levelIndex = 0
      progress.questionsAnswered = 0
      progress.correctAnswered = 0
    }

    if (typeof correctCount === 'number' && typeof totalCount === 'number' && totalCount > 0) {
      progress.questionsAnswered += totalCount
      progress.correctAnswered += correctCount
      // Score ≥80% on a batch → advance to the next level in the curriculum.
      const passed = correctCount / totalCount >= 0.8
      if (passed && progress.levelIndex < curriculum.length - 1) {
        progress.levelIndex += 1
      }
    }

    await progress.save()

    return NextResponse.json({
      progress: {
        levelIndex: progress.levelIndex,
        levelName: curriculum[Math.min(progress.levelIndex, curriculum.length - 1)],
        questionsAnswered: progress.questionsAnswered,
        correctAnswered: progress.correctAnswered,
      },
    })
  } catch (err) {
    console.error('Quiz progress POST error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
