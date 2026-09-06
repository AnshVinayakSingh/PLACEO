'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import {
  Bell,
  Check,
  Clock,
  Loader2,
  Search,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'
import { cn } from '@/lib/utils'

// ---------- Types ----------

type PublicUser = { id: string; name: string; avatarUrl: string; placeoId: string }
type LeaderEntry = PublicUser & {
  isYou: boolean
  stats: { score: number; avgAccuracy: number; questionsAnswered: number }
}
type RequestEntry = { friendshipId: string; user: PublicUser }

type FriendProfile = {
  name: string
  avatarUrl: string
  bio: string
  placeoId: string
  memberSince: string
  stats: {
    score: number
    avgAccuracy: number
    questionsAnswered: number
    skillsPracticed: number
    totalSkills: number
    mentorSessions: number
  }
}

type Tab = 'leaderboard' | 'requests' | 'add'

function Avatar({ name, avatarUrl, size = 40 }: { name: string; avatarUrl: string; size?: number }) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        unoptimized
        style={{ width: size, height: size }}
        className="shrink-0 rounded-xl object-cover"
      />
    )
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="brand-gradient flex shrink-0 items-center justify-center rounded-xl font-semibold text-primary-foreground"
    >
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

// ---------- Main page ----------

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('leaderboard')
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[] | null>(null)
  const [incoming, setIncoming] = useState<RequestEntry[]>([])
  const [outgoing, setOutgoing] = useState<RequestEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [addId, setAddId] = useState('')
  const [addStatus, setAddStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [adding, setAdding] = useState(false)

  const [selected, setSelected] = useState<FriendProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch('/api/friends')
      .then((res) => res.json())
      .then((data) => {
        setLeaderboard(data.leaderboard || [])
        setIncoming(data.incomingRequests || [])
        setOutgoing(data.outgoingRequests || [])
      })
      .catch(() => {
        setLeaderboard([])
        setIncoming([])
        setOutgoing([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function sendRequest() {
    setAddStatus(null)
    if (!/^\d{10}$/.test(addId.trim())) {
      setAddStatus({ type: 'error', text: 'Enter a valid 10-digit PLACEO ID.' })
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeoId: addId.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddStatus({ type: 'error', text: data.error || 'Could not send request.' })
        return
      }
      setAddStatus({ type: 'success', text: `Friend request sent to ${data.sentTo}.` })
      setAddId('')
      refresh()
    } catch {
      setAddStatus({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setAdding(false)
    }
  }

  async function respond(friendshipId: string, action: 'accept' | 'reject') {
    try {
      await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action }),
      })
      refresh()
    } catch {
      // silent — refresh() will just show the unchanged state, user can retry
    }
  }

  async function viewProfile(placeoId: string) {
    setLoadingProfile(true)
    setSelected(null)
    try {
      const res = await fetch(`/api/friends/${placeoId}`)
      const data = await res.json()
      if (res.ok) setSelected(data.profile)
    } finally {
      setLoadingProfile(false)
    }
  }

  const hasFriends = (leaderboard?.length ?? 0) > 1

  return (
    <PageShell
      title="Friends & Leaderboard"
      description="Add friends by their PLACEO ID to compare real progress."
    >
      {/* Tabs */}
      <div className="glass mb-4 flex gap-1.5 rounded-2xl p-1.5">
        {([
          { id: 'leaderboard' as const, label: 'Leaderboard', icon: Trophy, badge: 0 },
          { id: 'requests' as const, label: 'Requests', icon: Bell, badge: incoming.length },
          { id: 'add' as const, label: 'Add Friend', icon: UserPlus, badge: 0 },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              tab === t.id ? 'brand-gradient text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <t.icon className="size-4" />
            {t.label}
            {!!t.badge && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Leaderboard tab */}
      {tab === 'leaderboard' && (
        <>
          {loading ? (
            <div className="glass flex min-h-[300px] items-center justify-center rounded-2xl">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : !hasFriends ? (
            <div className="glass flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl p-8 text-center">
              <Users className="size-9 text-muted-foreground" />
              <p className="text-sm font-medium">No friends yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Add a friend using their 10-digit PLACEO ID to start comparing real quiz stats and
                climbing the leaderboard together.
              </p>
              <button
                onClick={() => setTab('add')}
                className="brand-gradient glow-ring mt-2 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
              >
                <UserPlus className="size-4" />
                Add a Friend
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {leaderboard!.slice(0, 3).map((f, i) => {
                  const medalColor = ['oklch(0.85 0.16 90)', 'oklch(0.8 0.02 275)', 'oklch(0.68 0.14 55)'][i]
                  return (
                    <motion.button
                      key={f.id}
                      onClick={() => !f.isYou && viewProfile(f.placeoId)}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                      className={cn(
                        'glass relative rounded-2xl p-5 text-center transition-transform',
                        !f.isYou && 'cursor-pointer hover:scale-[1.02]',
                      )}
                    >
                      <Trophy className="mx-auto size-6" style={{ color: medalColor }} />
                      <div className="mx-auto mt-3 w-fit">
                        <Avatar name={f.name} avatarUrl={f.avatarUrl} size={56} />
                      </div>
                      <p className="mt-2 text-sm font-semibold">
                        {f.name} {f.isYou && <span className="text-brand-cyan">(you)</span>}
                      </p>
                      <p className="font-display text-xl font-bold text-gradient">{f.stats.score}</p>
                    </motion.button>
                  )
                })}
              </div>

              <div className="glass mt-4 overflow-hidden rounded-2xl">
                <div className="hidden grid-cols-[3rem_1fr_6rem_6rem] gap-2 border-b border-border px-5 py-3 text-xs font-medium text-muted-foreground sm:grid">
                  <span>Rank</span>
                  <span>Student</span>
                  <span>Accuracy</span>
                  <span>Score</span>
                </div>
                {leaderboard!.map((f, i) => (
                  <motion.button
                    key={f.id}
                    onClick={() => !f.isYou && viewProfile(f.placeoId)}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-border/60 px-5 py-3.5 text-left last:border-0 sm:grid sm:grid-cols-[3rem_1fr_6rem_6rem]',
                      f.isYou ? 'bg-brand-blue/5' : 'hover:bg-white/[0.02]',
                    )}
                  >
                    <span className="w-8 text-sm font-bold text-muted-foreground sm:w-auto">#{i + 1}</span>
                    <div className="flex flex-1 items-center gap-2.5">
                      <Avatar name={f.name} avatarUrl={f.avatarUrl} size={32} />
                      <span className="text-sm font-medium">
                        {f.name}
                        {f.isYou && <span className="ml-1 text-xs text-brand-cyan">(you)</span>}
                      </span>
                    </div>
                    <span className="hidden text-sm text-muted-foreground sm:block">{f.stats.avgAccuracy}%</span>
                    <span className="ml-auto text-sm font-semibold sm:ml-0">{f.stats.score}</span>
                  </motion.button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Requests tab */}
      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <h3 className="font-display mb-3 flex items-center gap-2 text-sm font-semibold">
              <Bell className="size-4 text-brand-cyan" /> Incoming Requests
            </h3>
            {incoming.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              <div className="space-y-2">
                {incoming.map((r) => (
                  <div key={r.friendshipId} className="flex items-center gap-3 rounded-xl bg-white/[0.02] p-3">
                    <Avatar name={r.user.name} avatarUrl={r.user.avatarUrl} size={36} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.user.name}</span>
                    <button
                      onClick={() => respond(r.friendshipId, 'accept')}
                      className="flex items-center gap-1 rounded-lg bg-emerald-400/15 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-400/25"
                    >
                      <Check className="size-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => respond(r.friendshipId, 'reject')}
                      className="flex items-center gap-1 rounded-lg bg-destructive/15 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/25"
                    >
                      <X className="size-3.5" /> Reject
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="font-display mb-3 flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4 text-muted-foreground" /> Sent Requests (waiting)
            </h3>
            {outgoing.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No outgoing requests.</p>
            ) : (
              <div className="space-y-2">
                {outgoing.map((r) => (
                  <div key={r.friendshipId} className="flex items-center gap-3 rounded-xl bg-white/[0.02] p-3">
                    <Avatar name={r.user.name} avatarUrl={r.user.avatarUrl} size={36} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.user.name}</span>
                    <span className="text-xs text-muted-foreground">Pending</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add friend tab */}
      {tab === 'add' && (
        <div className="glass mx-auto max-w-md rounded-2xl p-6">
          <h3 className="font-display mb-1 flex items-center gap-2 text-sm font-semibold">
            <Search className="size-4 text-brand-cyan" /> Add a friend
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Ask your friend for their PLACEO ID (shown on their Profile page) and enter it below.
          </p>
          <div className="flex gap-2">
            <input
              value={addId}
              onChange={(e) => setAddId(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit PLACEO ID"
              inputMode="numeric"
              className="glass h-10 flex-1 rounded-lg px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring/60"
            />
            <button
              onClick={sendRequest}
              disabled={adding}
              className="brand-gradient glow-ring flex items-center gap-2 rounded-lg px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {adding ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Send
            </button>
          </div>
          {addStatus && (
            <p className={cn('mt-3 text-sm', addStatus.type === 'success' ? 'text-emerald-400' : 'text-destructive')}>
              {addStatus.text}
            </p>
          )}
        </div>
      )}

      {/* Friend profile modal */}
      <AnimatePresence>
        {(loadingProfile || selected) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !loadingProfile && setSelected(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong w-full max-w-sm rounded-2xl p-6"
            >
              {loadingProfile || !selected ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={selected.name} avatarUrl={selected.avatarUrl} size={52} />
                      <div>
                        <p className="font-display font-semibold">{selected.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{selected.placeoId}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  {selected.bio && <p className="mt-3 text-sm text-muted-foreground">{selected.bio}</p>}

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                      <p className="font-display text-xl font-bold">{selected.stats.avgAccuracy}%</p>
                      <p className="text-xs text-muted-foreground">Avg Accuracy</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                      <p className="font-display text-xl font-bold">{selected.stats.questionsAnswered}</p>
                      <p className="text-xs text-muted-foreground">Questions Answered</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                      <p className="font-display text-xl font-bold">
                        {selected.stats.skillsPracticed}/{selected.stats.totalSkills}
                      </p>
                      <p className="text-xs text-muted-foreground">Skills Practiced</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                      <p className="font-display text-xl font-bold">{selected.stats.score}</p>
                      <p className="text-xs text-muted-foreground">Score</p>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}
