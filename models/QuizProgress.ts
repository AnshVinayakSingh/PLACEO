import { Schema, models, model } from 'mongoose'

export interface ISubtopicStat {
  subtopic: string
  correct: number
  total: number
}

export interface IQuizProgress {
  userId: string
  skill: string
  levelIndex: number // furthest index reached in that skill's curriculum — used for "Continue"
  questionsAnswered: number
  correctAnswered: number
  subtopicStats: ISubtopicStat[]
  updatedAt: Date
}

const SubtopicStatSchema = new Schema<ISubtopicStat>(
  {
    subtopic: { type: String, required: true },
    correct: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false },
)

const QuizProgressSchema = new Schema<IQuizProgress>(
  {
    userId: { type: String, required: true, index: true },
    skill: { type: String, required: true },
    levelIndex: { type: Number, default: 0 },
    questionsAnswered: { type: Number, default: 0 },
    correctAnswered: { type: Number, default: 0 },
    subtopicStats: { type: [SubtopicStatSchema], default: [] },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
)

QuizProgressSchema.index({ userId: 1, skill: 1 }, { unique: true })

export const QuizProgress = models.QuizProgress || model<IQuizProgress>('QuizProgress', QuizProgressSchema)
export default QuizProgress
