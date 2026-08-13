import mongoose, { Schema, models, model } from 'mongoose'

export interface IUser {
  _id: string
  name: string
  email: string
  passwordHash: string
  targetRole?: string
  college?: string
  createdAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    targetRole: { type: String, default: 'Full Stack Developer' },
    college: { type: String, default: '' },
  },
  { timestamps: true },
)

export const User = models.User || model<IUser>('User', UserSchema)
export default User
