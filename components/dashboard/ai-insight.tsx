'use client'

import { motion } from 'motion/react'
import { Lightbulb, Sparkles } from 'lucide-react'

export function AiInsight() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass-strong glow-ring relative h-full overflow-hidden rounded-2xl p-6"
    >
      {/* glowing accent orb */}
      <div className="brand-gradient pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-30 blur-3xl" />
      <div className="relative flex items-center gap-2">
        <span className="brand-gradient flex size-9 items-center justify-center rounded-xl">
          <Sparkles className="size-5 text-primary-foreground" />
        </span>
        <h3 className="font-display text-lg font-semibold">AI Insight of the Day</h3>
      </div>

      <div className="relative mt-5 flex items-start gap-3">
        <Lightbulb className="mt-0.5 size-5 shrink-0 text-brand-cyan" />
        <p className="text-pretty text-sm leading-relaxed text-foreground/90">
          Your <span className="font-medium text-brand-cyan">DSA mastery</span> jumped 6% this
          week, but your <span className="font-medium text-brand-purple">Aptitude</span> score is
          trailing. Spend 30 focused minutes on quantitative reasoning today to keep your
          placement readiness climbing toward 85%.
        </p>
      </div>

      <button
        type="button"
        className="brand-gradient glow-ring mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
      >
        <Sparkles className="size-4" />
        Generate today&apos;s plan
      </button>
    </motion.div>
  )
}
