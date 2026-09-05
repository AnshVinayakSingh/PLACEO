'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ListTodo, Loader2, Sparkles } from 'lucide-react'

type SkillSummary = { skill: string; accuracy: number; questionsAnswered: number; weakTopic: string | null }

export function ContinueLearning() {
  const [skills, setSkills] = useState<SkillSummary[] | null>(null)

  useEffect(() => {
    fetch('/api/skill-progress')
      .then((res) => res.json())
      .then((data) => setSkills(data.summary || []))
      .catch(() => setSkills([]))
  }, [])

  const inProgress = (skills || [])
    .filter((s) => s.questionsAnswered > 0 && s.accuracy < 90)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 4)

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-5 md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <ListTodo className="size-5 text-brand-blue" />
        <h3 className="font-display text-lg font-semibold">Continue Learning</h3>
      </div>

      {!skills ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : inProgress.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <Sparkles className="size-6 text-brand-cyan" />
          <p className="text-sm text-muted-foreground">
            Take a quiz in Skill Analyzer to get personalized pickup points here.
          </p>
          <Link
            href="/skill-analyzer"
            className="mt-1 text-xs font-medium text-brand-cyan hover:underline"
          >
            Go to Skill Analyzer
          </Link>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col gap-2">
          {inProgress.map((s) => (
            <li key={s.skill}>
              <Link
                href={`/skill-analyzer?skill=${encodeURIComponent(s.skill)}`}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-secondary/50"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/15 text-xs font-bold text-brand-cyan">
                  {s.accuracy}%
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{s.skill}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.weakTopic ? `Weak spot: ${s.weakTopic}` : `${s.questionsAnswered} questions answered`}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
