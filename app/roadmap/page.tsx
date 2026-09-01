'use client'

import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Award,
  Briefcase,
  Building2,
  Code2,
  Compass,
  Flame,
  FolderGit2,
  Layers,
  Loader2,
  Rocket,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'

// ---------- Types ----------

type Priority = 'high' | 'medium' | 'low'

type Topic = { name: string; duration: string; priority: Priority }

type Phase = { phaseTitle: string; timeframe: string; topics: Topic[]; projects: string[] }

type InterviewFocus = { topic: string; importance: Priority; frequency: string; companies: string[] }

type Roadmap = {
  skillName: string
  overview: string
  totalDuration: string
  phases: Phase[]
  interviewFocus: InterviewFocus[]
  proTips: string[]
}

const PRESET_SKILLS = [
  'DSA',
  'Web Development (MERN)',
  'Web Development (Spring Boot)',
  'DevOps',
  'AI/ML',
]

const PHASE_ICONS = [Compass, Layers, Code2, Rocket, Target, Trophy]

const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'bg-rose-400/15 text-rose-300 border-rose-400/30',
  medium: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  low: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
}

// ---------- Skill selector ----------

function SkillSelector({
  selected,
  onSelect,
  customValue,
  onCustomChange,
  onGenerate,
  loading,
}: {
  selected: string | null
  onSelect: (s: string | null) => void
  customValue: string
  onCustomChange: (v: string) => void
  onGenerate: () => void
  loading: boolean
}) {
  const isOther = selected === null

  return (
    <div className="glass rounded-2xl p-5">
      <p className="mb-3 text-sm text-muted-foreground">Which skill do you want a roadmap for?</p>
      <div className="flex flex-wrap gap-2">
        {PRESET_SKILLS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSelect(s)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              selected === s
                ? 'border-transparent brand-gradient text-primary-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
            isOther
              ? 'border-transparent brand-gradient text-primary-foreground'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          Other
        </button>
      </div>

      <AnimatePresence>
        {isOther && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <input
              value={customValue}
              onChange={(e) => onCustomChange(e.target.value)}
              placeholder="Type a skill, e.g. Data Analytics, Cybersecurity, Cloud Computing..."
              className="glass h-10 w-full rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-ring/60"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onGenerate}
        disabled={loading || (isOther && !customValue.trim())}
        className="brand-gradient glow-ring mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {loading ? 'Building your roadmap...' : 'Generate Roadmap'}
      </button>
    </div>
  )
}

// ---------- Roadmap visual ----------

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="glass flex items-center gap-3 rounded-xl p-4">
      <span className="brand-gradient flex size-9 shrink-0 items-center justify-center rounded-lg text-primary-foreground">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  )
}

function PhaseCard({ phase, index }: { phase: Phase; index: number }) {
  const Icon = PHASE_ICONS[index % PHASE_ICONS.length]
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="relative flex gap-4 sm:gap-5"
    >
      <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full sm:size-10">
        <span className="brand-gradient glow-ring flex size-8 items-center justify-center rounded-full text-primary-foreground sm:size-10">
          <Icon className="size-4 sm:size-5" />
        </span>
      </div>

      <div className="glass flex-1 rounded-xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold sm:text-base">{phase.phaseTitle}</h3>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] text-muted-foreground">
            {phase.timeframe}
          </span>
        </div>

        <div className="mt-3 space-y-1.5">
          {phase.topics.map((t) => (
            <div
              key={t.name}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.02] px-3 py-1.5"
            >
              <span className="text-xs font-medium">{t.name}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">{t.duration}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${PRIORITY_STYLES[t.priority]}`}>
                  {t.priority}
                </span>
              </div>
            </div>
          ))}
        </div>

        {phase.projects?.length > 0 && (
          <div className="mt-3 rounded-lg border border-brand-purple/20 bg-brand-purple/5 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-purple">
              <FolderGit2 className="size-3.5" />
              Build these projects
            </p>
            <ul className="space-y-1">
              {phase.projects.map((p) => (
                <li key={p} className="text-xs text-muted-foreground">
                  🚀 {p}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function InterviewFocusGrid({ items }: { items: InterviewFocus[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((f) => (
        <div key={f.topic} className="glass rounded-xl p-4">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold">{f.topic}</h4>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] capitalize ${PRIORITY_STYLES[f.importance]}`}>
              {f.importance}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{f.frequency}</p>
          {f.companies?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {f.companies.map((c) => (
                <span
                  key={c}
                  className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  <Building2 className="size-2.5" />
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------- Main page ----------

export default function RoadmapPage() {
  const [selected, setSelected] = useState<string | null>('DSA')
  const [customValue, setCustomValue] = useState('')
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const effectiveSkill = selected ?? customValue.trim()

  async function generateRoadmap() {
    if (!effectiveSkill) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: effectiveSkill }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      setRoadmap(data.roadmap)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell
      title="AI Career Roadmap Generator"
      description="Pick a skill and get a phase-by-phase roadmap — topics, timing, projects, and what interviewers actually ask."
    >
      <div className="space-y-4">
        <SkillSelector
          selected={selected}
          onSelect={setSelected}
          customValue={customValue}
          onCustomChange={setCustomValue}
          onGenerate={generateRoadmap}
          loading={loading}
        />

        {error && <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>}

        {!roadmap && !loading && (
          <div className="glass flex min-h-[300px] flex-col items-center justify-center rounded-2xl p-8 text-center">
            <Sparkles className="mb-3 size-8 text-brand-cyan" />
            <p className="text-sm text-muted-foreground">
              Choose a skill above and generate your personalized roadmap.
            </p>
          </div>
        )}

        {loading && (
          <div className="glass flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl p-8">
            <Loader2 className="size-8 animate-spin text-brand-cyan" />
            <p className="text-sm text-muted-foreground">Building your roadmap for {effectiveSkill}...</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {roadmap && !loading && (
            <motion.div
              key={roadmap.skillName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard icon={<Award className="size-4" />} label="Roadmap for" value={roadmap.skillName} />
                <StatCard icon={<Flame className="size-4" />} label="Total duration" value={roadmap.totalDuration} />
                <StatCard icon={<Briefcase className="size-4" />} label="Phases" value={`${roadmap.phases.length} phases`} />
              </div>

              <div className="glass rounded-2xl p-4 text-sm text-muted-foreground">{roadmap.overview}</div>

              <div className="glass rounded-2xl p-6 sm:p-8">
                <h3 className="font-display mb-6 text-sm font-semibold sm:text-base">📍 Your Roadmap</h3>
                <div className="relative">
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border sm:left-[19px]" />
                  <div className="space-y-8">
                    {roadmap.phases.map((phase, i) => (
                      <PhaseCard key={phase.phaseTitle} phase={phase} index={i} />
                    ))}
                  </div>
                </div>
              </div>

              {roadmap.interviewFocus?.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-display mb-4 text-sm font-semibold sm:text-base">🎯 What Interviewers Actually Ask</h3>
                  <InterviewFocusGrid items={roadmap.interviewFocus} />
                </div>
              )}

              {roadmap.proTips?.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-display mb-3 text-sm font-semibold sm:text-base">💡 Pro Tips</h3>
                  <ul className="space-y-2">
                    {roadmap.proTips.map((tip) => (
                      <li key={tip} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-0.5 text-brand-cyan">✓</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  )
}
