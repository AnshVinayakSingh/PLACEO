'use client'

import { motion } from 'motion/react'
import { Clock, Flame, Mic, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { statCards, type StatCard } from '@/lib/dashboard-data'
import { useCountUp } from './use-count-up'
import { cn } from '@/lib/utils'
import { TiltCard } from '@/components/placeo/tilt-card'

const iconMap = {
  target: Target,
  flame: Flame,
  mic: Mic,
  clock: Clock,
}

function StatValue({ stat }: { stat: StatCard }) {
  const { ref, value } = useCountUp(stat.value)
  const isFloat = !Number.isInteger(stat.value)
  const display = isFloat ? value.toFixed(1) : Math.round(value).toString()
  return (
    <span ref={ref} className="font-display text-3xl font-bold tabular-nums tracking-tight">
      {display}
      <span className="text-xl text-muted-foreground">{stat.suffix}</span>
    </span>
  )
}

export function StatCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statCards.map((stat, i) => {
        const Icon = iconMap[stat.icon]
        const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown
        return (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.07 }}
          >
            <TiltCard className="glass glass-hover group relative block overflow-hidden rounded-2xl p-5">
            <div
              className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
              style={{ background: stat.accent }}
            />
            <div className="flex items-center justify-between">
              <span
                className="flex size-11 items-center justify-center rounded-xl"
                style={{
                  background: `color-mix(in oklch, ${stat.accent} 22%, transparent)`,
                  color: stat.accent,
                }}
              >
                <Icon className="size-5" />
              </span>
              <span
                className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                  stat.trend === 'up'
                    ? 'bg-brand-blue/15 text-brand-cyan'
                    : 'bg-destructive/15 text-destructive',
                )}
              >
                <TrendIcon className="size-3.5" />
                {stat.change}
              </span>
            </div>
            <div className="mt-4">
              <StatValue stat={stat} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </TiltCard>
          </motion.div>
        )
      })}
    </div>
  )
}
