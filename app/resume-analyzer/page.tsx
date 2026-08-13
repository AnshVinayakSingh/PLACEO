'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircle2, FileUp, UploadCloud, XCircle } from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'

const checks = [
  { label: 'Contact information present', pass: true },
  { label: 'Quantified achievements', pass: true },
  { label: 'Action verbs used consistently', pass: true },
  { label: 'Missing keywords: Docker, CI/CD', pass: false },
  { label: 'Resume length under 1 page', pass: true },
  { label: 'No spelling/grammar errors', pass: false },
]

export default function ResumeAnalyzerPage() {
  const [analyzed, setAnalyzed] = useState(false)
  const score = 78

  return (
    <PageShell
      title="AI Resume Analyzer"
      description="Get your ATS score and actionable improvement suggestions instantly."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display text-sm font-semibold">Upload your resume</h3>
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border px-6 py-12 text-center transition-colors hover:border-brand-blue/50">
            <UploadCloud className="size-9 text-brand-cyan" />
            <p className="mt-3 text-sm font-medium">Drag & drop your resume (PDF)</p>
            <p className="mt-1 text-xs text-muted-foreground">Max file size 5MB</p>
            <button className="glass mt-4 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium hover:bg-white/5">
              <FileUp className="size-4" />
              Choose File
            </button>
          </div>
          <button
            onClick={() => setAnalyzed(true)}
            className="brand-gradient glow-ring mt-5 flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01]"
          >
            Analyze Resume
          </button>
        </div>

        <div className="glass rounded-2xl p-6">
          {!analyzed ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center text-center text-sm text-muted-foreground">
              Your ATS score and detailed feedback will appear here.
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex flex-col items-center">
                <div className="relative flex size-32 items-center justify-center">
                  <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="var(--secondary)" strokeWidth="10" />
                    <motion.circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="oklch(0.75 0.15 220)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray="326.7"
                      initial={{ strokeDashoffset: 326.7 }}
                      animate={{ strokeDashoffset: 326.7 - (score / 100) * 326.7 }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <p className="font-display text-3xl font-bold">{score}</p>
                    <p className="text-[10px] text-muted-foreground">ATS Score</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {checks.map((c) => (
                  <div key={c.label} className="flex items-center gap-2.5 text-sm">
                    {c.pass ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="size-4 shrink-0 text-destructive" />
                    )}
                    <span className={c.pass ? 'text-muted-foreground' : 'text-foreground'}>{c.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
