'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { StatCards } from './stat-cards'
import { SkillChart } from './skill-chart'
import { SkillHeatmap } from './skill-heatmap'
import { UpcomingTasks } from './upcoming-tasks'
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
      {/* ambient background orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="animate-float-orb absolute -left-20 top-1/4 size-96 rounded-full bg-brand-blue/10 blur-3xl" />
        <div className="animate-float-orb absolute -right-16 top-2/3 size-96 rounded-full bg-brand-purple/10 blur-3xl [animation-delay:-6s]" />
      </div>

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
          <div className="mx-auto max-w-7xl">
            {/* Welcome header */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                Welcome back, <span className="text-gradient">{firstName}</span>
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                You&apos;re in the top 8% of your cohort this week — one more mock interview keeps
                the streak alive.
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
              <UpcomingTasks />
              <Leaderboard />
              <AiInsight />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
