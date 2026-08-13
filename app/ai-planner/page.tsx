'use client'

import { Fragment } from 'react'
import { motion } from 'motion/react'
import { Moon, Sparkles, Sun, Zap } from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const slots = ['7 AM', '9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '7 PM', '9 PM']

type Block = { type: 'dsa' | 'react' | 'aptitude' | 'break' | 'sleep' | 'mock'; label: string }

const grid: Record<string, Record<string, Block | undefined>> = {
  Mon: { '9 AM': { type: 'dsa', label: 'DSA' }, '3 PM': { type: 'react', label: 'React' }, '7 PM': { type: 'break', label: 'Break' } },
  Tue: { '9 AM': { type: 'aptitude', label: 'Aptitude' }, '1 PM': { type: 'dsa', label: 'DSA' }, '5 PM': { type: 'mock', label: 'Mock' } },
  Wed: { '9 AM': { type: 'dsa', label: 'DSA' }, '3 PM': { type: 'react', label: 'React' } },
  Thu: { '9 AM': { type: 'aptitude', label: 'Aptitude' }, '1 PM': { type: 'dsa', label: 'DSA' }, '7 PM': { type: 'break', label: 'Break' } },
  Fri: { '9 AM': { type: 'mock', label: 'Mock' }, '3 PM': { type: 'react', label: 'React' } },
  Sat: { '11 AM': { type: 'dsa', label: 'DSA Revision' }, '5 PM': { type: 'break', label: 'Break' } },
  Sun: { '11 AM': { type: 'break', label: 'Rest' } },
}

const colorMap: Record<Block['type'], string> = {
  dsa: 'bg-brand-blue/20 text-brand-cyan border-brand-blue/30',
  react: 'bg-brand-purple/20 text-brand-purple border-brand-purple/30',
  aptitude: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
  break: 'bg-secondary text-muted-foreground border-border',
  sleep: 'bg-secondary text-muted-foreground border-border',
  mock: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
}

export default function AiPlannerPage() {
  return (
    <PageShell
      title="AI Smart Routine Planner"
      description="Your optimized weekly schedule — balanced for study, skills, and rest."
      headerAction={
        <button className="brand-gradient glow-ring flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]">
          <Sparkles className="size-4" />
          Regenerate Plan
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="glass rounded-2xl p-5 lg:col-span-1">
          <h3 className="font-display text-sm font-semibold">Preferences</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sun className="size-3.5" /> Wake up time
              </label>
              <input className="glass h-9 w-full rounded-lg px-3 text-sm outline-none" defaultValue="7:00 AM" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Moon className="size-3.5" /> Sleep time
              </label>
              <input className="glass h-9 w-full rounded-lg px-3 text-sm outline-none" defaultValue="11:00 PM" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="size-3.5" /> Target role
              </label>
              <input className="glass h-9 w-full rounded-lg px-3 text-sm outline-none" defaultValue="Full Stack Developer" />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['DSA', 'React', 'Aptitude', 'Mock Interviews'].map((s) => (
                <span key={s} className="glass rounded-full px-2.5 py-1 text-xs text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 lg:col-span-3">
          <div className="overflow-x-auto">
            <div className="grid min-w-[640px] grid-cols-8 gap-1.5">
              <div />
              {days.map((d) => (
                <div key={d} className="pb-2 text-center text-xs font-semibold text-muted-foreground">
                  {d}
                </div>
              ))}
              {slots.map((slot, si) => (
                <Fragment key={slot}>
                  <div className="flex items-center pr-2 text-right text-xs text-muted-foreground">
                    {slot}
                  </div>
                  {days.map((d, di) => {
                    const block = grid[d]?.[slot]
                    return (
                      <motion.div
                        key={d + slot}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: (si * 7 + di) * 0.01 }}
                        className={`flex h-12 items-center justify-center rounded-lg border text-[11px] font-medium ${
                          block ? colorMap[block.type] : 'border-border/40 bg-white/[0.02]'
                        }`}
                      >
                        {block?.label}
                      </motion.div>
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {[
          { title: 'Weekly Focus', text: 'Prioritize DSA (graphs & DP) — you have 2 mocks scheduled this week.' },
          { title: 'Burnout Check', text: 'Consistency is healthy. No burnout risk detected this week.' },
          { title: 'Suggestion', text: 'Add 30 min of communication practice before Friday\u2019s mock interview.' },
        ].map((c) => (
          <div key={c.title} className="glass rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-brand-cyan">{c.title}</h4>
            <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
