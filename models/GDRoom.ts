import { Schema, models, model } from 'mongoose'

export type GDRoomMode = 'solo' | 'multiplayer'
export type GDRoomStatus = 'lobby' | 'active' | 'completed' | 'cancelled'
export type GDMemberStatus = 'invited' | 'joined' | 'declined' | 'left'

export interface IGDMember {
  userId: string
  name: string
  placeoId: string
  avatarUrl?: string
  status: GDMemberStatus
  isHost: boolean
  invitedAt: Date
  joinedAt?: Date
}

export interface IGDTranscriptLine {
  speaker: string // user name, or "AI Moderator"
  speakerUserId?: string // absent for the AI
  text: string
  timestamp: Date
  flaggedOffTopic?: boolean
}

export interface IGDRoom {
  _id: string
  hostId: string
  mode: GDRoomMode
  companyName: string
  jobRole: string
  topic?: string
  status: GDRoomStatus
  members: IGDMember[]
  transcript: IGDTranscriptLine[]
  maxMembers: number
  createdAt: Date
  startedAt?: Date
  endedAt?: Date
  feedbackByUserId?: Record<string, unknown>
}

const GDMemberSchema = new Schema<IGDMember>(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    placeoId: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    status: { type: String, enum: ['invited', 'joined', 'declined', 'left'], default: 'invited' },
    isHost: { type: Boolean, default: false },
    invitedAt: { type: Date, default: Date.now },
    joinedAt: { type: Date },
  },
  { _id: false },
)

const GDTranscriptLineSchema = new Schema<IGDTranscriptLine>(
  {
    speaker: { type: String, required: true },
    speakerUserId: { type: String },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    flaggedOffTopic: { type: Boolean, default: false },
  },
  { _id: false },
)

const GDRoomSchema = new Schema<IGDRoom>(
  {
    hostId: { type: String, required: true, index: true },
    mode: { type: String, enum: ['solo', 'multiplayer'], required: true },
    companyName: { type: String, required: true },
    jobRole: { type: String, required: true },
    topic: { type: String },
    status: { type: String, enum: ['lobby', 'active', 'completed', 'cancelled'], default: 'lobby' },
    members: { type: [GDMemberSchema], default: [] },
    transcript: { type: [GDTranscriptLineSchema], default: [] },
    maxMembers: { type: Number, default: 6 },
    startedAt: { type: Date },
    endedAt: { type: Date },
    feedbackByUserId: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export const GDRoom = models.GDRoom || model<IGDRoom>('GDRoom', GDRoomSchema)
export default GDRoom
