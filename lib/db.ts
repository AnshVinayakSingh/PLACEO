import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

type MongooseCache = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// eslint-disable-next-line no-var
declare global {
  var _mongooseCache: MongooseCache | undefined
}

const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null }
global._mongooseCache = cache

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Add it in your .env.local (development) or Vercel Project Settings → Environment Variables (production).',
    )
  }

  if (cache.conn) return cache.conn

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      dbName: 'placeo',
    })
  }

  cache.conn = await cache.promise
  return cache.conn
}
