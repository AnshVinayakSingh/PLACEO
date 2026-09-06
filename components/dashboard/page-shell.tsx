'use client'

import { useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'motion/react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

const AiOrbAmbient = dynamic(
  () => import('@/components/three/ai-orb').then((m) => m.AiOrbAmbient),
  { ssr: false },
)

type PageShellProps = {
  title: string
  description?: string
  children: ReactNode
  headerAction?: ReactNode
}

export function PageShell({ title, description, children, headerAction }: PageShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="relative flex min-h-dvh">
      {/* ambient background orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden grain-overlay">
        <div className="animate-float-orb absolute -left-20 top-1/4 size-96 rounded-full bg-brand-blue/12 blur-3xl" />
        <div className="animate-float-orb absolute -right-16 top-2/3 size-96 rounded-full bg-brand-purple/12 blur-3xl [animation-delay:-6s]" />
        <div className="animate-float-orb absolute left-1/2 top-0 size-72 rounded-full bg-brand-cyan/8 blur-3xl [animation-delay:-11s]" />
        <div className="absolute -right-24 top-1/3 hidden size-[420px] opacity-40 lg:block">
          <AiOrbAmbient className="h-full w-full" />
        </div>
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
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                  {title}
                </h1>
                {description && (
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                )}
              </div>
              {headerAction}
            </motion.div>

            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
