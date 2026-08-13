'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import { Crown, Trophy } from 'lucide-react'
import { leaderboard } from '@/lib/dashboard-data'
import { cn } from '@/lib/utils'

const rankStyles: Record<number, string> = {
  1: 'text-amber-300 bg-amber-300/15 ring-amber-300/40',
  2: 'text-slate-200 bg-slate-200/15 ring-slate-200/40',
  3: 'text-orange-300 bg-orange-300/15 ring-orange-300/40',
}

export function Leaderboard() {
  return (
    <div className="glass flex h-full flex-col rounded-2xl p-5 md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <Trophy className="size-5 text-brand-blue" />
        <h3 className="font-display text-lg font-semibold">Friend Leaderboard</h3>
      </div>
      <ul className="flex flex-1 flex-col gap-2">
        {leaderboard.map((leader, i) => {
          const isYou = leader.name === 'You'
          const topThree = leader.rank <= 3
          return (
            <motion.li
              key={leader.rank}
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className={cn(
                'flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
                isYou ? 'glass-strong glow-ring' : 'hover:bg-secondary/50',
              )}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1',
                  topThree
                    ? rankStyles[leader.rank]
                    : 'bg-secondary text-muted-foreground ring-transparent',
                )}
              >
                {leader.rank}
              </span>
              <div className="relative shrink-0">
                <Image
                  src={leader.avatar || '/placeholder.svg'}
                  alt={leader.name}
                  width={36}
                  height={36}
                  className="size-9 rounded-lg object-cover"
                />
                {leader.rank === 1 && (
                  <Crown className="absolute -right-1.5 -top-2 size-4 rotate-12 text-amber-300" />
                )}
              </div>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {leader.name}
                {isYou && <span className="ml-1.5 text-xs text-brand-cyan">(you)</span>}
              </span>
              <span className="shrink-0 font-display text-sm font-semibold tabular-nums">
                {leader.score.toLocaleString()}
              </span>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}
