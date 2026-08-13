'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import {
  Briefcase,
  Code2,
  FileText,
  Flame,
  Mic,
  MessageCircle,
  Rocket,
  Users,
} from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'

const categories = [
  { name: 'HR Interview', icon: Briefcase },
  { name: 'Technical Interview', icon: Code2 },
  { name: 'DSA Interview', icon: Code2 },
  { name: 'Resume Interview', icon: FileText },
  { name: 'Communication Test', icon: MessageCircle },
  { name: 'Behavioral Questions', icon: Users },
  { name: 'Startup Pitch', icon: Rocket },
  { name: 'Roast Mode', icon: Flame },
]

const levels = [
  { level: 0, label: 'Beginner', desc: 'Simple English, slow pace' },
  { level: 1, label: 'Easy', desc: 'Normal HR pace' },
  { level: 2, label: 'Standard', desc: 'Typical HR interview' },
  { level: 3, label: 'Pressure', desc: 'Technical cross-questions' },
  { level: 4, label: 'Intense', desc: 'Faster, tougher follow-ups' },
  { level: 5, label: 'Extreme', desc: 'Rapid-fire, high pressure' },
]

export default function InterviewSimulatorPage() {
  const [selectedCategory, setSelectedCategory] = useState('Technical Interview')
  const [level, setLevel] = useState(2)

  return (
    <PageShell
      title="AI Human Interview Simulator"
      description="Practice realistic, voice-based interviews with instant AI feedback."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {categories.map((c, i) => {
          const Icon = c.icon
          const active = selectedCategory === c.name
          return (
            <motion.button
              key={c.name}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              onClick={() => setSelectedCategory(c.name)}
              whileHover={{ y: -3 }}
              className={`glass relative overflow-hidden rounded-2xl p-5 text-left transition-colors ${
                active ? 'glow-ring ring-2 ring-brand-blue/50' : ''
              }`}
            >
              <span
                className={`flex size-11 items-center justify-center rounded-xl ${
                  active ? 'brand-gradient text-primary-foreground' : 'bg-secondary text-brand-cyan'
                }`}
              >
                <Icon className="size-5" />
              </span>
              <h3 className="mt-3 text-sm font-semibold">{c.name}</h3>
            </motion.button>
          )
        })}
      </div>

      <div className="glass mt-4 rounded-2xl p-6">
        <h3 className="font-display text-sm font-semibold">Select difficulty level</h3>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {levels.map((l) => (
            <button
              key={l.level}
              onClick={() => setLevel(l.level)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                level === l.level
                  ? 'border-brand-blue/50 bg-brand-blue/10'
                  : 'border-border hover:bg-white/5'
              }`}
            >
              <span className="text-xs font-semibold text-brand-cyan">Level {l.level}</span>
              <p className="mt-0.5 text-sm font-medium">{l.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{l.desc}</p>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-xl bg-secondary/50 p-5 sm:flex-row">
          <div>
            <p className="text-sm font-medium">
              {selectedCategory} · Level {level}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Webcam + mic access required. Estimated duration: 15–20 min.
            </p>
          </div>
          <button className="brand-gradient glow-ring flex shrink-0 items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]">
            <Mic className="size-4" />
            Start Interview
          </button>
        </div>
      </div>
    </PageShell>
  )
}
