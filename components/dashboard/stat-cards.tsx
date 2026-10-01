'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircle2, ListChecks, Loader2, Target } from 'lucide-react'
import { useCountUp } from './use-count-up'
import { TiltCard } from '@/components/placeo/tilt-card'

type SkillSummary = { skill: string; accuracy: number; questionsAnswered: number }

type Stat = {
  key: string
  label: string
  value: number
  suffix: string
  icon: typeof Target
  accent: string
  isFloat?: boolean
}

function StatValue({ value, suffix, isFloat }: { value: number; suffix: string; isFloat?: boolean }) {
  const { ref, value: animated } = useCountUp(value)
  const display = isFloat ? animated.toFixed(0) : Math.round(animated).toString()
  return (
    <span ref={ref} className="font-display text-4xl font-medium tabular-nums tracking-tight">
      {display}
      <span className="text-xl text-muted-foreground">{suffix}</span>
    </span>
  )
}

export function StatCards() {
  const [skills, setSkills] = useState<SkillSummary[] | null>(null)

  useEffect(() => {
    fetch('/api/skill-progress')
      .then((res) => res.json())
      .then((data) => setSkills(data.summary || []))
      .catch(() => setSkills([]))
  }, [])

  if (!skills) {
    return (
      <div className="glass flex h-28 items-center justify-center rounded-lg">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const attempted = skills.filter((s) => s.questionsAnswered > 0)
  const avgAccuracy =
    attempted.length > 0
      ? Math.round(attempted.reduce((sum, s) => sum + s.accuracy, 0) / attempted.length)
      : 0
  const totalQuestions = skills.reduce((sum, s) => sum + s.questionsAnswered, 0)

  const stats: Stat[] = [
    {
      key: 'readiness',
      label: 'Avg. Skill Accuracy',
      value: avgAccuracy,
      suffix: '%',
      icon: Target,
      accent: 'var(--primary)',
    },
    {
      key: 'answered',
      label: 'Questions Answered',
      value: totalQuestions,
      suffix: '',
      icon: CheckCircle2,
      accent: 'var(--primary)',
    },
    {
      key: 'practiced',
      label: 'Skills Practiced',
      value: attempted.length,
      suffix: `/${skills.length}`,
      icon: ListChecks,
      accent: 'var(--primary)',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.07 }}
          >
            <TiltCard className="glass glass-hover group relative block overflow-hidden rounded-lg p-5">
              <Icon className="size-5 text-primary" />
              <div className="mt-4">
                <StatValue value={stat.value} suffix={stat.suffix} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </TiltCard>
          </motion.div>
        )
      })}
    </div>
  )
}
