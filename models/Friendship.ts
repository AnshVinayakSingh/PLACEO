import { Schema, models, model } from 'mongoose'

export type FriendshipStatus = 'pending' | 'accepted'

export interface IFriendship {
  _id: string
  requesterId: string
  recipientId: string
  status: FriendshipStatus
  createdAt: Date
}

const FriendshipSchema = new Schema<IFriendship>(
  {
    requesterId: { type: String, required: true, index: true },
    recipientId: { type: String, required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

// Prevents sending the exact same request twice; the reverse-direction case
// (B already requested A) is checked explicitly in the API route.
FriendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true })

export const Friendship = models.Friendship || model<IFriendship>('Friendship', FriendshipSchema)
export default Friendship
