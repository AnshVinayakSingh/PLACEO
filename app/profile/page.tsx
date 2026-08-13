'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { Award, Flame, GraduationCap, Mail, Mic, Target, Trophy } from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'

const stats = [
  { label: 'Placement Readiness', value: '82%', icon: Target },
  { label: 'Coding Streak', value: '22 days', icon: Flame },
  { label: 'Mock Interviews', value: '14', icon: Mic },
  { label: 'Rank', value: '#3', icon: Trophy },
]

const achievements = [
  { title: '30-Day Streak', desc: 'Studied consistently for 30 days', color: 'oklch(0.75 0.15 220)' },
  { title: 'DSA Master', desc: 'Completed 200+ DSA problems', color: 'oklch(0.62 0.24 300)' },
  { title: 'Interview Ready', desc: 'Scored 85+ in 5 mock interviews', color: 'oklch(0.7 0.19 60)' },
  { title: 'Top 10', desc: 'Reached top 10 on leaderboard', color: 'oklch(0.85 0.16 90)' },
]

export default function ProfilePage() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
  }, [])

  return (
    <PageShell title="Profile" description="Your career prep journey at a glance.">
      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <Image
            src="/avatar-1.png"
            alt={user?.name ?? 'Student'}
            width={88}
            height={88}
            className="glow-ring size-[88px] rounded-2xl object-cover"
          />
          <div className="text-center sm:text-left">
            <h2 className="font-display text-xl font-bold">{user?.name ?? 'Loading...'}</h2>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
              <Mail className="size-3.5" /> {user?.email ?? ''}
            </p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
              <GraduationCap className="size-3.5" /> Full Stack Developer track
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="glass rounded-2xl p-5"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-blue/15 text-brand-cyan">
                <Icon className="size-5" />
              </span>
              <p className="font-display mt-3 text-2xl font-bold">{s.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          )
        })}
      </div>

      <div className="glass mt-4 rounded-2xl p-6">
        <h3 className="font-display flex items-center gap-2 text-sm font-semibold">
          <Award className="size-4 text-brand-cyan" /> Achievements
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {achievements.map((a) => (
            <div key={a.title} className="glass flex items-center gap-3 rounded-xl p-4">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: `color-mix(in oklch, ${a.color} 22%, transparent)`, color: a.color }}
              >
                <Trophy className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
