'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import {
  Bot,
  Check,
  Loader2,
  MessagesSquare,
  Play,
  Plus,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'
import { GDCallRoom, type GDTranscriptEntry } from '@/components/gd-simulator/gd-call-room'
import type { GDParticipant } from '@/lib/gd-instruction'

type ViewState = 'mode-select' | 'solo-setup' | 'create-room' | 'lobby' | 'call' | 'feedback' | 'gd-ended'

interface GDMemberView {
  userId: string
  name: string
  avatarUrl?: string
  status: 'invited' | 'joined' | 'declined' | 'left'
  isHost: boolean
}

interface GDRoomView {
  _id: string
  hostId: string
  mode: 'solo' | 'multiplayer'
  companyName: string
  jobRole: string
  topic?: string
  status: 'lobby' | 'active' | 'completed' | 'cancelled'
  members: GDMemberView[]
  maxMembers: number
}

interface FriendOption {
  id: string
  name: string
  avatarUrl: string
}

interface GDFeedbackParticipant {
  name: string
  contributionScore: number
  clarityScore: number
  stayedOnTopic: boolean
  strengths: string[]
  improvements: string[]
}

interface GDFeedback {
  overallSummary: string
  participantFeedback: GDFeedbackParticipant[]
}

function GdSimulatorInner() {
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)
  const [view, setView] = useState<ViewState>('mode-select')
  const [companyName, setCompanyName] = useState('')
  const [jobRole, setJobRole] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [room, setRoom] = useState<GDRoomView | null>(null)
  const [friends, setFriends] = useState<FriendOption[]>([])
  const [showInvitePicker, setShowInvitePicker] = useState(false)
  const [feedback, setFeedback] = useState<GDFeedback | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const roomIdRef = useRef<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    roomIdRef.current = room?._id || null
  }, [room])

  // Load current user
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.user))
      .catch(() => {})
  }, [])

  const refreshRoom = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(`/api/gd-simulator/rooms/${roomId}`)
      const data = await res.json()
      if (res.ok && data.room) {
        setRoom(data.room)
        if (data.room.status === 'active') setView((v) => (v === 'lobby' ? 'call' : v))
      }
    } catch {}
  }, [])

  // Entering via an accepted invite link (?joinRoom=<id>) — works whether the
  // room is still waiting in its lobby, already live (mid-call join), or has
  // already finished by the time this person gets here.
  useEffect(() => {
    const joinRoomId = searchParams.get('joinRoom')
    if (!joinRoomId) return
    router.replace('/gd-simulator')
    ;(async () => {
      try {
        const res = await fetch(`/api/gd-simulator/rooms/${joinRoomId}`)
        const data = await res.json()
        if (!res.ok || !data.room) {
          setErrorMsg(data.error || 'Could not open that GD room.')
          return
        }
        setRoom(data.room)
        if (data.room.status === 'completed' || data.room.status === 'cancelled') setView('gd-ended')
        else if (data.room.status === 'active') setView('call')
        else setView('lobby')
      } catch {
        setErrorMsg('Could not open that GD room.')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Real-time room updates (invite popups themselves are shown globally by GDInviteProvider)
  useEffect(() => {
    if (!currentUser) return
    const es = new EventSource('/api/gd-simulator/events')
    es.addEventListener('room-updated', () => {
      if (roomIdRef.current) void refreshRoom(roomIdRef.current)
    })
    es.addEventListener('room-started', () => {
      if (roomIdRef.current) void refreshRoom(roomIdRef.current)
    })
    return () => es.close()
  }, [currentUser, refreshRoom])

  // Safety-net polling while in the lobby, in case an SSE event is missed
  useEffect(() => {
    if (view !== 'lobby' || !room) return
    const interval = setInterval(() => void refreshRoom(room._id), 3000)
    return () => clearInterval(interval)
  }, [view, room, refreshRoom])

  const handleCreateRoom = async (mode: 'solo' | 'multiplayer') => {
    if (!companyName.trim() || !jobRole.trim()) {
      setErrorMsg('Please enter both the target company and job role.')
      return
    }
    setErrorMsg(null)
    setIsCreating(true)
    try {
      const res = await fetch('/api/gd-simulator/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, companyName, jobRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not create room')
      setRoom(data.room)
      setView(mode === 'solo' ? 'call' : 'lobby')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsCreating(false)
    }
  }

  const openInvitePicker = async () => {
    setShowInvitePicker(true)
    try {
      const res = await fetch('/api/friends')
      const data = await res.json()
      const list: FriendOption[] = (data.leaderboard || [])
        .filter((f: any) => !f.isYou)
        .map((f: any) => ({ id: f.id, name: f.name, avatarUrl: f.avatarUrl }))
      setFriends(list)
    } catch {}
  }

  const inviteFriend = async (friendUserId: string) => {
    if (!room) return
    try {
      const res = await fetch(`/api/gd-simulator/rooms/${room._id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendUserId }),
      })
      const data = await res.json()
      if (res.ok) {
        void refreshRoom(room._id)
      } else {
        setErrorMsg(data.error || 'Could not send invite.')
      }
    } catch {
      setErrorMsg('Could not send invite.')
    }
  }

  const startGD = async () => {
    if (!room) return
    try {
      const res = await fetch(`/api/gd-simulator/rooms/${room._id}/start`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setRoom(data.room)
        setView('call')
      } else {
        setErrorMsg(data.error || 'Could not start the GD.')
      }
    } catch {
      setErrorMsg('Could not start the GD.')
    }
  }

  const handleCallEnd = async (transcript: GDTranscriptEntry[]) => {
    if (!room) return
    try {
      const res = await fetch(`/api/gd-simulator/rooms/${room._id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })
      const data = await res.json()
      setFeedback(data.feedback || null)
    } catch {
      setFeedback(null)
    } finally {
      setView('feedback')
    }
  }

  const resetToStart = () => {
    setRoom(null)
    setFeedback(null)
    setCompanyName('')
    setJobRole('')
    setView('mode-select')
  }

  const buildParticipants = (): GDParticipant[] => {
    if (!room) return currentUser ? [{ name: currentUser.name, isUser: true }] : []
    if (room.mode === 'solo') return [{ name: currentUser?.name || 'Candidate', isUser: true }]
    return room.members.filter((m) => m.status === 'joined').map((m) => ({ name: m.name, isUser: true }))
  }

  return (
    <PageShell
      title="AI Group Discussion Simulator"
      description="Practice with AI participants, or bring your friends into a live moderated GD room."
    >
      {/* Note: the invite popup itself is shown globally (any page) by GDInviteProvider in the root layout. */}

      {errorMsg && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* 1. Mode select */}
      {view === 'mode-select' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <motion.button
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setView('solo-setup')}
            className="glass rounded-2xl p-6 text-left transition-colors hover:ring-2 hover:ring-brand-purple/40"
          >
            <span className="brand-gradient flex size-12 items-center justify-center rounded-xl text-white">
              <Bot className="size-6" />
            </span>
            <h3 className="mt-4 text-sm font-bold">Practice with AI</h3>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Solo mode — AI Coach moderates and voices additional co-panelists so you can practice alone, live.
            </p>
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            onClick={() => setView('create-room')}
            className="glass rounded-2xl p-6 text-left transition-colors hover:ring-2 hover:ring-brand-purple/40"
          >
            <span className="brand-gradient flex size-12 items-center justify-center rounded-xl text-white">
              <Users className="size-6" />
            </span>
            <h3 className="mt-4 text-sm font-bold">Create Room with Friends</h3>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Invite up to 6 friends into a live room. AI moderates, generates the topic, and keeps everyone on track.
            </p>
          </motion.button>
        </div>
      )}

      {/* 2. Setup form (shared by solo + create-room) */}
      {(view === 'solo-setup' || view === 'create-room') && (
        <div className="glass mx-auto max-w-lg rounded-3xl p-8">
          <span className="brand-gradient flex size-12 items-center justify-center rounded-xl text-white">
            <MessagesSquare className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold">
            {view === 'solo-setup' ? 'Set up your solo GD practice' : 'Set up your GD room'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            The AI generates a topic sized to this exact role's difficulty.
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400">Target Company</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Google, TCS, a startup…"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-brand-purple/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Target Job Role</label>
              <input
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="e.g. SDE-1, Product Manager, Data Analyst…"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-brand-purple/50"
              />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setView('mode-select')}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300"
            >
              Back
            </button>
            <button
              disabled={isCreating}
              onClick={() => handleCreateRoom(view === 'solo-setup' ? 'solo' : 'multiplayer')}
              className="brand-gradient glow-ring flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
            >
              {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {view === 'solo-setup' ? 'Start Practice' : 'Create Room'}
            </button>
          </div>
        </div>
      )}

      {/* 3. Multiplayer lobby */}
      {view === 'lobby' && room && (
        <div className="glass mx-auto max-w-xl rounded-3xl p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">GD Room Lobby</h2>
              <p className="text-xs text-muted-foreground">{room.jobRole} · {room.companyName}</p>
            </div>
            <span className="rounded-full bg-brand-purple/15 px-3 py-1 text-[11px] font-medium text-brand-purple">
              {room.members.filter((m) => m.status === 'joined').length}/{room.maxMembers}
            </span>
          </div>

          <div className="mt-5 space-y-2">
            {room.members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5">
                <span className="text-sm font-medium">{m.name} {m.isHost && <span className="text-[10px] text-brand-purple">(Host)</span>}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    m.status === 'joined' ? 'bg-emerald-500/15 text-emerald-400' : m.status === 'invited' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-500/15 text-slate-400'
                  }`}
                >
                  {m.status}
                </span>
              </div>
            ))}
          </div>

          {room.hostId === currentUser?.id && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={openInvitePicker}
                disabled={room.members.filter((m) => m.status !== 'declined' && m.status !== 'left').length >= room.maxMembers}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-200 disabled:opacity-50"
              >
                <UserPlus className="size-4" /> Invite Friends
              </button>
              <button
                onClick={startGD}
                disabled={room.members.filter((m) => m.status === 'joined').length < 2}
                className="brand-gradient glow-ring flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                <Play className="size-4" /> Start GD (min. 2)
              </button>
            </div>
          )}

          {/* Invite picker modal */}
          <AnimatePresence>
            {showInvitePicker && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                onClick={() => setShowInvitePicker(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={(e) => e.stopPropagation()}
                  className="glass max-h-[70vh] w-full max-w-sm overflow-y-auto rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">Invite a Friend</h3>
                    <button onClick={() => setShowInvitePicker(false)}><X className="size-4 text-slate-400" /></button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {friends.length === 0 && <p className="text-xs text-slate-500">No friends found. Add friends first from the Leaderboard page.</p>}
                    {friends.map((f) => {
                      const alreadyIn = room.members.some((m) => m.userId === f.id && m.status !== 'declined' && m.status !== 'left')
                      return (
                        <button
                          key={f.id}
                          disabled={alreadyIn}
                          onClick={() => inviteFriend(f.id)}
                          className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 text-left text-sm disabled:opacity-40"
                        >
                          <span>{f.name}</span>
                          {alreadyIn ? <Check className="size-4 text-emerald-400" /> : <Plus className="size-4 text-slate-400" />}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 4. Live call */}
      {view === 'call' && room && (
        <GDCallRoom
          roomId={room._id}
          mode={room.mode}
          companyName={room.companyName}
          jobRole={room.jobRole}
          topic={room.topic || 'General GD topic'}
          userName={currentUser?.name || 'Candidate'}
          participants={buildParticipants()}
          currentUserId={currentUser?.id}
          isHost={room.hostId === currentUser?.id}
          roomMembers={room.members.filter((m) => m.status === 'joined').map((m) => ({ userId: m.userId, name: m.name, isHost: m.isHost }))}
          onEnd={handleCallEnd}
        />
      )}

      {/* GD already ended by the time this person joined */}
      {view === 'gd-ended' && (
        <div className="glass mx-auto max-w-md rounded-3xl p-8 text-center">
          <span className="brand-gradient mx-auto flex size-12 items-center justify-center rounded-xl text-white">
            <MessagesSquare className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold">This GD has ended</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            By the time you joined, this discussion had already wrapped up. Start a new one instead.
          </p>
          <button
            onClick={resetToStart}
            className="brand-gradient glow-ring mt-6 flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-primary-foreground"
          >
            <Sparkles className="size-4" /> Start a New GD
          </button>
        </div>
      )}

      {/* 5. Feedback */}
      {view === 'feedback' && (
        <div className="glass mx-auto max-w-xl rounded-3xl p-8">
          <span className="brand-gradient flex size-12 items-center justify-center rounded-xl text-white">
            <Trophy className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold">GD Feedback</h2>
          {feedback ? (
            <>
              <p className="mt-2 text-xs text-muted-foreground">{feedback.overallSummary}</p>
              <div className="mt-5 space-y-3">
                {feedback.participantFeedback.map((p) => (
                  <div key={p.name} className="rounded-xl bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{p.name}</span>
                      <span className={`text-xs font-bold ${p.stayedOnTopic ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {p.stayedOnTopic ? 'Stayed on topic' : 'Went off-topic'}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-slate-400">
                      <span>Contribution: {p.contributionScore}%</span>
                      <span>Clarity: {p.clarityScore}%</span>
                    </div>
                    {p.strengths.length > 0 && (
                      <p className="mt-2 text-xs text-emerald-400">✓ {p.strengths.join('; ')}</p>
                    )}
                    {p.improvements.length > 0 && (
                      <p className="mt-1 text-xs text-amber-400">→ {p.improvements.join('; ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Feedback wasn't available this time (AI evaluator unreachable), but your session was saved.
            </p>
          )}
          <button
            onClick={resetToStart}
            className="brand-gradient glow-ring mt-6 flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-primary-foreground"
          >
            <Sparkles className="size-4" /> Start Another GD
          </button>
        </div>
      )}
    </PageShell>
  )
}

export default function GdSimulatorPage() {
  return (
    <Suspense fallback={null}>
      <GdSimulatorInner />
    </Suspense>
  )
}
