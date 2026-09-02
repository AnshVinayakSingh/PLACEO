'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { AlertCircle, Bell, Camera, Check, Loader2, Save, Shield, User } from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'
import { cn } from '@/lib/utils'
import { fileToCompressedDataUrl } from '@/lib/image'

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
]

type Profile = {
  name: string
  email: string
  avatarUrl: string
  bio: string
  linkedinUrl: string
  leetcodeUrl: string
  targetRole: string
  college: string
}

export default function SettingsPage() {
  const [tab, setTab] = useState('profile')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => setProfile(data.user))
      .catch(() => setError('Could not load your profile.'))
      .finally(() => setLoading(false))
  }, [])

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p))
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 256, 0.85)
      update('avatarUrl', dataUrl)
    } catch {
      setError('Could not process that image. Try a different one.')
    }
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not save changes.')
        setSaving(false)
        return
      }
      setProfile(data.user)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

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
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-brand-cyan" />
            </div>
          ) : (
            <>
              {tab === 'profile' && profile && (
                <div className="max-w-lg space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="group relative">
                      <div className="glow-ring flex size-16 items-center justify-center overflow-hidden rounded-full bg-secondary">
                        {profile.avatarUrl ? (
                          <Image
                            src={profile.avatarUrl}
                            alt={profile.name}
                            width={64}
                            height={64}
                            className="size-16 rounded-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="text-lg font-semibold text-muted-foreground">
                            {profile.name?.[0]?.toUpperCase() ?? '?'}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="brand-gradient absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full text-primary-foreground shadow"
                        aria-label="Change photo"
                        type="button"
                      >
                        <Camera className="size-3.5" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Profile photo</p>
                      <p className="text-xs text-muted-foreground">JPG or PNG, auto-resized</p>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Full Name</label>
                    <input
                      value={profile.name}
                      onChange={(e) => update('name', e.target.value)}
                      className="glass h-10 w-full rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring/60"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Email</label>
                    <input
                      value={profile.email}
                      disabled
                      className="glass h-10 w-full rounded-xl px-3 text-sm text-muted-foreground outline-none opacity-70"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Bio / Caption
                      <span className="ml-1 font-normal text-muted-foreground">
                        ({profile.bio.length}/200)
                      </span>
                    </label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => update('bio', e.target.value.slice(0, 200))}
                      placeholder="A short line about yourself..."
                      rows={2}
                      className="glass w-full resize-none rounded-xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">College</label>
                    <input
                      value={profile.college}
                      onChange={(e) => update('college', e.target.value)}
                      placeholder="e.g. IIT Delhi"
                      className="glass h-10 w-full rounded-xl px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Target Role</label>
                    <input
                      value={profile.targetRole}
                      onChange={(e) => update('targetRole', e.target.value)}
                      placeholder="e.g. Full Stack Developer"
                      className="glass h-10 w-full rounded-xl px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">LinkedIn Profile</label>
                    <input
                      value={profile.linkedinUrl}
                      onChange={(e) => update('linkedinUrl', e.target.value)}
                      placeholder="linkedin.com/in/your-name"
                      className="glass h-10 w-full rounded-xl px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">LeetCode Profile</label>
                    <input
                      value={profile.leetcodeUrl}
                      onChange={(e) => update('leetcodeUrl', e.target.value)}
                      placeholder="leetcode.com/your-username"
                      className="glass h-10 w-full rounded-xl px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60"
                    />
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
                  <p className="text-xs text-muted-foreground">
                    Notification delivery isn't wired up yet — these preferences aren't saved.
                  </p>
                </div>
              )}

              {tab === 'security' && (
                <div className="max-w-lg space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Current Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="glass h-10 w-full rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring/60"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="glass h-10 w-full rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-ring/60"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password changes aren't wired up yet — coming soon.
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {tab === 'profile' && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="brand-gradient glow-ring mt-6 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : saved ? (
                    <Check className="size-4" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {saved ? 'Saved' : 'Save Changes'}
                </button>
              )}
            </>
          )}
        </motion.div>
      </div>
    </PageShell>
  )
}
