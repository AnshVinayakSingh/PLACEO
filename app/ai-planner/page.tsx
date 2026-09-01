'use client'

import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  BookOpen,
  Clock,
  GraduationCap,
  Loader2,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'

// ---------- Types ----------

type BusySlot = { id: string; label: string; start: string; end: string }

type Priority = 'high' | 'medium' | 'low'

type Topic = { name: string; priority: Priority }

type PlanBlock = { start: string; end: string; activity: string; type: string }

type Insight = { title: string; text: string }

type Plan = { weekday: PlanBlock[]; weekend: PlanBlock[]; insights: Insight[] }

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const WEEKEND_LABELS = ['Sat', 'Sun']

const PRESET_TOPICS = ['DSA', 'Web Development', 'AI/ML', 'DevOps', 'Semester Exam', 'Aptitude', 'System Design']

const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'bg-rose-400/15 text-rose-300 border-rose-400/30',
  medium: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  low: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
}

const TYPE_STYLES: Record<string, string> = {
  routine: 'bg-secondary text-muted-foreground border-border',
  college: 'bg-brand-blue/20 text-brand-cyan border-brand-blue/30',
  meal: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  break: 'bg-secondary/60 text-muted-foreground border-border',
  sleep: 'bg-secondary text-muted-foreground border-border',
  busy: 'bg-rose-400/15 text-rose-300 border-rose-400/30',
  free: 'border-border/40 bg-white/[0.02] text-muted-foreground',
}

const STUDY_PALETTE = [
  'bg-brand-purple/20 text-brand-purple border-brand-purple/30',
  'bg-brand-blue/20 text-brand-cyan border-brand-blue/30',
  'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
  'bg-amber-400/15 text-amber-300 border-amber-400/30',
  'bg-cyan-400/15 text-cyan-300 border-cyan-400/30',
  'bg-fuchsia-400/15 text-fuchsia-300 border-fuchsia-400/30',
]

