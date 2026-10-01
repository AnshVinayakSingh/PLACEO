'use client'

import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

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
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
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
