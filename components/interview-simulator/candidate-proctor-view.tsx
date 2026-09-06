'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Camera,
  Mic,
  MicOff,
  AlertTriangle,
  Clock,
  Send,
  SkipForward,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  Eye,
  Smartphone,
} from 'lucide-react'

interface CandidateProctorViewProps {
  timeLimitSeconds: number
  isCandidateTurn: boolean
  currentQuestionId: string
  onSubmitAnswer: (transcript: string, timeSpentSeconds: number) => void
  onSkipQuestion: () => void
  onProctorViolation: (violationCount: number, reason: string) => void
  onProctorDisconnect: (reason: string) => void
  onSpeakingStateChange: (isSpeaking: boolean) => void
}

export function CandidateProctorView({
  timeLimitSeconds,
  isCandidateTurn,
  currentQuestionId,
  onSubmitAnswer,
  onSkipQuestion,
  onProctorViolation,
  onProctorDisconnect,
  onSpeakingStateChange,
}: CandidateProctorViewProps) {
  const [hasCameraAccess, setHasCameraAccess] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds)
  const [violations, setViolations] = useState(0)
  const [activeWarning, setActiveWarning] = useState<string | null>(null)
  const [gazeStatus, setGazeStatus] = useState<'focused' | 'looking-away' | 'looking-down'>('focused')
  const [micVolume, setMicVolume] = useState(0)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const recognitionRef = useRef<any>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const proctorLoopRef = useRef<NodeJS.Timeout | null>(null)
  const offCenterCounterRef = useRef(0)
  const lookingDownCounterRef = useRef(0)
  const violationsRef = useRef(0)

  // Sync timer with new question
  useEffect(() => {
    setTimeLeft(timeLimitSeconds)
    setTranscript('')
  }, [currentQuestionId, timeLimitSeconds])

  // Initialize Camera & Microphone
  useEffect(() => {
    let active = true

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: true,
        })
        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
        setHasCameraAccess(true)
        setCameraError(null)

        // Mic volume analyzer
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const analyser = audioContext.createAnalyser()
          const source = audioContext.createMediaStreamSource(stream)
          source.connect(analyser)
          analyser.fftSize = 64
          const dataArray = new Uint8Array(analyser.frequencyBinCount)

          const updateVol = () => {
            if (!active) return
            analyser.getByteFrequencyData(dataArray)
            let sum = 0
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
            const avg = sum / dataArray.length
            setMicVolume(Math.min(100, Math.round((avg / 128) * 100)))
            requestAnimationFrame(updateVol)
          }
          updateVol()
        } catch {
          // Audio visualizer fallback
        }
      } catch (err: any) {
        console.error('Camera access error:', err)
        setCameraError(err.message || 'Camera or Microphone permission denied.')
        setHasCameraAccess(false)
      }
    }

    initMedia()

    return () => {
      active = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  // Initialize Speech-to-Text Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported in this browser.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let currentText = ''
      for (let i = 0; i < event.results.length; i++) {
        currentText += event.results[i][0].transcript + ' '
      }
      setTranscript(currentText.trim())
      onSpeakingStateChange(true)
    }

    recognition.onspeechend = () => {
      onSpeakingStateChange(false)
    }

    recognition.onerror = (e: any) => {
      console.warn('SpeechRecognition error:', e.error)
      setIsListening(false)
      onSpeakingStateChange(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      onSpeakingStateChange(false)
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.stop()
      } catch {}
    }
  }, [onSpeakingStateChange])

  // Toggle speech recognition
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return
    if (isListening) {
      try {
        recognitionRef.current.stop()
      } catch {}
      setIsListening(false)
      onSpeakingStateChange(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        console.error('Failed to start speech recognition:', err)
      }
    }
  }, [isListening, onSpeakingStateChange])

  // Countdown timer loop
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto submit when time expires
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [currentQuestionId])

  // Trigger violation handler
  const triggerViolation = useCallback((reason: string) => {
    violationsRef.current += 1
    const currentViolations = violationsRef.current
    setViolations(currentViolations)

    onProctorViolation(currentViolations, reason)

    if (currentViolations === 1) {
      // 1st Strike: Warning
      setActiveWarning(
        `⚠️ WARNING (Strike 1/2): ${reason}. Maintain constant eye contact with the screen. A second violation will result in immediate disqualification.`
      )
      // Voice warning alert
      if ('speechSynthesis' in window) {
        const warnUtterance = new SpeechSynthesisUtterance('Warning 1 of 2. Please maintain eye contact with the screen.')
        warnUtterance.rate = 1.1
        window.speechSynthesis.speak(warnUtterance)
      }
      setTimeout(() => setActiveWarning(null), 5000)
    } else if (currentViolations >= 2) {
      // 2nd Strike: Immediate Disconnect
      setActiveWarning(`❌ DISQUALIFIED: Second proctoring infraction detected (${reason}). Disconnecting interview.`)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      setTimeout(() => {
        onProctorDisconnect(reason)
      }, 1500)
    }
  }, [onProctorViolation, onProctorDisconnect])

  // Real-time Canvas Computer Vision Proctoring Loop
  useEffect(() => {
    if (!hasCameraAccess || !videoRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = 160
    canvas.height = 120
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    proctorLoopRef.current = setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState < 2 || !ctx) return

      try {
        ctx.drawImage(videoRef.current, 0, 0, 160, 120)
        const frame = ctx.getImageData(0, 0, 160, 120)
        const data = frame.data

        // Face / Luminance Centroid Estimation
        let totalWeight = 0
        let sumX = 0
        let sumY = 0

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          // Skin tone & facial brightness heuristic
          const isSkinOrBright = r > 70 && g > 40 && b > 25 && r > b && (r - g) > 8
          if (isSkinOrBright) {
            const pixelIndex = i / 4
            const x = pixelIndex % 160
            const y = Math.floor(pixelIndex / 160)
            sumX += x
            sumY += y
            totalWeight++
          }
        }

        if (totalWeight < 40) {
          // No person visible
          offCenterCounterRef.current++
          if (offCenterCounterRef.current >= 6) {
            offCenterCounterRef.current = 0
            triggerViolation('Face not detected in camera frame')
          }
          return
        }

        const centerX = sumX / totalWeight
        const centerY = sumY / totalWeight

        // Center normalized: -1 (left) to 1 (right)
        const normX = (centerX - 80) / 80
        // Center normalized: -1 (top) to 1 (bottom)
        const normY = (centerY - 60) / 60

        // Horizontal looking away detection
        if (Math.abs(normX) > 0.42) {
          setGazeStatus('looking-away')
          offCenterCounterRef.current++
          if (offCenterCounterRef.current >= 5) {
            offCenterCounterRef.current = 0
            triggerViolation('Candidate looking away from screen')
          }
        } else if (normY > 0.38) {
          // Looking down at desk / phone
          setGazeStatus('looking-down')
          lookingDownCounterRef.current++
          if (lookingDownCounterRef.current >= 5) {
            lookingDownCounterRef.current = 0
            triggerViolation('Candidate looking downward towards mobile device or notes')
          }
        } else {
          setGazeStatus('focused')
          offCenterCounterRef.current = Math.max(0, offCenterCounterRef.current - 1)
          lookingDownCounterRef.current = Math.max(0, lookingDownCounterRef.current - 1)
        }
      } catch (e) {
        // Canvas capture bypass
      }
    }, 400)

    return () => {
      if (proctorLoopRef.current) clearInterval(proctorLoopRef.current)
    }
  }, [hasCameraAccess, triggerViolation])

  const handleSubmit = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    const timeSpent = timeLimitSeconds - timeLeft
    onSubmitAnswer(transcript, Math.max(5, timeSpent))
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/90 via-slate-950 to-black shadow-2xl backdrop-blur-xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Camera className="size-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-wide">Candidate Webcam & Proctor</span>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-emerald-400 font-medium">LIVE MONITORING</span>
            </div>
          </div>
        </div>

        {/* Proctoring HUD Badges */}
        <div className="flex items-center gap-2">
          {/* Gaze Status */}
          <div
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold border ${
              gazeStatus === 'focused'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : gazeStatus === 'looking-down'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}
          >
            {gazeStatus === 'focused' ? (
              <>
                <Eye className="size-3" />
                <span>Eyes Focused</span>
              </>
            ) : gazeStatus === 'looking-down' ? (
              <>
                <Smartphone className="size-3" />
                <span>Phone / Downward Alert</span>
              </>
            ) : (
              <>
                <AlertTriangle className="size-3" />
                <span>Looking Away</span>
              </>
            )}
          </div>

          {/* Strikes Counter Badge */}
          <div
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold border ${
              violations === 0
                ? 'bg-white/5 text-slate-300 border-white/10'
                : violations === 1
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-rose-600/30 text-rose-400 border-rose-500'
            }`}
          >
            <ShieldAlert className="size-3.5" />
            <span>Strikes: {violations}/2</span>
          </div>
        </div>
      </div>

      {/* Main Video & Live Feed Container */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-black">
        {hasCameraAccess ? (
          <div className="relative h-full w-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover -scale-x-100"
            />

            {/* Visual Proctoring Bounding Box & Target Guides */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative h-56 w-48 rounded-2xl border-2 border-dashed border-brand-cyan/40 bg-brand-cyan/5 transition-all">
                <div className="absolute top-2 left-2 size-3 border-t-2 border-l-2 border-brand-cyan"></div>
                <div className="absolute top-2 right-2 size-3 border-t-2 border-r-2 border-brand-cyan"></div>
                <div className="absolute bottom-2 left-2 size-3 border-b-2 border-l-2 border-brand-cyan"></div>
                <div className="absolute bottom-2 right-2 size-3 border-b-2 border-r-2 border-brand-cyan"></div>
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-slate-900/90 px-2 py-0.5 text-[9px] font-semibold text-brand-cyan border border-brand-cyan/30">
                  KEEP HEAD IN FRAME
                </span>
              </div>
            </div>

            {/* Mic Volume HUD Bar */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-slate-900/80 px-3 py-1.5 border border-white/10 backdrop-blur-md">
              <Mic className={`size-3.5 ${micVolume > 15 ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              <div className="h-2 w-20 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-brand-cyan to-amber-500 transition-all duration-75"
                  style={{ width: `${micVolume}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-slate-300 font-mono">{micVolume}%</span>
            </div>

            {/* Timer Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-xl bg-slate-900/90 px-3 py-1.5 text-xs font-mono font-bold border border-white/10 shadow-lg backdrop-blur-md">
              <Clock className={`size-3.5 ${timeLeft <= 10 ? 'text-rose-400 animate-spin' : 'text-brand-cyan'}`} />
              <span className={timeLeft <= 10 ? 'text-rose-400 font-extrabold animate-pulse' : 'text-white'}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Camera className="size-12 text-slate-600 animate-pulse mb-3" />
            <p className="text-sm font-semibold text-slate-300">Camera Feed Loading or Blocked</p>
            <p className="mt-1 text-xs text-slate-500 max-w-xs">
              {cameraError || 'Please allow webcam and microphone access when prompted by the browser.'}
            </p>
          </div>
        )}

        {/* Warning Banner Overlay on 1st Strike */}
        {activeWarning && (
          <div className="absolute inset-x-4 top-4 z-30 flex items-center gap-3 rounded-2xl border-2 border-amber-500 bg-amber-950/95 p-4 text-amber-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
            <AlertTriangle className="size-6 shrink-0 text-amber-400 animate-bounce" />
            <div className="text-xs font-medium leading-relaxed">
              {activeWarning}
            </div>
          </div>
        )}
      </div>

      {/* Answer Capture & Controls Bar */}
      <div className="border-t border-white/10 bg-slate-950/90 p-4 backdrop-blur-md">
        {/* Real-time speech transcription & input area */}
        <div className="relative mb-3">
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={
              isListening
                ? 'Listening to your answer in real-time... (speak into your microphone)'
                : 'Speak into your mic or type your answer here...'
            }
            rows={2}
            className="w-full resize-none rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan/50"
          />

          <button
            onClick={toggleListening}
            className={`absolute right-2.5 bottom-3.5 flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
              isListening
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                : 'bg-brand-blue/20 text-brand-cyan border border-brand-blue/40 hover:bg-brand-blue/30'
            }`}
          >
            {isListening ? (
              <>
                <Mic className="size-3 text-rose-400" />
                <span>Listening...</span>
              </>
            ) : (
              <>
                <Mic className="size-3 text-brand-cyan" />
                <span>Start Voice</span>
              </>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onSkipQuestion}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-400 transition-all hover:bg-white/10 hover:text-slate-200"
          >
            <SkipForward className="size-3.5" />
            <span>Skip</span>
          </button>

          <button
            onClick={handleSubmit}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Send className="size-3.5" />
            <span>Submit Answer & Next</span>
          </button>
        </div>
      </div>
    </div>
  )
}
