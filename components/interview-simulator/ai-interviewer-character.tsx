'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Volume2, RotateCcw, Sparkles, UserCheck, ShieldAlert, Radio } from 'lucide-react'

interface AiInterviewerCharacterProps {
  questionNumber: number
  totalQuestions: number
  questionText: string
  track: string
  roundName?: string
  skill?: string
  level: number
  isCandidateSpeaking: boolean
  isEvaluating: boolean
  onSpeechEnd?: () => void
}

export function AiInterviewerCharacter({
  questionNumber,
  totalQuestions,
  questionText,
  track,
  roundName,
  skill,
  level,
  isCandidateSpeaking,
  isEvaluating,
  onSpeechEnd,
}: AiInterviewerCharacterProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [mouthOpen, setMouthOpen] = useState(0)
  const [isBlinking, setIsBlinking] = useState(false)
  const [headTilt, setHeadTilt] = useState(0)
  const [interviewerPersona, setInterviewerPersona] = useState<'priya' | 'vikram'>('priya')

  const animFrameRef = useRef<number | null>(null)
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 160)
    }, 3800)
    return () => clearInterval(blinkInterval)
  }, [])

  useEffect(() => {
    if (isCandidateSpeaking) {
      setHeadTilt(2.5)
    } else {
      setHeadTilt(0)
    }
  }, [isCandidateSpeaking])

  const speakQuestion = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    speechUtteranceRef.current = utterance

    let rate = 0.95
    switch (level) {
      case 0: rate = 0.82; break
      case 1: rate = 0.90; break
      case 2: rate = 1.0; break
      case 3: rate = 1.10; break
      case 4: rate = 1.22; break
      case 5: rate = 1.35; break
      default: rate = 1.0; break
    }
    utterance.rate = rate

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      const preferred = voices.find((v) =>
        interviewerPersona === 'priya'
          ? (v.name.includes('Google UK English Female') || v.name.includes('Zira') || v.name.includes('Samantha') || (v.lang.startsWith('en') && v.name.toLowerCase().includes('female')))
          : (v.name.includes('Google US English') || v.name.includes('David') || (v.lang.startsWith('en') && v.name.toLowerCase().includes('male')))
      )
      if (preferred) utterance.voice = preferred
    }

    utterance.onstart = () => {
      setIsSpeaking(true)
      let step = 0
      const loop = () => {
        step += 0.25 * rate
        const rawMouth = Math.abs(Math.sin(step) * 0.7 + Math.sin(step * 2.3) * 0.3)
        setMouthOpen(rawMouth)
        animFrameRef.current = requestAnimationFrame(loop)
      }
      animFrameRef.current = requestAnimationFrame(loop)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      setMouthOpen(0)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (onSpeechEnd) onSpeechEnd()
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
      setMouthOpen(0)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (onSpeechEnd) onSpeechEnd()
    }

    window.speechSynthesis.speak(utterance)
  }, [level, interviewerPersona, onSpeechEnd])

  useEffect(() => {
    if (questionText) {
      speakQuestion(questionText)
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [questionText, speakQuestion])

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/90 via-slate-950 to-black shadow-2xl backdrop-blur-xl">
      {/* Header Info Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/60 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex size-9 items-center justify-center rounded-xl bg-brand-blue/20 text-brand-cyan border border-brand-blue/40 shadow-inner">
            <UserCheck className="size-4" />
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-cyan opacity-75"></span>
                <span className="relative inline-flex size-3 rounded-full bg-brand-cyan"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                {interviewerPersona === 'priya' ? 'Priya Sharma' : 'Vikram Malhotra'}
              </span>
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-cyan">
                {track.toUpperCase()} LEAD
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {interviewerPersona === 'priya' ? 'Senior Technical Recruiter' : 'Principal Engineering Lead'} · Fortune 500
            </p>
          </div>
        </div>

        {/* Persona toggle & Question count */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setInterviewerPersona((p) => (p === 'priya' ? 'vikram' : 'priya'))}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white"
            title="Switch Interviewer Avatar"
          >
            <Sparkles className="size-3 text-brand-cyan" />
            {interviewerPersona === 'priya' ? 'Switch to Vikram' : 'Switch to Priya'}
          </button>
          <span className="rounded-lg bg-brand-blue/20 px-2.5 py-1 text-xs font-semibold text-brand-cyan border border-brand-blue/30">
            Q {questionNumber}/{totalQuestions}
          </span>
        </div>
      </div>

      {/* Main Corporate Office & Character Stage */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
        {/* Realistic Corporate Office Backdrop (SVG & Gradients) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/40 via-slate-900/60 to-slate-950"></div>
          <svg className="absolute inset-0 h-full w-full opacity-25" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="windowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <rect x="15%" y="5%" width="70%" height="60%" fill="url(#windowGrad)" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.2" rx="8" />
            <line x1="50%" y1="5%" x2="50%" y2="65%" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.15" />
            <line x1="15%" y1="35%" x2="85%" y2="35%" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.15" />
            <rect x="22%" y="30%" width="12%" height="35%" fill="#090d16" opacity="0.7" />
            <rect x="38%" y="22%" width="15%" height="43%" fill="#0d1527" opacity="0.6" />
            <rect x="56%" y="28%" width="10%" height="37%" fill="#0a0f1d" opacity="0.7" />
            <rect x="68%" y="18%" width="14%" height="47%" fill="#0e172a" opacity="0.5" />
          </svg>

          {/* Ambient Lighting & Corporate Bookshelf/Aura */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-cyan-500/10 blur-3xl"></div>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg h-32 bg-indigo-600/10 blur-2xl"></div>

          {/* Corporate Executive Desk */}
          <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-slate-950 via-slate-900 to-slate-800/80 border-t border-white/10 shadow-2xl">
            <div className="relative mx-auto flex h-full max-w-md items-center justify-between px-6 opacity-80">
              <div className="h-2 w-28 rounded-full bg-slate-700/60 shadow-inner"></div>
              <div className="rounded border border-amber-500/30 bg-amber-950/20 px-3 py-0.5 text-[9px] font-semibold text-amber-300">
                PLACEO EXECUTIVE INTERVIEW
              </div>
              <div className="h-1.5 w-16 rounded-full bg-cyan-800/50"></div>
            </div>
          </div>
        </div>

        {/* AI Character SVG / Canvas Animated Avatar */}
        <div
          className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300"
          style={{ transform: `rotate(${headTilt}deg)` }}
        >
          {interviewerPersona === 'priya' ? (
            /* Priya Sharma - Professional Female Tech Recruiter */
            <svg viewBox="0 0 320 380" className="h-72 w-72 drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)] sm:h-80 sm:w-80">
              <defs>
                <linearGradient id="skinPriya" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#e8b898" />
                  <stop offset="100%" stopColor="#d59e7c" />
                </linearGradient>
                <linearGradient id="hairPriya" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e1822" />
                  <stop offset="100%" stopColor="#0d0a11" />
                </linearGradient>
                <linearGradient id="blazerPriya" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="shirtPriya" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>

              <path d="M 85 140 Q 70 240 95 280 Q 160 290 225 280 Q 250 240 235 140 Z" fill="url(#hairPriya)" />

              <path d="M 40 380 Q 60 250 120 230 L 160 270 L 200 230 Q 260 250 280 380 Z" fill="url(#blazerPriya)" stroke="#334155" strokeWidth="2" />
              <polygon points="120,230 160,300 200,230 180,225 160,240 140,225" fill="url(#shirtPriya)" />

              <rect x="142" y="180" width="36" height="50" rx="8" fill="url(#skinPriya)" />

              <path d="M 105 130 Q 100 215 160 220 Q 220 215 215 130 Q 210 65 160 65 Q 110 65 105 130 Z" fill="url(#skinPriya)" />

              <path d="M 95 130 Q 120 60 160 60 Q 200 60 225 130 Q 200 95 160 100 Q 120 95 95 130 Z" fill="url(#hairPriya)" />
              <path d="M 95 130 Q 90 180 105 210 Q 100 160 105 130 Z" fill="url(#hairPriya)" />
              <path d="M 225 130 Q 230 180 215 210 Q 220 160 215 130 Z" fill="url(#hairPriya)" />

              <path d="M 120 125 Q 135 118 145 125" stroke="#1e1822" strokeWidth="2.8" strokeLinecap="round" fill="none" />
              <path d="M 175 125 Q 185 118 200 125" stroke="#1e1822" strokeWidth="2.8" strokeLinecap="round" fill="none" />

              {isBlinking ? (
                <>
                  <path d="M 122 140 Q 134 144 144 140" stroke="#1e1822" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <path d="M 176 140 Q 186 144 198 140" stroke="#1e1822" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                </>
              ) : (
                <>
                  <ellipse cx="133" cy="139" rx="9" ry="6" fill="#ffffff" />
                  <circle cx="134" cy="139" r="4.5" fill="#3b2219" />
                  <circle cx="135.5" cy="137.5" r="1.5" fill="#ffffff" />
                  <path d="M 122 136 Q 133 131 144 136" stroke="#1e1822" strokeWidth="1.5" fill="none" />

                  <ellipse cx="187" cy="139" rx="9" ry="6" fill="#ffffff" />
                  <circle cx="186" cy="139" r="4.5" fill="#3b2219" />
                  <circle cx="187.5" cy="137.5" r="1.5" fill="#ffffff" />
                  <path d="M 176 136 Q 187 131 198 136" stroke="#1e1822" strokeWidth="1.5" fill="none" />
                </>
              )}

              <path d="M 160 138 L 157 165 Q 160 168 165 165" stroke="#ba8264" strokeWidth="1.8" fill="none" strokeLinecap="round" />

              {isSpeaking ? (
                <g>
                  <ellipse
                    cx="160"
                    cy={186}
                    rx={12 + mouthOpen * 3}
                    ry={4 + mouthOpen * 11}
                    fill="#450a0a"
                    stroke="#c2410c"
                    strokeWidth="1.5"
                  />
                  {mouthOpen > 0.25 && (
                    <rect
                      x="152"
                      y={186 - (3 + mouthOpen * 8)}
                      width="16"
                      height={2 + mouthOpen * 3}
                      rx="1"
                      fill="#ffffff"
                    />
                  )}
                  {mouthOpen > 0.45 && (
                    <ellipse
                      cx="160"
                      cy={186 + mouthOpen * 7}
                      rx="7"
                      ry={3}
                      fill="#e11d48"
                    />
                  )}
                </g>
              ) : (
                <path
                  d="M 148 184 Q 160 191 172 184"
                  stroke="#9a3412"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </svg>
          ) : (
            /* Vikram Malhotra - Principal Engineering Lead */
            <svg viewBox="0 0 320 380" className="h-72 w-72 drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)] sm:h-80 sm:w-80">
              <defs>
                <linearGradient id="skinVikram" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#d8a47f" />
                  <stop offset="100%" stopColor="#c58e67" />
                </linearGradient>
                <linearGradient id="hairVikram" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#18181b" />
                  <stop offset="100%" stopColor="#09090b" />
                </linearGradient>
                <linearGradient id="suitVikram" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#020617" />
                </linearGradient>
              </defs>

              <path d="M 30 380 Q 55 240 120 225 L 160 265 L 200 225 Q 265 240 290 380 Z" fill="url(#suitVikram)" stroke="#1e293b" strokeWidth="2" />
              <polygon points="155,230 165,230 168,320 160,340 152,320" fill="#0284c7" />
              <polygon points="120,225 155,230 145,250" fill="#ffffff" />
              <polygon points="200,225 165,230 175,250" fill="#ffffff" />

              <rect x="140" y="175" width="40" height="52" rx="8" fill="url(#skinVikram)" />

              <path d="M 105 125 Q 102 210 160 216 Q 218 210 215 125 Q 210 60 160 60 Q 110 60 105 125 Z" fill="url(#skinVikram)" />

              <path d="M 98 120 Q 105 50 160 48 Q 215 50 222 120 Q 200 75 160 78 Q 120 75 98 120 Z" fill="url(#hairVikram)" />

              <path d="M 118 120 Q 135 114 148 121" stroke="#18181b" strokeWidth="3.2" strokeLinecap="round" fill="none" />
              <path d="M 172 121 Q 185 114 202 120" stroke="#18181b" strokeWidth="3.2" strokeLinecap="round" fill="none" />

              {isBlinking ? (
                <>
                  <path d="M 122 136 Q 134 140 146 136" stroke="#18181b" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                  <path d="M 174 136 Q 186 140 198 136" stroke="#18181b" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                </>
              ) : (
                <>
                  <ellipse cx="134" cy="135" rx="9" ry="5.5" fill="#ffffff" />
                  <circle cx="135" cy="135" r="4.5" fill="#261c14" />
                  <circle cx="136.5" cy="133.5" r="1.5" fill="#ffffff" />
                  <path d="M 122 132 Q 134 128 146 132" stroke="#18181b" strokeWidth="1.8" fill="none" />

                  <ellipse cx="186" cy="135" rx="9" ry="5.5" fill="#ffffff" />
                  <circle cx="185" cy="135" r="4.5" fill="#261c14" />
                  <circle cx="186.5" cy="133.5" r="1.5" fill="#ffffff" />
                  <path d="M 174 132 Q 186 128 198 132" stroke="#18181b" strokeWidth="1.8" fill="none" />
                </>
              )}

              <rect x="120" y="125" width="28" height="20" rx="4" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.8" />
              <rect x="172" y="125" width="28" height="20" rx="4" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.8" />
              <line x1="148" y1="133" x2="172" y2="133" stroke="#64748b" strokeWidth="2" />

              <path d="M 160 134 L 157 162 Q 160 165 166 162" stroke="#a16207" strokeWidth="2" fill="none" strokeLinecap="round" />

              {isSpeaking ? (
                <g>
                  <ellipse
                    cx="160"
                    cy={183}
                    rx={13 + mouthOpen * 3}
                    ry={4 + mouthOpen * 10}
                    fill="#3b0764"
                    stroke="#1e293b"
                    strokeWidth="1.5"
                  />
                  {mouthOpen > 0.3 && (
                    <rect
                      x="152"
                      y={183 - (3 + mouthOpen * 7)}
                      width="16"
                      height={2 + mouthOpen * 3}
                      rx="1"
                      fill="#ffffff"
                    />
                  )}
                </g>
              ) : (
                <path
                  d="M 148 181 Q 160 186 172 181"
                  stroke="#78350f"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </svg>
          )}

          {/* Sound wave visualizer underneath avatar */}
          <div className="mt-2 flex h-6 items-center gap-1">
            {isSpeaking ? (
              [40, 75, 95, 60, 85, 100, 70, 50, 80, 60].map((h, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-brand-cyan transition-all duration-75"
                  style={{
                    height: `${Math.max(4, h * (mouthOpen + 0.2))}px`,
                    opacity: 0.7 + (i % 3) * 0.1,
                  }}
                ></span>
              ))
            ) : isCandidateSpeaking ? (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Attentively Listening to You...
              </div>
            ) : isEvaluating ? (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-400 border border-amber-500/20">
                <span className="size-2 rounded-full bg-amber-400 animate-spin"></span>
                Evaluating Technical Logic...
              </div>
            ) : (
              <div className="text-[11px] font-medium text-slate-500">
                Ready · Maintain eye contact
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Question Card HUD */}
      <div className="relative z-20 border-t border-white/10 bg-slate-950/80 p-4 sm:p-5 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-brand-blue/20 px-2 py-0.5 text-[11px] font-semibold text-brand-cyan">
              {roundName || track.toUpperCase()}
            </span>
            {skill && (
              <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-[11px] font-medium text-purple-300 border border-purple-500/30">
                Skill: {skill}
              </span>
            )}
            <span className="text-[11px] text-slate-400">
              Level {level} {level >= 4 ? '🔥 Rapid-Fire' : ''}
            </span>
          </div>

          <button
            onClick={() => speakQuestion(questionText)}
            disabled={isSpeaking}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
            title="Replay Audio"
          >
            <Volume2 className="size-3.5 text-brand-cyan" />
            <span className="hidden sm:inline">Repeat</span>
          </button>
        </div>

        <p className="text-sm font-medium text-slate-100 sm:text-base leading-relaxed">
          {questionText}
        </p>
      </div>
    </div>
  )
}
