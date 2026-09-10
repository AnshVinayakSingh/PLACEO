import mongoose, { Schema, models, model } from 'mongoose'

export type InterviewAuditSeverity = 'info' | 'warning' | 'critical'

export interface IInterviewAuditEvent {
  type: string
  severity: InterviewAuditSeverity
  at: Date
  detail?: string
  confidence?: number
  metadata?: Record<string, unknown>
}

export interface IInterviewSession {
  sessionId: string
  userId: string
  track: string
  level: number
  questionCount: number
  persona: 'priya' | 'vikram'
  status: 'created' | 'live' | 'completed' | 'disqualified' | 'abandoned'
  strikeCount: number
  startedAt?: Date
  endedAt?: Date
  durationSeconds?: number
  auditEvents: IInterviewAuditEvent[]
  transcript?: Array<{ role: 'interviewer' | 'candidate'; text: string; at: Date }>
  finalScore?: number
  // Interviewer questions carried over from this candidate's recent past sessions,
  // captured at session-creation time so the live interviewer can avoid repeating them.
  priorQuestionsAsked?: string[]
}

const AuditEventSchema = new Schema<IInterviewAuditEvent>(
  {
    type: { type: String, required: true, maxlength: 80 },
    severity: { type: String, enum: ['info', 'warning', 'critical'], required: true },
    at: { type: Date, required: true },
    detail: { type: String, maxlength: 1000 },
    confidence: { type: Number, min: 0, max: 1 },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false },
)

const InterviewSessionSchema = new Schema<IInterviewSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    track: { type: String, required: true },
    level: { type: Number, required: true, min: 0, max: 5 },
    questionCount: { type: Number, required: true, min: 1, max: 30 },
    persona: { type: String, enum: ['priya', 'vikram'], required: true },
    status: { type: String, enum: ['created', 'live', 'completed', 'disqualified', 'abandoned'], default: 'created', index: true },
    strikeCount: { type: Number, default: 0, min: 0, max: 2 },
    startedAt: Date,
    endedAt: Date,
    durationSeconds: Number,
    auditEvents: { type: [AuditEventSchema], default: [] },
    transcript: { type: [{ role: String, text: String, at: Date }], default: [] },
    finalScore: Number,
    priorQuestionsAsked: { type: [String], default: [] },
  },
  { timestamps: true },
)

InterviewSessionSchema.index({ userId: 1, createdAt: -1 })

export const InterviewSession = models.InterviewSession || model<IInterviewSession>('InterviewSession', InterviewSessionSchema)
export default InterviewSession
