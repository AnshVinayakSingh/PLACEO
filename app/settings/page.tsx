'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Bell, Save, Shield, User } from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
]

export default function SettingsPage() {
  const [tab, setTab] = useState('profile')
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
  }, [])


  return (
    <PageShell title="Settings" description="Manage your account, notifications, and security.">
      <div className="glass overflow-hidden rounded-2xl">
        <div className="flex overflow-x-auto border-b border-border">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-medium transition-colors',
                  tab === t.id
                    ? 'border-brand-blue text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-6">
          {tab === 'profile' && (
            <div className="max-w-lg space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Full Name</label>
                <input key={user?.name} defaultValue={user?.name ?? ''} className="glass h-10 w-full rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring/60" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email</label>
                <input key={user?.email} defaultValue={user?.email ?? ''} className="glass h-10 w-full rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring/60" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">College</label>
                <input placeholder="e.g. IIT Delhi" className="glass h-10 w-full rounded-xl px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Target Role</label>
                <input placeholder="e.g. Full Stack Developer" className="glass h-10 w-full rounded-xl px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60" />
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="max-w-lg space-y-4">
              {[
                'Daily study reminders',
                'Mock interview scheduling alerts',
                'Friend leaderboard updates',
                'Weekly progress report email',
              ].map((n) => (
                <label key={n} className="glass flex items-center justify-between rounded-xl px-4 py-3">
                  <span className="text-sm">{n}</span>
                  <input type="checkbox" defaultChecked className="size-4 accent-[oklch(0.62_0.2_265)]" />
                </label>
              ))}
            </div>
          )}

          {tab === 'security' && (
            <div className="max-w-lg space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Current Password</label>
                <input type="password" placeholder="••••••••" className="glass h-10 w-full rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring/60" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">New Password</label>
                <input type="password" placeholder="••••••••" className="glass h-10 w-full rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring/60" />
              </div>
              <label className="glass flex items-center justify-between rounded-xl px-4 py-3">
                <span className="text-sm">Two-factor authentication</span>
                <input type="checkbox" className="size-4 accent-[oklch(0.62_0.2_265)]" />
              </label>
            </div>
          )}

          <button className="brand-gradient glow-ring mt-6 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]">
            <Save className="size-4" />
            Save Changes
          </button>
        </motion.div>
      </div>
    </PageShell>
  )
}
