'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { AlertTriangle, Loader2, PlayCircle, TrendingUp } from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'

type SkillSummary = {
  skill: string
  accuracy: number
  questionsAnswered: number
  weakTopic: string | null
  levelIndex: number
}

function ringColor(v: number) {
  if (v >= 80) return 'oklch(0.75 0.15 220)'
  if (v >= 60) return 'oklch(0.62 0.2 265)'
  if (v > 0) return 'oklch(0.7 0.19 60)'
  return 'oklch(0.55 0.02 275)'
}

export default function SkillAnalyzerPage() {
  const [skills, setSkills] = useState<SkillSummary[] | null>(null)

  useEffect(() => {
    fetch('/api/skill-progress')
      .then((res) => res.json())
      .then((data) => setSkills(data.summary || []))
      .catch(() => setSkills([]))
  }, [])

  return (
    <PageShell
      title="AI Skill Mastery Analyzer"
      description="Real, AI-generated assessments that track exactly where you stand."
    >
      {!skills && (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {skills && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {skills.map((s, i) => (
            <motion.div
              key={s.skill}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-semibold">{s.skill}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="size-3.5" />
                    {s.questionsAnswered > 0
                      ? `${s.questionsAnswered} questions answered`
                      : 'Not attempted yet'}
                  </p>
                </div>
                <div className="relative flex size-14 items-center justify-center">
                  <svg viewBox="0 0 56 56" className="size-14 -rotate-90">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="var(--secondary)" strokeWidth="5" />
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      fill="none"
                      stroke={ringColor(s.accuracy)}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${(s.accuracy / 100) * 150.8} 150.8`}
                    />
                  </svg>
                  <span className="absolute text-xs font-bold">{s.accuracy}%</span>
                </div>
              </div>

              {s.weakTopic ? (
                <div className="mt-4 flex items-start gap-1.5 rounded-lg bg-amber-400/10 px-2.5 py-2 text-xs text-amber-300">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  Weak topic: {s.weakTopic}
                </div>
              ) : (
                <div className="mt-4 rounded-lg bg-secondary/50 px-2.5 py-2 text-xs text-muted-foreground">
                  Take an assessment to see your accuracy and weak areas.
                </div>
              )}

              <Link
                href={`/skill-analyzer/assessment?skill=${encodeURIComponent(s.skill)}`}
                className="glass mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
              >
                <PlayCircle className="size-4 text-brand-cyan" />
                Start Assessment
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </PageShell>
  )
}
