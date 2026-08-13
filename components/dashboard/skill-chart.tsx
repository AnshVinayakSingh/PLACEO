'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { masteryData } from '@/lib/dashboard-data'

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-foreground">Day {label?.replace('D', '')}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize">{p.name}</span>
          <span className="ml-auto font-medium text-foreground">{p.value}%</span>
        </p>
      ))}
    </div>
  )
}

export function SkillChart() {
  return (
    <div className="glass flex h-full flex-col rounded-2xl p-5 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Skill Mastery Progress</h3>
          <p className="text-sm text-muted-foreground">Last 30 days</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-brand-blue" />
            Mastery
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-brand-purple" />
            Problems
          </span>
        </div>
      </div>
      <div className="h-64 w-full md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={masteryData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="fillMastery" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.62 0.2 265)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="oklch(0.62 0.2 265)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillProblems" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.65 0.24 300)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="oklch(0.65 0.24 300)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.98 0.02 275 / 8%)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fill: 'oklch(0.72 0.03 275)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={5}
            />
            <YAxis
              tick={{ fill: 'oklch(0.72 0.03 275)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'oklch(0.62 0.2 265 / 40%)' }} />
            <Area
              type="monotone"
              dataKey="problems"
              stroke="oklch(0.65 0.24 300)"
              strokeWidth={2}
              fill="url(#fillProblems)"
              animationDuration={1200}
            />
            <Area
              type="monotone"
              dataKey="mastery"
              stroke="oklch(0.62 0.2 265)"
              strokeWidth={2.5}
              fill="url(#fillMastery)"
              animationDuration={1400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
