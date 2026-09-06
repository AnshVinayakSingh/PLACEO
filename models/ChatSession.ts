import mongoose, { Schema, models, model } from 'mongoose'

export type ChatRole = 'user' | 'model'

export interface IChatMessage {
  role: ChatRole
  text: string
  quotedText?: string
}

export interface IChatSession {
  _id: string
  userId: string
  title: string
  messages: IChatMessage[]
  updatedAt: Date
  createdAt: Date
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, enum: ['user', 'model'], required: true },
    text: { type: String, required: true },
    quotedText: { type: String },
  },
  { _id: false },
)

const ChatSessionSchema = new Schema<IChatSession>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, default: 'New chat' },
    messages: { type: [ChatMessageSchema], default: [] },
  },
  { timestamps: true },
)

export const ChatSession = models.ChatSession || model<IChatSession>('ChatSession', ChatSessionSchema)
export default ChatSession
