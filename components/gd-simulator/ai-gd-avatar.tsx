'use client'

import { useEffect, useRef, useState } from 'react'

interface AIGDAvatarProps {
  speaking: boolean
}

export function AIGDAvatar({ speaking }: AIGDAvatarProps) {
  const [mouthOpen, setMouthOpen] = useState(0)
  const [blink, setBlink] = useState(false)
  const rafRef = useRef<number | null>(null)
  const stepRef = useRef(0)

  useEffect(() => {
    if (!speaking) {
      setMouthOpen(0)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    const loop = () => {
      stepRef.current += 0.35
      const wave = Math.abs(Math.sin(stepRef.current) * 0.6 + Math.sin(stepRef.current * 2.3) * 0.3)
      setMouthOpen(Math.min(1, wave))
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [speaking])

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 140)
    }, 2600 + Math.random() * 2000)
    return () => clearInterval(interval)
  }, [])

  const mouthHeight = 4 + mouthOpen * 16
  const eyeHeight = blink ? 1 : 8

  return (
    <div className={`relative flex size-32 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 shadow-2xl transition-transform duration-200 ${speaking ? 'scale-105 shadow-cyan-500/50' : ''}`}>
      {speaking && <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/25" />}
      <svg viewBox="0 0 120 120" className="relative size-24">
        {/* Face base */}
        <circle cx="60" cy="58" r="42" fill="#0f172a" opacity="0.25" />
        {/* Eyes */}
        <rect x="36" y="46" width="14" rx="6" height={eyeHeight} fill="#e0f2fe" style={{ transition: 'height 0.08s' }} />
        <rect x="70" y="46" width="14" rx="6" height={eyeHeight} fill="#e0f2fe" style={{ transition: 'height 0.08s' }} />
        {/* Mouth */}
        <rect
          x="42"
          y={72 - mouthHeight / 2}
          width="36"
          rx="8"
          height={mouthHeight}
          fill="#e0f2fe"
          style={{ transition: 'height 0.06s, y 0.06s' }}
        />
      </svg>
    </div>
  )
}
