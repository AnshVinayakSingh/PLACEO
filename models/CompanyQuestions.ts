import mongoose, { Schema, models, model } from 'mongoose'

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD'

export interface ICachedQuestion {
  title: string
  slug: string // normalized title, used as the cross-company join key
  difficulty: QuestionDifficulty
  link: string
  platform: string // 'LeetCode' | 'GeeksforGeeks' | ...
  tags: string[]
  frequency: number
}

export interface ICompanyQuestions {
  _id: string
  company: string // canonical display name, e.g. "Amazon"
  companySlug: string // lowercase, used for lookups, e.g. "amazon"
  sourceFolder: string // the exact GitHub folder name that worked, for future refetches
  questions: ICachedQuestion[]
  fetchedAt: Date
  notFound?: boolean // true if we tried and the company has no data upstream
}

const CachedQuestionSchema = new Schema<ICachedQuestion>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], required: true },
    link: { type: String, required: true },
    platform: { type: String, required: true, default: 'LeetCode' },
    tags: { type: [String], default: [] },
    frequency: { type: Number, default: 0 },
  },
  { _id: false },
)

const CompanyQuestionsSchema = new Schema<ICompanyQuestions>(
  {
    company: { type: String, required: true },
    companySlug: { type: String, required: true, unique: true, index: true },
    sourceFolder: { type: String, default: '' },
    questions: { type: [CachedQuestionSchema], default: [] },
    fetchedAt: { type: Date, default: Date.now },
    notFound: { type: Boolean, default: false },
  },
  { timestamps: true },
)

export const CompanyQuestions =
  models.CompanyQuestions || model<ICompanyQuestions>('CompanyQuestions', CompanyQuestionsSchema)
export default CompanyQuestions
