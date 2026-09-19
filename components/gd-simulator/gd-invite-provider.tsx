'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Users, X } from 'lucide-react'

interface GDInvite {
  roomId: string
  hostName: string
  companyName: string
  jobRole: string
  roomStatus?: string
}

const POPUP_DURATION_MS = 10_000

export function GDInviteProvider() {
  const router = useRouter()
  const [popupInvite, setPopupInvite] = useState<GDInvite | null>(null)
  const [pendingInvites, setPendingInvites] = useState<GDInvite[]>([])
  const [showPendingList, setShowPendingList] = useState(false)
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPopupTimer = () => {
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current)
    popupTimerRef.current = null
  }

  const showPopup = (invite: GDInvite) => {
    clearPopupTimer()
    setPopupInvite(invite)
    // Auto-dismiss after 10s — only hides the popup, does NOT decline the
    // invite. It stays available in the persistent pending list below.
    popupTimerRef.current = setTimeout(() => setPopupInvite(null), POPUP_DURATION_MS)
  }

  const loadPendingInvites = () => {
    fetch('/api/gd-simulator/invites')
      .then((r) => r.json())
      .then((d) => setPendingInvites(d.invites || []))
      .catch(() => {})
  }

  useEffect(() => {
    let es: EventSource | null = null
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) return
        loadPendingInvites()
        es = new EventSource('/api/gd-simulator/events')
        es.addEventListener('gd-invite', (e) => {
          try {
            const data = JSON.parse((e as MessageEvent).data) as GDInvite
            showPopup(data)
            loadPendingInvites()
          } catch {}
        })
      })
      .catch(() => {})
    return () => es?.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const respond = async (roomId: string, accept: boolean) => {
    setPopupInvite(null)
    clearPopupTimer()
    setPendingInvites((prev) => prev.filter((i) => i.roomId !== roomId))
    try {
      const res = await fetch(`/api/gd-simulator/rooms/${roomId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept }),
      })
      if (accept && res.ok) {
        setShowPendingList(false)
        router.push(`/gd-simulator?joinRoom=${roomId}`)
      }
    } catch {}
  }

  if (!popupInvite && pendingInvites.length === 0) return null

  return (
    <>
      {/* 10-second auto-dismissing popup for a fresh invite */}
      <AnimatePresence>
        {popupInvite && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed left-1/2 top-6 z-[100] w-[92%] max-w-sm -translate-x-1/2 rounded-2xl border border-cyan-400/40 bg-slate-950/95 p-4 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <span className="brand-gradient flex size-11 shrink-0 items-center justify-center rounded-xl text-white">
                <Users className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">GD Invite from {popupInvite.hostName}</p>
                <p className="truncate text-xs text-slate-400">{popupInvite.jobRole} · {popupInvite.companyName}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => respond(popupInvite.roomId, true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition-transform hover:scale-[1.02]"
              >
                <Check className="size-3.5" /> Accept
              </button>
              <button
                onClick={() => respond(popupInvite.roomId, false)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white transition-transform hover:scale-[1.02]"
              >
                <X className="size-3.5" /> Reject
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent pill — always reachable for any invite not yet responded to */}
      {pendingInvites.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[90]">
          <AnimatePresence>
            {showPendingList && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-3 w-72 rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-xl"
              >
                <p className="mb-2 px-1 text-xs font-semibold text-slate-300">Pending GD Invites</p>
                <div className="space-y-2">
                  {pendingInvites.map((inv) => (
                    <div key={inv.roomId} className="rounded-xl bg-white/5 p-2.5">
                      <p className="text-xs font-medium text-white">{inv.hostName} · {inv.jobRole}</p>
                      <p className="text-[11px] text-slate-400">{inv.companyName}</p>
                      <div className="mt-2 flex gap-1.5">
                        <button
                          onClick={() => respond(inv.roomId, true)}
                          className="flex-1 rounded-lg bg-emerald-500 py-1.5 text-[11px] font-bold text-white"
                        >
                          Accept & Join
                        </button>
                        <button
                          onClick={() => respond(inv.roomId, false)}
                          className="flex-1 rounded-lg bg-slate-700 py-1.5 text-[11px] font-bold text-white"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setShowPendingList((v) => !v)}
            className="brand-gradient glow-ring flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold text-white shadow-xl"
          >
            <Users className="size-4" /> {pendingInvites.length} GD invite{pendingInvites.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </>
  )
}
