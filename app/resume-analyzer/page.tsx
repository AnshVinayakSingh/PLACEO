'use client'

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FileText,
  FileUp,
  Lightbulb,
  Loader2,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Wrench,
  X,
  XCircle,
} from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'
import { extractPdfText, readTextFile } from '@/lib/pdf'

// ---------- Types ----------

type FormatIssue = { issue: string; fix: string }
type MissingKeyword = { keyword: string; addWhere: string }
type KeywordSwap = { from: string; to: string; reason: string }
type WeakProject = { project: string; whyWeak: string; suggestion: string }
type RecommendedProject = { name: string; description: string; whyRelevant: string }

type Analysis = {
  currentShortlistChance: number
  verdict: string
  strengths: string[]
  formatIssues: FormatIssue[]
  missingKeywords: MissingKeyword[]
  keywordsToReplace: KeywordSwap[]
  skillsToAdd: string[]
  weakProjects: WeakProject[]
  recommendedProjects: RecommendedProject[]
  projectedShortlistChance: number
  projectedCaveat: string
}

function scoreColor(score: number): string {
  if (score < 35) return 'oklch(0.65 0.22 25)' // red
  if (score < 65) return 'oklch(0.75 0.15 80)' // amber
  return 'oklch(0.72 0.18 150)' // green
}

// ---------- Gauge ----------

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const circumference = 326.7
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex size-32 items-center justify-center">
        <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--secondary)" strokeWidth="10" />
          <motion.circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={scoreColor(score)}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute text-center">
          <p className="font-display text-3xl font-bold">{score}%</p>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

// ---------- Main page ----------

