'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Loader2, Radar } from 'lucide-react'

type SkillSummary = { skill: string; accuracy: number; questionsAnswered: number }

export function SkillHeatmap() {
  const [skills, setSkills] = useState<SkillSummary[] | null>(null)

  useEffect(() => {
    fetch('/api/skill-progress')
      .then((res) => res.json())
      .then((data) => setSkills(data.summary || []))
      .catch(() => setSkills([]))
  }, [])

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-5 md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <Radar className="size-5 text-brand-blue" />
        <h3 className="font-display text-lg font-semibold">Skill Heatmap</h3>
      </div>

      {!skills ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-between gap-4">
          {skills.map((skill, i) => (
            <div key={skill.skill}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium">{skill.skill}</span>
                <span className="tabular-nums text-muted-foreground">
                  {skill.questionsAnswered > 0 ? `${skill.accuracy}%` : '—'}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary/70">
                <motion.div
                  className="brand-gradient h-full rounded-full"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${skill.accuracy}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: i * 0.08, ease: [0.21, 0.47, 0.32, 0.98] }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
