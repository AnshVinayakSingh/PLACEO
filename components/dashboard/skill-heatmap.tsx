'use client'

import { motion } from 'motion/react'
import { Radar } from 'lucide-react'
import { skillHeatmap } from '@/lib/dashboard-data'

export function SkillHeatmap() {
  return (
    <div className="glass flex h-full flex-col rounded-2xl p-5 md:p-6">
      <div className="mb-5 flex items-center gap-2">
        <Radar className="size-5 text-brand-blue" />
        <h3 className="font-display text-lg font-semibold">Skill Heatmap</h3>
      </div>
      <div className="flex flex-1 flex-col justify-between gap-4">
        {skillHeatmap.map((skill, i) => (
          <div key={skill.name}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium">{skill.name}</span>
              <span className="tabular-nums text-muted-foreground">{skill.value}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary/70">
              <motion.div
                className="brand-gradient h-full rounded-full"
                initial={{ width: 0 }}
                whileInView={{ width: `${skill.value}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: i * 0.08, ease: [0.21, 0.47, 0.32, 0.98] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