export default function ResumeAnalyzerPage() {
  const [jobDescription, setJobDescription] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [fileName, setFileName] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError('')
    setExtracting(true)
    setResumeText('')
    setFileName('')
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      const isTxt = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')

      if (!isPdf && !isTxt) {
        setError('Please upload a PDF or .txt file.')
        return
      }

      const text = isPdf ? await extractPdfText(file) : await readTextFile(file)
      setResumeText(text)
      setFileName(file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.')
    } finally {
      setExtracting(false)
    }
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) handleFile(file)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  async function analyze() {
    setError('')
    if (jobDescription.trim().length < 30) {
      setError('Please paste a fuller job description (at least a few sentences).')
      return
    }
    if (!resumeText) {
      setError('Please upload your resume first.')
      return
    }

    setAnalyzing(true)
    setAnalysis(null)
    try {
      const res = await fetch('/api/resume-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription, resumeText }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      setAnalysis(data.analysis)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <PageShell
      title="AI Resume Analyzer"
      description="Paste the job description, upload your resume, and get a strict, realistic shortlist estimate."
    >
      <div className="space-y-4">
        {/* Step 1: Job description */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display flex items-center gap-2 text-sm font-semibold">
            <Briefcase className="size-4 text-brand-cyan" />
            1. Enter the job description
          </h3>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here — role, responsibilities, required skills..."
            rows={6}
            className="glass mt-3 w-full resize-y rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60"
          />
        </div>

        {/* Step 2: Resume upload */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display flex items-center gap-2 text-sm font-semibold">
            <FileText className="size-4 text-brand-cyan" />
            2. Upload your resume
          </h3>

          {!fileName ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="mt-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border px-6 py-10 text-center transition-colors hover:border-brand-blue/50"
            >
              {extracting ? (
                <>
                  <Loader2 className="size-9 animate-spin text-brand-cyan" />
                  <p className="mt-3 text-sm font-medium">Reading your resume...</p>
                </>
              ) : (
                <>
                  <UploadCloud className="size-9 text-brand-cyan" />
                  <p className="mt-3 text-sm font-medium">Drag & drop your resume (PDF or .txt)</p>
                  <p className="mt-1 text-xs text-muted-foreground">Max ~5MB, text-based PDF (not a scanned image)</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="glass mt-4 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium hover:bg-white/5"
                  >
                    <FileUp className="size-4" />
                    Choose File
                  </button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                onChange={onFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <FileText className="size-4 shrink-0 text-brand-cyan" />
                <span className="truncate font-medium">{fileName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  ({resumeText.length.toLocaleString()} chars extracted)
                </span>
              </span>
              <button
                onClick={() => {
                  setFileName('')
                  setResumeText('')
                }}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                aria-label="Remove file"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
        </div>

        <button
          onClick={analyze}
          disabled={analyzing || extracting}
          className="brand-gradient glow-ring flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-60"
        >
          {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {analyzing ? 'Analyzing against the job description...' : 'Analyze Resume'}
        </button>

        {error && <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>}

        {/* Results */}
        <AnimatePresence mode="wait">
          {analysis && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Score + verdict */}
              <div className="glass rounded-2xl p-6 sm:p-8">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-around">
                  <ScoreGauge score={analysis.currentShortlistChance} label="Current shortlist chance" />
                  <ArrowRight className="hidden size-6 shrink-0 text-muted-foreground sm:block" />
                  <ScoreGauge score={analysis.projectedShortlistChance} label="After applying suggestions" />
                </div>
                <p className="mt-5 rounded-xl bg-white/[0.03] px-4 py-3 text-center text-sm font-medium">
                  {analysis.verdict}
                </p>
                <p className="mt-3 text-center text-xs text-muted-foreground">{analysis.projectedCaveat}</p>
              </div>

              {/* Strengths */}
              {analysis.strengths.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-display flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    What&apos;s already working
                  </h3>
                  <ul className="mt-3 space-y-1.5">
                    {analysis.strengths.map((s) => (
                      <li key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-0.5 text-emerald-400">✓</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Format issues */}
              {analysis.formatIssues.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-display flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="size-4 text-amber-400" />
                    Format & ATS issues
                  </h3>
                  <div className="mt-3 space-y-2">
                    {analysis.formatIssues.map((f) => (
                      <div key={f.issue} className="rounded-lg bg-white/[0.02] p-3">
                        <p className="flex items-start gap-2 text-sm font-medium">
                          <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                          {f.issue}
                        </p>
                        <p className="ml-6 mt-1 text-xs text-muted-foreground">Fix: {f.fix}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing keywords + swaps */}
              {(analysis.missingKeywords.length > 0 || analysis.keywordsToReplace.length > 0) && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-display flex items-center gap-2 text-sm font-semibold">
                    <Wrench className="size-4 text-brand-cyan" />
                    Keywords
                  </h3>

                  {analysis.missingKeywords.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Missing — add these
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {analysis.missingKeywords.map((k) => (
                          <span
                            key={k.keyword}
                            title={`Add to: ${k.addWhere}`}
                            className="rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-xs font-medium text-rose-300"
                          >
                            {k.keyword} <span className="opacity-70">→ {k.addWhere}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.keywordsToReplace.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Weak phrasing — replace
                      </p>
                      {analysis.keywordsToReplace.map((k) => (
                        <div key={k.from} className="rounded-lg bg-white/[0.02] p-3 text-sm">
                          <p>
                            <span className="text-muted-foreground line-through">{k.from}</span>{' '}
                            <ArrowRight className="inline size-3.5 text-muted-foreground" />{' '}
                            <span className="font-medium text-emerald-300">{k.to}</span>
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{k.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Skills to add */}
              {analysis.skillsToAdd.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-display flex items-center gap-2 text-sm font-semibold">
                    <Lightbulb className="size-4 text-amber-400" />
                    Skills to actually go learn
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis.skillsToAdd.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-brand-purple/30 bg-brand-purple/10 px-3 py-1 text-xs font-medium text-brand-purple"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Weak projects */}
              {analysis.weakProjects.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-display flex items-center gap-2 text-sm font-semibold">
                    <XCircle className="size-4 text-destructive" />
                    Weak projects on your resume
                  </h3>
                  <div className="mt-3 space-y-2">
                    {analysis.weakProjects.map((p) => (
                      <div key={p.project} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                        <p className="text-sm font-semibold">{p.project}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{p.whyWeak}</p>
                        <p className="mt-1.5 text-xs text-emerald-300">→ {p.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended projects */}
              {analysis.recommendedProjects.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-display flex items-center gap-2 text-sm font-semibold">
                    <TrendingUp className="size-4 text-emerald-400" />
                    Build these instead
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {analysis.recommendedProjects.map((p) => (
                      <div key={p.name} className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                        <p className="text-sm font-semibold">🚀 {p.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                        <p className="mt-1.5 text-xs text-emerald-300">{p.whyRelevant}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  )
}
