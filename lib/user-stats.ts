import { connectDB } from './db'
import { QuizProgress } from '@/models/QuizProgress'
import { ChatSession } from '@/models/ChatSession'
import { SKILL_CURRICULUM } from './skill-curriculum'

export type UserStats = {
  avgAccuracy: number
  questionsAnswered: number
  skillsPracticed: number
  totalSkills: number
  mentorSessions: number
  /** Simple, transparent ranking score — correct quiz answers weigh the most,
   *  with small bonuses for breadth (skills practiced) and engagement (mentor use). */
  score: number
}

export async function getUserStats(userId: string): Promise<UserStats> {
  await connectDB()

  const [progress, mentorSessions] = await Promise.all([
    QuizProgress.find({ userId }),
    ChatSession.countDocuments({ userId }),
  ])

  const totalSkills = Object.keys(SKILL_CURRICULUM).length
  const attempted = progress.filter((p) => p.questionsAnswered > 0)

  const avgAccuracy =
    attempted.length > 0
      ? Math.round(
          attempted.reduce((sum, p) => sum + (p.correctAnswered / p.questionsAnswered) * 100, 0) /
            attempted.length,
        )
      : 0

  const questionsAnswered = progress.reduce((sum, p) => sum + p.questionsAnswered, 0)
  const correctAnswered = progress.reduce((sum, p) => sum + p.correctAnswered, 0)
  const skillsPracticed = attempted.length

  const score = correctAnswered * 10 + skillsPracticed * 25 + mentorSessions * 2

  return { avgAccuracy, questionsAnswered, skillsPracticed, totalSkills, mentorSessions, score }
}
