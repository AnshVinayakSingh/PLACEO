'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import {
  Code2,
  FileSearch,
  FileText,
  LayoutDashboard,
  Map,
  MessageCircle,
  MessagesSquare,
  Mic,
  Radar,
  Settings,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Mentor Chat', href: '/ai-mentor', icon: MessageCircle },
  { label: 'AI Planner', href: '/ai-planner', icon: Sparkles },
  { label: 'Skill Analyzer', href: '/skill-analyzer', icon: Radar },
  { label: 'Career Roadmap', href: '/roadmap', icon: Map },
  { label: 'Interview Simulator', href: '/interview-simulator', icon: Mic },
  { label: 'GD Simulator', href: '/gd-simulator', icon: MessagesSquare },
  { label: 'Coding Hub', href: '/coding-hub', icon: Code2 },
  { label: 'Notes Simplifier', href: '/notes-simplifier', icon: FileText },
  { label: 'Resume Analyzer', href: '/resume-analyzer', icon: FileSearch },
  { label: 'Friends & Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Settings', href: '/settings', icon: Settings },
]

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              collapsed && 'justify-center',
              active
                ? 'text-foreground'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="glass-strong glow-ring absolute inset-0 rounded-xl"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <Icon
              className={cn(
                'relative z-10 size-5 shrink-0',
                active && 'text-brand-blue',
              )}
            />
            {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        'flex h-16 items-center gap-2 border-b border-border px-5',
        collapsed && 'justify-center px-0',
      )}
    >
      <span className="brand-gradient glow-ring flex size-9 shrink-0 items-center justify-center rounded-xl">
        <Sparkles className="size-5 text-primary-foreground" />
      </span>
      {!collapsed && (
        <span className="font-display text-lg font-bold tracking-tight">PLACEO</span>
      )}
    </Link>
  )
}

type SidebarProps = {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'glass sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border transition-[width] duration-300 lg:flex',
          collapsed ? 'w-20' : 'w-64',
        )}
      >
        <Brand collapsed={collapsed} />
        <NavList collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
            />
            <motion.aside
              className="glass-strong fixed inset-y-0 left-0 z-50 flex w-72 flex-col lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            >
              <div className="flex items-center justify-between">
                <Brand collapsed={false} />
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="mr-4 flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </div>
              <NavList collapsed={false} onNavigate={onCloseMobile} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
