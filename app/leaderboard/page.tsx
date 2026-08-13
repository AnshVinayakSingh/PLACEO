'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import { Flame, Trophy, UserPlus } from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'

const friends = [
  { rank: 1, name: 'Aarav Mehta', score: 942, streak: 34, avatar: '/avatar-2.png' },
  { rank: 2, name: 'Priya Nair', score: 918, streak: 29, avatar: '/avatar-3.png' },
  { rank: 3, name: 'You (Riya S.)', score: 887, streak: 22, avatar: '/avatar-1.png' },
  { rank: 4, name: 'Karan Verma', score: 845, streak: 18, avatar: '/avatar-4.png' },
  { rank: 5, name: 'Sana Iqbal', score: 812, streak: 15, avatar: '/avatar-2.png' },
  { rank: 6, name: 'Rohan Das', score: 774, streak: 11, avatar: '/avatar-3.png' },
]

const medalColor = ['oklch(0.85 0.16 90)', 'oklch(0.8 0.02 275)', 'oklch(0.68 0.14 55)']

export default function LeaderboardPage() {
  return (
    <PageShell
      title="Friends & Leaderboard"
      description="Compete with friends, stay consistent, and climb the ranks."
      headerAction={
        <button className="glass flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/5">
          <UserPlus className="size-4" />
          Add Friend
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {friends.slice(0, 3).map((f, i) => (
          <motion.div
            key={f.rank}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="glass relative rounded-2xl p-5 text-center"
          >
            <Trophy className="mx-auto size-6" style={{ color: medalColor[i] }} />
            <Image
              src={f.avatar}
              alt={f.name}
              width={56}
              height={56}
              className="mx-auto mt-3 size-14 rounded-full border-2 object-cover"
              style={{ borderColor: medalColor[i] }}
            />
            <p className="mt-2 text-sm font-semibold">{f.name}</p>
            <p className="font-display text-xl font-bold text-gradient">{f.score}</p>
          </motion.div>
        ))}
      </div>

      <div className="glass mt-4 overflow-hidden rounded-2xl">
        <div className="hidden grid-cols-[3rem_1fr_6rem_6rem] gap-2 border-b border-border px-5 py-3 text-xs font-medium text-muted-foreground sm:grid">
          <span>Rank</span>
          <span>Student</span>
          <span>Streak</span>
          <span>Score</span>
        </div>
        {friends.map((f, i) => (
          <motion.div
            key={f.rank}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className={`flex items-center gap-3 border-b border-border/60 px-5 py-3.5 last:border-0 sm:grid sm:grid-cols-[3rem_1fr_6rem_6rem] ${
              f.name.startsWith('You') ? 'bg-brand-blue/5' : ''
            }`}
          >
            <span className="w-8 text-sm font-bold text-muted-foreground sm:w-auto">#{f.rank}</span>
            <div className="flex flex-1 items-center gap-2.5">
              <Image src={f.avatar} alt={f.name} width={32} height={32} className="size-8 rounded-full object-cover" />
              <span className="text-sm font-medium">{f.name}</span>
            </div>
            <span className="hidden items-center gap-1 text-sm text-amber-400 sm:flex">
              <Flame className="size-3.5" /> {f.streak}d
            </span>
            <span className="ml-auto text-sm font-semibold sm:ml-0">{f.score}</span>
          </motion.div>
        ))}
      </div>
    </PageShell>
  )
}
