'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'motion/react'
import {
  Award,
  Check,
  Code2,
  Copy,
  Flame,
  GraduationCap,
  Mail,
  Mic,
  Pencil,
  Target,
  Trophy,
} from 'lucide-react'
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

type Profile = {
  name: string
  email: string
  avatarUrl: string
  bio: string
  linkedinUrl: string
  leetcodeUrl: string
  targetRole: string
  college: string
  placeoId: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [idCopied, setIdCopied] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => setProfile(data.user))
      .catch(() => setProfile(null))
  }, [])

  function handleCopyId() {
    if (!profile?.placeoId) return
    navigator.clipboard.writeText(profile.placeoId).then(() => {
      setIdCopied(true)
      setTimeout(() => setIdCopied(false), 1600)
    })
  }

  return (
    <PageShell title="Profile" description="Your career prep journey at a glance.">
      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="glow-ring flex size-[88px] items-center justify-center overflow-hidden rounded-2xl bg-secondary">
            {profile?.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.name}
                width={88}
                height={88}
                className="size-[88px] object-cover"
                unoptimized
              />
            ) : (
              <span className="text-3xl font-semibold text-muted-foreground">
                {profile?.name?.[0]?.toUpperCase() ?? '?'}
              </span>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
              <h2 className="font-display text-xl font-bold">{profile?.name ?? 'Loading...'}</h2>
              <Link
                href="/settings"
                className="glass flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-3.5" />
                Edit Profile
              </Link>
            </div>
            {profile?.placeoId && (
              <button
                onClick={handleCopyId}
                title="Click to copy your Placeo ID"
                className="glass mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="text-brand-cyan">ID:</span>
                <span className="font-mono tracking-wide">{profile.placeoId}</span>
                {idCopied ? (
                  <Check className="size-3.5 text-emerald-400" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            )}
            {profile?.bio && (
              <p className="mt-1.5 text-sm text-muted-foreground">{profile.bio}</p>
            )}
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
              <Mail className="size-3.5" /> {profile?.email ?? ''}
            </p>
            {profile?.college || profile?.targetRole ? (
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
                <GraduationCap className="size-3.5" />
                {[profile?.college, profile?.targetRole].filter(Boolean).join(' · ')}
              </p>
            ) : null}

            {(profile?.linkedinUrl || profile?.leetcodeUrl) && (
              <div className="mt-3 flex items-center justify-center gap-2 sm:justify-start">
                {profile?.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <LinkedInIcon className="size-3.5" />
                    LinkedIn
                  </a>
                )}
                {profile?.leetcodeUrl && (
                  <a
                    href={profile.leetcodeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Code2 className="size-3.5" />
                    LeetCode
                  </a>
                )}
              </div>
            )}
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

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.11 20.45H3.56V9h3.55v11.45z" />
    </svg>
  )
}
