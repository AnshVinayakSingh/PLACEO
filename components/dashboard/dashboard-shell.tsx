'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { StatCards } from './stat-cards'
import { SkillChart } from './skill-chart'
import { SkillHeatmap } from './skill-heatmap'
import { ContinueLearning } from './upcoming-tasks'
import { Leaderboard } from './leaderboard'
import { AiInsight } from './ai-insight'

export function DashboardShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [firstName, setFirstName] = useState('Student')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.name) setFirstName(data.user.name.split(' ')[0])
      })
      .catch(() => {})
  }, [])

  return (
    <div className="relative flex min-h-dvh">

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onToggleSidebar={() => setCollapsed((v) => !v)}
          onOpenMobile={() => setMobileOpen(true)}
        />

        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl 2xl:max-w-[96rem]">
            {/* Welcome header */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
                Welcome back, <span className="text-gradient">{firstName}</span>.
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                Here is where things stand. Pick up where you left off.
              </p>
            </motion.div>

            {/* Stat cards */}
            <StatCards />

            {/* Chart + heatmap */}
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SkillChart />
              </div>
              <div className="lg:col-span-1">
                <SkillHeatmap />
              </div>
            </div>

            {/* Tasks + leaderboard + insight */}
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <ContinueLearning />
              <Leaderboard />
              <AiInsight />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
