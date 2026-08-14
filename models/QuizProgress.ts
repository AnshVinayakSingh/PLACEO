import { Schema, models, model } from 'mongoose'

export interface IQuizProgress {
  userId: string
  skill: string
  levelIndex: number // index into that skill's curriculum — the user's current "level"
  questionsAnswered: number
  correctAnswered: number
  updatedAt: Date
}

const QuizProgressSchema = new Schema<IQuizProgress>(
  {
    userId: { type: String, required: true, index: true },
    skill: { type: String, required: true },
    levelIndex: { type: Number, default: 0 },
    questionsAnswered: { type: Number, default: 0 },
    correctAnswered: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
)

QuizProgressSchema.index({ userId: 1, skill: 1 }, { unique: true })

export const QuizProgress = models.QuizProgress || model<IQuizProgress>('QuizProgress', QuizProgressSchema)
export default QuizProgress
