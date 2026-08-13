'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'

const roles = ['Frontend Developer', 'Full Stack Developer', 'SDE', 'ML Engineer', 'Data Scientist', 'DevOps Engineer']

const milestones = [
  { title: 'Master JavaScript & Git Fundamentals', status: 'done', eta: 'Completed' },
  { title: 'Build 2 React Projects', status: 'done', eta: 'Completed' },
  { title: 'Learn DSA — Arrays, Strings, Trees', status: 'active', eta: 'In progress · 2 weeks left' },
  { title: 'Next.js + Backend APIs (Node/Express)', status: 'upcoming', eta: 'Starts in 2 weeks' },
  { title: 'System Design Basics', status: 'upcoming', eta: 'Starts in 5 weeks' },
  { title: 'Mock Interviews (Technical + HR)', status: 'upcoming', eta: 'Starts in 7 weeks' },
  { title: 'Resume + Portfolio Polish', status: 'upcoming', eta: 'Starts in 8 weeks' },
]

export default function RoadmapPage() {
  const [selectedRole, setSelectedRole] = useState('Full Stack Developer')

  return (
    <PageShell
      title="AI Career Roadmap Generator"
      description="A personalized path to Full Stack Developer, built around your current skills."
    >
      <div className="glass mb-6 flex flex-wrap items-center gap-2 rounded-2xl p-4">
        <span className="text-sm text-muted-foreground">Target role:</span>
        {roles.map((r) => (
          <button
            key={r}
            onClick={() => setSelectedRole(r)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              r === selectedRole
                ? 'brand-gradient text-primary-foreground'
                : 'glass text-muted-foreground hover:text-foreground'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="relative">
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border sm:left-[19px]" />
          <div className="space-y-8">
            {milestones.map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="relative flex gap-4 pl-0 sm:gap-5"
              >
                <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full sm:size-10">
                  {m.status === 'done' && (
                    <span className="flex size-8 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-400 sm:size-10">
                      <CheckCircle2 className="size-5" />
                    </span>
                  )}
                  {m.status === 'active' && (
                    <span className="glow-ring flex size-8 items-center justify-center rounded-full bg-brand-blue/25 text-brand-cyan sm:size-10">
                      <Clock className="size-5" />
                    </span>
                  )}
                  {m.status === 'upcoming' && (
                    <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-muted-foreground sm:size-10">
                      <Circle className="size-4" />
                    </span>
                  )}
                </div>
                <div className="glass flex-1 rounded-xl p-4">
                  <h3
                    className={`text-sm font-semibold sm:text-base ${
                      m.status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'
                    }`}
                  >
                    {m.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">{m.eta}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
