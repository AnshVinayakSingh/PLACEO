'use client'

import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Loader2 } from 'lucide-react'

type SkillSummary = { skill: string; accuracy: number; questionsAnswered: number }

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: SkillSummary }>
}) {
  if (!active || !payload?.length) return null
  const s = payload[0].payload
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-foreground">{s.skill}</p>
      <p className="text-muted-foreground">
        {s.questionsAnswered > 0 ? (
          <>
            <span className="font-medium text-foreground">{s.accuracy}%</span> accuracy over{' '}
            {s.questionsAnswered} questions
          </>
        ) : (
          'Not attempted yet'
        )}
      </p>
    </div>
  )
}

export function SkillChart() {
  const [skills, setSkills] = useState<SkillSummary[] | null>(null)

  useEffect(() => {
    fetch('/api/skill-progress')
      .then((res) => res.json())
      .then((data) => setSkills(data.summary || []))
      .catch(() => setSkills([]))
  }, [])

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-5 md:p-6">
      <div className="mb-4">
        <h3 className="font-display text-lg font-semibold">Skill Accuracy</h3>
        <p className="text-sm text-muted-foreground">Based on your actual quiz attempts</p>
      </div>

      {!skills ? (
        <div className="flex h-64 items-center justify-center md:h-72">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : skills.every((s) => s.questionsAnswered === 0) ? (
        <div className="flex h-64 flex-col items-center justify-center text-center md:h-72">
          <p className="text-sm text-muted-foreground">
            No quiz attempts yet — take a Skill Analyzer quiz to see your accuracy here.
          </p>
        </div>
      ) : (
        <div className="h-64 w-full md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={skills} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.98 0.02 275 / 8%)" vertical={false} />
              <XAxis
                dataKey="skill"
                tick={{ fill: 'oklch(0.72 0.03 275)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: 'oklch(0.72 0.03 275)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'oklch(0.98 0.02 275 / 6%)' }} />
              <Bar dataKey="accuracy" fill="oklch(0.62 0.2 265)" radius={[6, 6, 0, 0]} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
