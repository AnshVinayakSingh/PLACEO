import mongoose, { Schema, models, model } from 'mongoose'

/**
 * One document per unique question. `companies` accumulates every company
 * we've ever cached this question under, so "also asked at" gets richer
 * over time as more companies get looked up.
 */
export interface IQuestionIndex {
  _id: string
  slug: string
  title: string
  link: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  companies: string[]
}

const QuestionIndexSchema = new Schema<IQuestionIndex>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    link: { type: String, required: true },
    difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], required: true },
    companies: { type: [String], default: [] },
  },
  { timestamps: true },
)

export const QuestionIndex = models.QuestionIndex || model<IQuestionIndex>('QuestionIndex', QuestionIndexSchema)
export default QuestionIndex
