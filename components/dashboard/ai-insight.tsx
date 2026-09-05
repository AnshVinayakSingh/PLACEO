'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { Lightbulb, Loader2, Sparkles } from 'lucide-react'

type SkillSummary = { skill: string; accuracy: number; questionsAnswered: number; weakTopic: string | null }

export function AiInsight() {
  const [skills, setSkills] = useState<SkillSummary[] | null>(null)

  useEffect(() => {
    fetch('/api/skill-progress')
      .then((res) => res.json())
      .then((data) => setSkills(data.summary || []))
      .catch(() => setSkills([]))
  }, [])

  const attempted = (skills || []).filter((s) => s.questionsAnswered > 0)
  const weakest = attempted.length > 0 ? [...attempted].sort((a, b) => a.accuracy - b.accuracy)[0] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass-strong glow-ring relative h-full overflow-hidden rounded-2xl p-6"
    >
      <div className="brand-gradient pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-30 blur-3xl" />
      <div className="relative flex items-center gap-2">
        <span className="brand-gradient flex size-9 items-center justify-center rounded-xl">
          <Sparkles className="size-5 text-primary-foreground" />
        </span>
        <h3 className="font-display text-lg font-semibold">Your Insight</h3>
      </div>

      <div className="relative mt-5 flex items-start gap-3">
        <Lightbulb className="mt-0.5 size-5 shrink-0 text-brand-cyan" />
        {!skills ? (
          <Loader2 className="mt-1 size-4 animate-spin text-muted-foreground" />
        ) : weakest ? (
          <p className="text-pretty text-sm leading-relaxed text-foreground/90">
            Your weakest area right now is{' '}
            <span className="font-medium text-brand-purple">{weakest.skill}</span> at{' '}
            <span className="font-medium text-brand-cyan">{weakest.accuracy}%</span> accuracy
            {weakest.weakTopic && (
              <>
                {' '}
                — specifically <span className="font-medium text-brand-purple">{weakest.weakTopic}</span>
              </>
            )}
            . A focused practice session there would move the needle the most.
          </p>
        ) : (
          <p className="text-pretty text-sm leading-relaxed text-foreground/90">
            You haven&apos;t attempted any quizzes yet. Take one in Skill Analyzer and this card
            will show your real weak spots.
          </p>
        )}
      </div>

      <Link
        href={weakest ? `/skill-analyzer?skill=${encodeURIComponent(weakest.skill)}` : '/skill-analyzer'}
        className="brand-gradient glow-ring mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
      >
        <Sparkles className="size-4" />
        {weakest ? 'Practice this now' : 'Take a quiz'}
      </Link>
    </motion.div>
  )
}
