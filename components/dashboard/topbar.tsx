'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  PanelLeft,
  Settings,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TopbarProps = {
  onToggleSidebar: () => void
  onOpenMobile: () => void
}

export function Topbar({ onToggleSidebar, onOpenMobile }: TopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; email: string; avatarUrl?: string } | null>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border px-4 md:px-6">
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onOpenMobile}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      {/* Desktop collapse toggle */}
      <button
        type="button"
        onClick={onToggleSidebar}
        className="hidden size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground lg:flex"
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="size-5" />
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <button
          type="button"
          className="glass relative flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-brand-purple ring-2 ring-background" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="glass flex items-center gap-2 rounded-xl p-1.5 pr-2.5 transition-colors hover:bg-secondary/60"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt="Your profile"
                width={32}
                height={32}
                className="size-8 rounded-lg object-cover"
                unoptimized
              />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-muted-foreground">
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </span>
            )}
            <span className="hidden text-sm font-medium sm:block">
              {user ? user.name.split(' ')[0] : 'Student'}
            </span>
            <ChevronDown
              className={cn(
                'size-4 text-muted-foreground transition-transform',
                menuOpen && 'rotate-180',
              )}
            />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="glass-strong absolute right-0 mt-2 w-52 overflow-hidden rounded-xl p-1.5 shadow-2xl"
              >
                <div className="border-b border-border px-3 py-2">
                  <p className="text-sm font-medium">{user?.name ?? 'Student'}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email ?? ''}</p>
                </div>
                {[
                  { label: 'Profile', icon: User, href: '/profile' },
                  { label: 'Settings', icon: Settings, href: '/settings' },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  )
                })}
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    await fetch('/api/auth/logout', { method: 'POST' })
                    router.push('/')
                    router.refresh()
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="size-4" />
                  Log out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
