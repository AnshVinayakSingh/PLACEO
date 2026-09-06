'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { FileUp, Sparkles, UploadCloud } from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'

export default function NotesSimplifierPage() {
  const [mode, setMode] = useState<'english' | 'hinglish'>('english')
  const [generated, setGenerated] = useState(false)

  return (
    <PageShell
      title="Smart Notes Simplifier"
      description="Upload PDFs or notes — get exam-ready summaries without losing technical meaning."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display text-sm font-semibold">Upload your notes</h3>
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border px-6 py-12 text-center transition-colors hover:border-brand-blue/50">
            <UploadCloud className="size-9 text-brand-cyan" />
            <p className="mt-3 text-sm font-medium">Drag & drop your PDF or notes here</p>
            <p className="mt-1 text-xs text-muted-foreground">or click to browse (PDF, DOCX, TXT)</p>
            <button className="glass mt-4 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium hover:bg-white/5">
              <FileUp className="size-4" />
              Choose File
            </button>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Output style</p>
            <div className="flex gap-2">
              {(['english', 'hinglish'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    mode === m ? 'brand-gradient text-primary-foreground' : 'glass text-muted-foreground'
                  }`}
                >
                  {m === 'english' ? 'Easy English' : 'Hinglish Mode'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setGenerated(true)}
            className="brand-gradient glow-ring mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01]"
          >
            <Sparkles className="size-4" />
            Simplify Notes
          </button>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="font-display text-sm font-semibold">Simplified output</h3>
          {!generated ? (
            <div className="mt-4 flex h-64 flex-col items-center justify-center text-center text-sm text-muted-foreground">
              Your simplified notes, summary, and flashcards will appear here.
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-3 text-sm"
            >
              <div className="rounded-xl bg-secondary/50 p-4">
                <p className="mb-1 text-xs font-semibold text-brand-cyan">Summary</p>
                <p className="text-muted-foreground">
                  Normalization organizes database tables to reduce redundancy — 1NF removes repeating
                  groups, 2NF removes partial dependency, 3NF removes transitive dependency.
                </p>
              </div>
              <div className="rounded-xl bg-secondary/50 p-4">
                <p className="mb-1 text-xs font-semibold text-brand-cyan">Key Flashcards</p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  <li>What is 1NF? → No repeating groups, atomic values.</li>
                  <li>What is a transitive dependency? → Non-key attribute depends on another non-key attribute.</li>
                </ul>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
