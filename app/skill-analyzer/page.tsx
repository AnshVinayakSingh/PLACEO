'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, PlayCircle, TrendingUp } from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'
import { QuizPanel } from '@/components/skill-analyzer/quiz-panel'

const skills = [
  { name: 'DSA', mastery: 78, trend: '+5%', weak: 'Graphs & DP' },
  { name: 'React', mastery: 85, trend: '+3%', weak: 'Server Components' },
  { name: 'DBMS', mastery: 62, trend: '+8%', weak: 'Normalization' },
  { name: 'Java', mastery: 70, trend: '+2%', weak: 'Multithreading' },
  { name: 'OOPs', mastery: 88, trend: '+1%', weak: 'Design Patterns' },
  { name: 'Aptitude', mastery: 55, trend: '+11%', weak: 'Time & Work' },
  { name: 'Communication', mastery: 66, trend: '+6%', weak: 'Filler Words' },
]

function ringColor(v: number) {
  if (v >= 80) return 'oklch(0.75 0.15 220)'
  if (v >= 60) return 'oklch(0.62 0.2 265)'
  return 'oklch(0.7 0.19 60)'
}

export default function SkillAnalyzerPage() {
  const [activeSkill, setActiveSkill] = useState<string | null>(null)

  return (
    <PageShell
      title="AI Skill Mastery Analyzer"
      description="Daily AI-driven assessments that track exactly where you stand."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {skills.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            whileHover={{ y: -4 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">{s.name}</h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
                  <TrendingUp className="size-3.5" /> {s.trend} this week
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
                    stroke={ringColor(s.mastery)}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${(s.mastery / 100) * 150.8} 150.8`}
                  />
                </svg>
                <span className="absolute text-xs font-bold">{s.mastery}%</span>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-1.5 rounded-lg bg-amber-400/10 px-2.5 py-2 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              Weak topic: {s.weak}
            </div>

            <button
              onClick={() => setActiveSkill(s.name)}
              className="glass mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
            >
              <PlayCircle className="size-4 text-brand-cyan" />
              Start Assessment
            </button>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {activeSkill && <QuizPanel topic={activeSkill} onClose={() => setActiveSkill(null)} />}
      </AnimatePresence>
    </PageShell>
  )
}
