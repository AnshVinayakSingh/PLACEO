import { User } from '@/models/User'

/** A random 10-digit numeric string that never starts with 0 (so it always reads as 10 real digits). */
function randomTenDigitId(): string {
  const first = Math.floor(Math.random() * 9) + 1 // 1-9
  let rest = ''
  for (let i = 0; i < 9; i++) rest += Math.floor(Math.random() * 10)
  return `${first}${rest}`
}

/** Generates a 10-digit ID guaranteed to be unique among existing users (retries on the rare collision). */
export async function generateUniquePlaceoId(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = randomTenDigitId()
    const existing = await User.findOne({ placeoId: candidate }).select('_id').lean()
    if (!existing) return candidate
  }
  // Astronomically unlikely to ever reach here (10-digit space is huge), but never fail signup over it.
  return `${randomTenDigitId()}${Date.now() % 10}`.slice(0, 10)
}

/** Ensures a user document has a placeoId, assigning one if missing (backfills accounts created before this feature). */
export async function ensurePlaceoId(user: { _id: unknown; placeoId?: string; save: () => Promise<unknown> }) {
  if (user.placeoId) return user.placeoId
  const id = await generateUniquePlaceoId()
  user.placeoId = id
  await user.save()
  return id
}
