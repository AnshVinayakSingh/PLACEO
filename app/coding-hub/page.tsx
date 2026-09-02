'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Search,
  SearchX,
  Sparkles,
  Tag,
} from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'
import { PRESET_COMPANIES } from '@/lib/coding-hub-companies'

// ---------- Types ----------

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'

type Question = {
  title: string
  slug: string
  difficulty: Difficulty
  link: string
  platform: string
  tags: string[]
  frequency: number
  alsoAskedAt: string[]
}

type QuestionsResponse = {
  company: string
  found: boolean
  questions: Question[]
  total?: number
  fallbackLink?: string
  message?: string
  error?: string
}

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  EASY: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  MEDIUM: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  HARD: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
}

// ---------- Main page ----------

export default function CodingHubPage() {
  const [query, setQuery] = useState('')
  const [customCompany, setCustomCompany] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QuestionsResponse | null>(null)
  const [error, setError] = useState('')

  const filteredPresets = useMemo(
    () => PRESET_COMPANIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  )

  async function openCompany(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setSelectedCompany(trimmed)
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`/api/coding-hub?company=${encodeURIComponent(trimmed)}`)
      const data: QuestionsResponse = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      setResult(data)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  function onCustomSearchSubmit(e: FormEvent) {
    e.preventDefault()
    if (customCompany.trim()) openCompany(customCompany.trim())
  }

  function goBack() {
    setSelectedCompany(null)
    setResult(null)
    setError('')
  }

  // ---------- Detail view (a company is selected) ----------

  if (selectedCompany) {
    return (
      <PageShell
        title={result?.company || selectedCompany}
        description="Curated DSA questions asked at this company — sorted by how frequently they come up."
      >
        <button
          onClick={goBack}
          className="glass mb-4 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium hover:bg-white/5"
        >
          <ArrowLeft className="size-4" />
          Back to companies
        </button>

        {loading && (
          <div className="glass flex flex-col items-center justify-center gap-3 rounded-2xl p-12 text-center">
            <Loader2 className="size-8 animate-spin text-brand-cyan" />
            <p className="text-sm text-muted-foreground">Fetching questions for {selectedCompany}...</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>
        )}

        {!loading && result && !result.found && (
          <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
            <SearchX className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">{result.message}</p>
            {result.fallbackLink && (
              <a
                href={result.fallbackLink}
                target="_blank"
                rel="noopener noreferrer"
                className="brand-gradient mt-2 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Search on GeeksforGeeks <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        )}

        {!loading && result && result.found && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              {result.total} question{result.total === 1 ? '' : 's'} found · click any question to open it on its
              trusted source platform
            </p>
            <div className="space-y-2">
              {result.questions.map((q, i) => (
                <motion.a
                  key={q.slug}
                  href={q.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.4) }}
                  className="glass group flex flex-col gap-1.5 rounded-xl p-4 transition-colors hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium group-hover:text-brand-cyan">
                      {q.title}
                      <ExternalLink className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${DIFFICULTY_STYLES[q.difficulty]}`}
                    >
                      {q.difficulty}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                      {q.platform}
                    </span>
                    {q.tags.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="flex items-center gap-1 rounded-full bg-white/[0.03] px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        <Tag className="size-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>

                  {q.alsoAskedAt.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Also asked at:{' '}
                      <span className="text-brand-cyan/80">{q.alsoAskedAt.join(', ')}</span>
                    </p>
                  )}
                </motion.a>
              ))}
            </div>
          </>
        )}
      </PageShell>
    )
  }

  // ---------- Grid view (choose a company) ----------

  return (
    <PageShell
      title="Company-wise Coding Questions Hub"
      description="Pick a company or search for any company name to get its real, frequency-sorted DSA question list — each question opens directly on LeetCode (or another trusted platform)."
    >
      <div className="glass mb-4 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter the list below..."
            className="glass h-10 w-full rounded-xl pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60"
          />
        </div>
      </div>

      {/* Custom company search */}
      <form
        onSubmit={onCustomSearchSubmit}
        className="glass mb-6 flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center"
      >
        <Sparkles className="hidden size-5 shrink-0 text-brand-cyan sm:block" />
        <input
          value={customCompany}
          onChange={(e) => setCustomCompany(e.target.value)}
          placeholder="Not in the list? Type any company name (e.g. Razorpay, JP Morgan, Zoho...)"
          className="glass h-10 w-full flex-1 rounded-xl px-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60"
        />
        <button
          type="submit"
          disabled={!customCompany.trim()}
          className="brand-gradient flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Search className="size-4" />
          Find Questions
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredPresets.map((c, i) => (
          <motion.button
            key={c.name}
            onClick={() => openCompany(c.name)}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.5) }}
            whileHover={{ y: -3 }}
            className="glass cursor-pointer rounded-2xl p-5 text-left"
          >
            <span
              className="flex size-11 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: c.color }}
            >
              {c.name[0]}
            </span>
            <h3 className="mt-3 text-sm font-semibold">{c.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">View all DSA questions →</p>
          </motion.button>
        ))}
      </div>

      {filteredPresets.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No preset match for &quot;{query}&quot; — try the search box above to look it up directly.
        </p>
      )}
    </PageShell>
  )
}