function to12Hour(time: string): string {
  if (!time || !time.includes(':')) return time
  const [hStr, mStr] = time.split(':')
  let h = parseInt(hStr, 10)
  const suffix = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${mStr} ${suffix}`
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function blockStyle(block: PlanBlock, topics: Topic[]): string {
  if (block.type === 'study') {
    const idx = topics.findIndex((t) => block.activity.toLowerCase().includes(t.name.toLowerCase()))
    return STUDY_PALETTE[idx >= 0 ? idx % STUDY_PALETTE.length : 0]
  }
  return TYPE_STYLES[block.type] ?? TYPE_STYLES.free
}

// ---------- Small building blocks ----------

function SectionCard({
  step,
  title,
  icon,
  children,
}: {
  step: number
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="brand-gradient flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-primary-foreground">
          {step}
        </span>
        <h3 className="font-display flex items-center gap-1.5 text-sm font-semibold">
          {icon}
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-muted-foreground">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="glass h-9 w-full rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-ring/60"
      />
    </div>
  )
}

function DayToggles({
  labels,
  selected,
  onToggle,
}: {
  labels: string[]
  selected: string[]
  onToggle: (day: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onToggle(d)}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
            selected.includes(d)
              ? 'border-brand-blue/40 bg-brand-blue/20 text-brand-cyan'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          {d}
        </button>
      ))}
    </div>
  )
}

function BusySlotList({
  slots,
  onAdd,
  onRemove,
}: {
  slots: BusySlot[]
  onAdd: (s: BusySlot) => void
  onRemove: (id: string) => void
}) {
  const [label, setLabel] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  function handleAdd() {
    if (!label.trim() || !start || !end) return
    onAdd({ id: uid(), label: label.trim(), start, end })
    setLabel('')
    setStart('')
    setEnd('')
  }

  return (
    <div className="space-y-2">
      {slots.map((s) => (
        <div key={s.id} className="glass flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs">
          <span className="truncate">
            <span className="font-medium">{s.label}</span>{' '}
            <span className="text-muted-foreground">
              {to12Hour(s.start)} – {to12Hour(s.end)}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onRemove(s.id)}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
            aria-label={`Remove ${s.label}`}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}

      <div className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-1.5">
        <div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Gym, Tuition"
            className="glass h-8 w-full rounded-lg px-2.5 text-xs outline-none"
          />
        </div>
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="glass h-8 w-24 rounded-lg px-2 text-xs outline-none"
        />
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="glass h-8 w-24 rounded-lg px-2 text-xs outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground"
          aria-label="Add busy slot"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}

// ---------- Timeline output ----------

function TimelineList({ blocks, topics }: { blocks: PlanBlock[]; topics: Topic[] }) {
  if (!blocks.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No plan yet.</p>
  }
  return (
    <div className="space-y-1.5">
      {blocks.map((b, i) => (
        <motion.div
          key={`${b.start}-${i}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: i * 0.02 }}
          className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs ${blockStyle(b, topics)}`}
        >
          <span className="w-24 shrink-0 font-mono text-[11px] opacity-80">
            {to12Hour(b.start)} – {to12Hour(b.end)}
          </span>
          <span className="font-medium">{b.activity}</span>
        </motion.div>
      ))}
    </div>
  )
}

// ---------- Main page ----------

export default function AiPlannerPage() {
  // Weekday state
  const [wdWake, setWdWake] = useState('07:00')
  const [wdSleep, setWdSleep] = useState('23:00')
  const [wdDays, setWdDays] = useState<string[]>(WEEKDAY_LABELS)
  const [hasCollege, setHasCollege] = useState(true)
  const [collegeStart, setCollegeStart] = useState('09:00')
  const [collegeEnd, setCollegeEnd] = useState('15:00')
  const [wdBusy, setWdBusy] = useState<BusySlot[]>([])

  // Weekend state
  const [weWake, setWeWake] = useState('08:00')
  const [weSleep, setWeSleep] = useState('23:30')
  const [weDays, setWeDays] = useState<string[]>(WEEKEND_LABELS)
  const [weBusy, setWeBusy] = useState<BusySlot[]>([])

  // Topics
  const [topics, setTopics] = useState<Topic[]>([{ name: 'DSA', priority: 'high' }])
  const [customTopic, setCustomTopic] = useState('')

  // Preferences
  const [peakFocus, setPeakFocus] = useState<'morning' | 'night'>('morning')
  const [sessionLength, setSessionLength] = useState(60)
  const [weekendMode, setWeekendMode] = useState<'light' | 'intense'>('light')

  // Result
  const [plan, setPlan] = useState<Plan | null>(null)
  const [activeTab, setActiveTab] = useState<'weekday' | 'weekend'>('weekday')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleDay(list: string[], setList: (v: string[]) => void, day: string) {
    setList(list.includes(day) ? list.filter((d) => d !== day) : [...list, day])
  }

  function toggleTopic(name: string) {
    setTopics((prev) =>
      prev.some((t) => t.name === name)
        ? prev.filter((t) => t.name !== name)
        : [...prev, { name, priority: 'medium' }],
    )
  }

  function setTopicPriority(name: string, priority: Priority) {
    setTopics((prev) => prev.map((t) => (t.name === name ? { ...t, priority } : t)))
  }

  function addCustomTopic() {
    const name = customTopic.trim()
    if (!name || topics.some((t) => t.name.toLowerCase() === name.toLowerCase())) return
    setTopics((prev) => [...prev, { name, priority: 'medium' }])
    setCustomTopic('')
  }

  async function generatePlan() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekday: {
            wake: wdWake,
            sleep: wdSleep,
            days: wdDays,
            collegeStart: hasCollege ? collegeStart : undefined,
            collegeEnd: hasCollege ? collegeEnd : undefined,
            busySlots: wdBusy.map(({ label, start, end }) => ({ label, start, end })),
          },
          weekend: {
            wake: weWake,
            sleep: weSleep,
            days: weDays,
            busySlots: weBusy.map(({ label, start, end }) => ({ label, start, end })),
          },
          topics,
          preferences: { peakFocus, sessionLength, weekendMode },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      setPlan(data.plan)
      setActiveTab('weekday')
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell
      title="AI Smart Routine Planner"
      description="Tell it your fixed hours and topics — it builds separate weekday and weekend schedules around them."
      headerAction={
        plan && (
          <button
            onClick={generatePlan}
            disabled={loading}
            className="brand-gradient glow-ring flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Regenerate Plan
          </button>
        )
      }
    >
      <div className="grid gap-4 lg:grid-cols-5">
        {/* ---------- Intake form ---------- */}
        <div className="space-y-4 lg:col-span-2">
          <SectionCard step={1} title="Sleep Schedule" icon={<Moon className="size-4" />}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Weekdays</p>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <TimeField label="Wake up" value={wdWake} onChange={setWdWake} />
              <TimeField label="Sleep" value={wdSleep} onChange={setWdSleep} />
            </div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Weekends</p>
            <div className="grid grid-cols-2 gap-2">
              <TimeField label="Wake up" value={weWake} onChange={setWeWake} />
              <TimeField label="Sleep" value={weSleep} onChange={setWeSleep} />
            </div>
          </SectionCard>

          <SectionCard step={2} title="College / Weekday Commitments" icon={<GraduationCap className="size-4" />}>
            <p className="mb-1.5 text-xs text-muted-foreground">Which days?</p>
            <DayToggles labels={WEEKDAY_LABELS} selected={wdDays} onToggle={(d) => toggleDay(wdDays, setWdDays, d)} />

            <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={hasCollege} onChange={(e) => setHasCollege(e.target.checked)} />
              I have college/office on these days
            </label>
            {hasCollege && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <TimeField label="Starts at" value={collegeStart} onChange={setCollegeStart} />
                <TimeField label="Ends at" value={collegeEnd} onChange={setCollegeEnd} />
              </div>
            )}

            <p className="mb-1.5 mt-4 text-xs text-muted-foreground">Other fixed weekday busy slots</p>
            <BusySlotList
              slots={wdBusy}
              onAdd={(s) => setWdBusy((p) => [...p, s])}
              onRemove={(id) => setWdBusy((p) => p.filter((s) => s.id !== id))}
            />
          </SectionCard>

          <SectionCard step={3} title="Weekend Commitments" icon={<Sun className="size-4" />}>
            <p className="mb-1.5 text-xs text-muted-foreground">Which days?</p>
            <DayToggles labels={WEEKEND_LABELS} selected={weDays} onToggle={(d) => toggleDay(weDays, setWeDays, d)} />

            <p className="mb-1.5 mt-4 text-xs text-muted-foreground">Fixed weekend busy slots (classes, family, chores...)</p>
            <BusySlotList
              slots={weBusy}
              onAdd={(s) => setWeBusy((p) => [...p, s])}
              onRemove={(id) => setWeBusy((p) => p.filter((s) => s.id !== id))}
            />
          </SectionCard>

          <SectionCard step={4} title="What are you studying this week?" icon={<BookOpen className="size-4" />}>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TOPICS.map((name) => {
                const active = topics.some((t) => t.name === name)
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleTopic(name)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'border-brand-purple/40 bg-brand-purple/20 text-brand-purple'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {name}
                  </button>
                )
              })}
            </div>

            <div className="mt-2 flex gap-1.5">
              <input
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTopic())}
                placeholder="Add custom topic..."
                className="glass h-8 flex-1 rounded-lg px-2.5 text-xs outline-none"
              />
              <button
                type="button"
                onClick={addCustomTopic}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-4" />
              </button>
            </div>

            {topics.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Priority for selected topics
                </p>
                {topics.map((t) => (
                  <div key={t.name} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1 truncate text-xs">
                      {t.name}
                      <button
                        type="button"
                        onClick={() => setTopics((prev) => prev.filter((x) => x.name !== t.name))}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${t.name}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                    <div className="flex shrink-0 gap-1">
                      {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setTopicPriority(t.name, p)}
                          className={`rounded-full border px-2 py-0.5 text-[10px] capitalize transition-colors ${
                            t.priority === p ? PRIORITY_STYLES[p] : 'border-border text-muted-foreground'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard step={5} title="Preferences" icon={<Clock className="size-4" />}>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">When do you focus best?</label>
                <div className="flex gap-1.5">
                  {(['morning', 'night'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setPeakFocus(v)}
                      className={`flex-1 rounded-lg border px-3 py-1.5 text-xs capitalize transition-colors ${
                        peakFocus === v
                          ? 'border-brand-blue/40 bg-brand-blue/20 text-brand-cyan'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">Max study session length</label>
                <select
                  value={sessionLength}
                  onChange={(e) => setSessionLength(Number(e.target.value))}
                  className="glass h-9 w-full rounded-lg px-3 text-sm outline-none"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">Weekend style</label>
                <div className="flex gap-1.5">
                  {(['light', 'intense'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setWeekendMode(v)}
                      className={`flex-1 rounded-lg border px-3 py-1.5 text-xs capitalize transition-colors ${
                        weekendMode === v
                          ? 'border-brand-purple/40 bg-brand-purple/20 text-brand-purple'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {v === 'light' ? 'Light / rest' : 'Intense / study'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {!plan && (
            <button
              onClick={generatePlan}
              disabled={loading}
              className="brand-gradient glow-ring flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? 'Building your plan...' : 'Generate My Timetable'}
            </button>
          )}

          {error && <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>}
        </div>

        {/* ---------- Output ---------- */}
        <div className="lg:col-span-3">
          {!plan && !loading && (
            <div className="glass flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl p-8 text-center">
              <Sparkles className="mb-3 size-8 text-brand-cyan" />
              <p className="text-sm text-muted-foreground">
                Fill in your fixed hours and topics on the left, then generate your personalized weekday and weekend
                timetables.
              </p>
            </div>
          )}

          {loading && (
            <div className="glass flex h-full min-h-[400px] flex-col items-center justify-center gap-3 rounded-2xl p-8">
              <Loader2 className="size-8 animate-spin text-brand-cyan" />
              <p className="text-sm text-muted-foreground">Building your weekday & weekend plan...</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {plan && !loading && (
              <motion.div
                key="plan"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="glass rounded-2xl p-4">
                  <div className="mb-4 flex gap-1.5 border-b border-border pb-3">
                    <button
                      onClick={() => setActiveTab('weekday')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        activeTab === 'weekday' ? 'brand-gradient text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      Weekday ({wdDays.join(', ')})
                    </button>
                    <button
                      onClick={() => setActiveTab('weekend')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        activeTab === 'weekend' ? 'brand-gradient text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      Weekend ({weDays.join(', ')})
                    </button>
                  </div>

                  <div data-lenis-prevent className="max-h-[560px] overflow-y-auto pr-1">
                    <TimelineList blocks={activeTab === 'weekday' ? plan.weekday : plan.weekend} topics={topics} />
                  </div>
                </div>

                {plan.insights?.length > 0 && (
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {plan.insights.map((c) => (
                      <div key={c.title} className="glass rounded-2xl p-5">
                        <h4 className="text-sm font-semibold text-brand-cyan">{c.title}</h4>
                        <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageShell>
  )
}
