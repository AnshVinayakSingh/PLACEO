'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'motion/react'
import { Crown, Loader2, Trophy, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

type Entry = {
  id: string
  name: string
  avatarUrl: string
  isYou: boolean
  stats: { score: number }
}

const rankStyles: Record<number, string> = {
  1: 'text-amber-300 bg-amber-300/15 ring-amber-300/40',
  2: 'text-slate-200 bg-slate-200/15 ring-slate-200/40',
  3: 'text-orange-300 bg-orange-300/15 ring-orange-300/40',
}

export function Leaderboard() {
  const [entries, setEntries] = useState<Entry[] | null>(null)

  useEffect(() => {
    fetch('/api/friends')
      .then((res) => res.json())
      .then((data) => setEntries(data.leaderboard || []))
      .catch(() => setEntries([]))
  }, [])

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-5 md:p-6">
      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-brand-blue" />
          <h3 className="font-display text-lg font-semibold">Friend Leaderboard</h3>
        </div>
        <Link href="/leaderboard" className="text-xs font-medium text-brand-cyan hover:underline">
          View all
        </Link>
      </div>

      {!entries ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : entries.length <= 1 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <UserPlus className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No friends yet — add one with their PLACEO ID to start comparing progress.
          </p>
          <Link href="/leaderboard" className="mt-1 text-xs font-medium text-brand-cyan hover:underline">
            Add a friend
          </Link>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col gap-2">
          {entries.slice(0, 5).map((entry, i) => {
            const rank = i + 1
            const topThree = rank <= 3
            return (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
                  entry.isYou ? 'glass-strong glow-ring' : 'hover:bg-secondary/50',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1',
                    topThree ? rankStyles[rank] : 'bg-secondary text-muted-foreground ring-transparent',
                  )}
                >
                  {rank}
                </span>
                <div className="relative shrink-0">
                  {entry.avatarUrl ? (
                    <Image
                      src={entry.avatarUrl}
                      alt={entry.name}
                      width={36}
                      height={36}
                      unoptimized
                      className="size-9 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-muted-foreground">
                      {entry.name[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  {rank === 1 && <Crown className="absolute -right-1.5 -top-2 size-4 rotate-12 text-amber-300" />}
                </div>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {entry.name}
                  {entry.isYou && <span className="ml-1.5 text-xs text-brand-cyan">(you)</span>}
                </span>
                <span className="shrink-0 font-display text-sm font-semibold tabular-nums">
                  {entry.stats.score.toLocaleString()}
                </span>
              </motion.li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
