import mongoose, { Schema, models, model } from 'mongoose'

export interface IUser {
  _id: string
  name: string
  email: string
  passwordHash?: string
  googleId?: string
  avatarUrl?: string
  bio?: string
  linkedinUrl?: string
  leetcodeUrl?: string
  targetRole?: string
  college?: string
  createdAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Not required — users who sign up via Google won't have a password.
    passwordHash: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 200 },
    linkedinUrl: { type: String, default: '' },
    leetcodeUrl: { type: String, default: '' },
    targetRole: { type: String, default: 'Full Stack Developer' },
    college: { type: String, default: '' },
  },
  { timestamps: true },
)

export const User = models.User || model<IUser>('User', UserSchema)
export default User
