'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  PhoneOff,
  ShieldCheck,
  ShieldAlert,
  Eye,
  AlertTriangle,
  Clock,
  Sparkles,
  Volume2,
  Radio,
} from 'lucide-react'

export interface QuestionItem {
  id: string
  track: string
  roundName?: string
  skill?: string
  level: number
  question: string
  expectedKeyPoints: string[]
  timeLimitSeconds: number
  modelAnswer: string
}

export interface CandidateAnswer {
  questionId: string
  question: string
  userTranscript: string
  timeTakenSeconds: number
  expectedKeyPoints?: string[]
  modelAnswer?: string
  skill?: string
  roundName?: string
}

interface InterviewCallRoomProps {
  stream: MediaStream
  questions: QuestionItem[]
  track: string
  level: number
  onFinishInterview: (answers: CandidateAnswer[], violations: number) => void
  onDisqualify: (reason: string, answers: CandidateAnswer[]) => void
}

export function InterviewCallRoom({
  stream,
  questions,
  track,
  level,
  onFinishInterview,
  onDisqualify,
}: InterviewCallRoomProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false)
  const [isListeningCandidate, setIsListeningCandidate] = useState(false)
  const [mouthOpen, setMouthOpen] = useState(0)
  const [isBlinking, setIsBlinking] = useState(false)
  const [interviewerPersona, setInterviewerPersona] = useState<'priya' | 'vikram'>('priya')

  const [candidateTranscript, setCandidateTranscript] = useState('')
  const [candidateAudioLevel, setCandidateAudioLevel] = useState(0)
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [callDuration, setCallDuration] = useState(0)

  const [violations, setViolations] = useState(0)
  const [gazeStatus, setGazeStatus] = useState<'focused' | 'looking-away' | 'looking-down'>('focused')
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [aiDialogueStatus, setAiDialogueStatus] = useState<string>('Connecting...')

  const recordedAnswersRef = useRef<CandidateAnswer[]>([])
  const candidateVideoRef = useRef<HTMLVideoElement | null>(null)
  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const promptTimerRef = useRef<NodeJS.Timeout | null>(null)
  const questionStartTimeRef = useRef<number>(Date.now())
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const proctorLoopRef = useRef<NodeJS.Timeout | null>(null)
  const offCenterCounterRef = useRef(0)
  const lookingDownCounterRef = useRef(0)
  const violationsRef = useRef(0)
  const isCandidateSpeakingRef = useRef(false)
  const hasSpokenPromptRef = useRef(false)
  // True whenever the candidate is *supposed* to be heard right now. Lets us tell a
  // deliberate rec.stop() (we're about to speak, or moving on) apart from the Web
  // Speech API silently dying mid-turn (a known Chrome bug) so we can auto-restart it.
  const shouldBeListeningRef = useRef(false)
  const voicesReadyRef = useRef(false)
  const speakTextRef = useRef<((text: string, onEnd?: () => void) => void) | null>(null)
  // Real face-landmark proctoring (MediaPipe Tasks Vision, loaded from CDN at runtime —
  // no build-time dependency, so it degrades gracefully to the pixel heuristic below
  // if the CDN is unreachable).
  const faceLandmarkerRef = useRef<any>(null)
  const useMediapipeRef = useRef(false)
  const noFaceCounterRef = useRef(0)

  const currentQ = questions[currentIndex]

  // Attach webcam stream to video element
  useEffect(() => {
    if (candidateVideoRef.current && stream) {
      candidateVideoRef.current.srcObject = stream
      candidateVideoRef.current.play().catch(() => {})
    }
  }, [stream])

  // Call duration counter
  useEffect(() => {
    const timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // Warm up TTS voices. Chrome loads voices asynchronously — calling getVoices()
  // immediately on page load very often returns an empty array, silently causing
  // the interviewer to speak in a default/robotic system voice or, on some setups,
  // stay silent for the first utterance. Force a load and listen for the event.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const markReady = () => {
      if (window.speechSynthesis.getVoices().length > 0) voicesReadyRef.current = true
    }
    markReady()
    window.speechSynthesis.onvoiceschanged = markReady
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  // Natural blinking effect for interviewer
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 160)
    }, 3600)
    return () => clearInterval(blinkInterval)
  }, [])

  // Voice activity level meter from mic stream
  useEffect(() => {
    if (!stream) return
    let active = true
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioCtx.createAnalyser()
      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)
      analyser.fftSize = 64
      const data = new Uint8Array(analyser.frequencyBinCount)

      const updateVol = () => {
        if (!active) return
        analyser.getByteFrequencyData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i]
        const avg = sum / data.length
        setCandidateAudioLevel(Math.min(100, Math.round((avg / 128) * 100)))
        requestAnimationFrame(updateVol)
      }
      updateVol()
    } catch (e) {
      console.warn('Audio meter error:', e)
    }
    return () => {
      active = false
    }
  }, [stream])

  // Speak text with synchronized lip-sync
  const speakText = useCallback(
    (text: string, onEnd?: () => void) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        if (onEnd) onEnd()
        return
      }

      // If voices genuinely haven't loaded yet (only ever happens on the very first
      // utterance of the call), give the browser up to 600ms to finish loading them
      // rather than speaking immediately with no voice selected.
      if (!voicesReadyRef.current && window.speechSynthesis.getVoices().length === 0) {
        let waited = 0
        const waitInterval = setInterval(() => {
          waited += 100
          if (window.speechSynthesis.getVoices().length > 0 || waited >= 600) {
            clearInterval(waitInterval)
            voicesReadyRef.current = true
            speakTextRef.current?.(text, onEnd)
          }
        }, 100)
        return
      }

      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      speechUtteranceRef.current = utterance

      let rate = 1.0
      switch (level) {
        case 0: rate = 0.85; break
        case 1: rate = 0.95; break
        case 2: rate = 1.02; break
        case 3: rate = 1.12; break
        case 4: rate = 1.22; break
        case 5: rate = 1.35; break
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

      let wordEnergy = 0
      utterance.onboundary = (event: any) => {
        // Fires at each word/sentence boundary with real timing from the TTS engine.
        // Not full phoneme-accurate lip sync, but ties mouth movement to actual
        // speech rather than an arbitrary disconnected oscillator.
        if (!event.name || event.name === 'word' || event.name === 'sentence') {
          wordEnergy = 1
        }
      }

      utterance.onstart = () => {
        setIsInterviewerSpeaking(true)
        setIsListeningCandidate(false)
        let step = 0
        const loop = () => {
          step += 0.28 * rate
          wordEnergy *= 0.82
          const oscillation = Math.abs(Math.sin(step) * 0.5 + Math.sin(step * 2.2) * 0.2)
          const rawMouth = Math.min(1, oscillation * 0.55 + wordEnergy * 0.7)
          setMouthOpen(rawMouth)
          animFrameRef.current = requestAnimationFrame(loop)
        }
        animFrameRef.current = requestAnimationFrame(loop)
      }

      utterance.onend = () => {
        setIsInterviewerSpeaking(false)
        setMouthOpen(0)
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        if (onEnd) onEnd()
      }

      utterance.onerror = () => {
        setIsInterviewerSpeaking(false)
        setMouthOpen(0)
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        if (onEnd) onEnd()
      }

      window.speechSynthesis.speak(utterance)
    },
    [level, interviewerPersona]
  )

  useEffect(() => {
    speakTextRef.current = speakText
  }, [speakText])

  // Move to next question or complete interview
  const proceedToNextQuestion = useCallback(
    (recordedText: string) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current)

      const timeSpent = Math.round((Date.now() - questionStartTimeRef.current) / 1000)
      const newAnswer: CandidateAnswer = {
        questionId: currentQ.id,
        question: currentQ.question,
        userTranscript: recordedText.trim() || '[No answer spoken]',
        timeTakenSeconds: Math.max(5, timeSpent),
        expectedKeyPoints: currentQ.expectedKeyPoints,
        modelAnswer: currentQ.modelAnswer,
        skill: currentQ.skill,
        roundName: currentQ.roundName,
      }

      recordedAnswersRef.current.push(newAnswer)
      setCandidateTranscript('')
      hasSpokenPromptRef.current = false

      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1)
      } else {
        // Finished all questions
        speakText('Thank you. You have completed all questions in this interview call. Generating your evaluation now.', () => {
          onFinishInterview(recordedAnswersRef.current, violationsRef.current)
        })
      }
    },
    [currentIndex, currentQ, questions.length, onFinishInterview, speakText]
  )

  // Start continuous listening after interviewer finishes question
  const startCandidateListening = useCallback(() => {
    setIsListeningCandidate(true)
    setAiDialogueStatus('Listening to your answer...')
    questionStartTimeRef.current = Date.now()
    shouldBeListeningRef.current = true

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch {
        // "already started" is the most common thrown error here (rapid re-calls);
        // safe to ignore since it means recognition is already running.
      }
    }

    // Inactivity prompt after 14 seconds of silence
    if (promptTimerRef.current) clearTimeout(promptTimerRef.current)
    promptTimerRef.current = setTimeout(() => {
      if (!isCandidateSpeakingRef.current && !hasSpokenPromptRef.current) {
        hasSpokenPromptRef.current = true
        speakText("Take your time. You can speak your answer, or say 'skip' if you'd like to move to the next topic.", () => {
          startCandidateListening()
        })
      }
    }, 14000)
  }, [speakText])

  // Handle Cross-Question / Clarification from Candidate
  const handleCrossQuestion = useCallback(
    async (query: string) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current)
      setAiDialogueStatus('Answering your cross-question...')

      let reply = 'Good question. You can assume standard production constraints and proceed with your reasoning.'
      try {
        const res = await fetch('/api/interview-simulator/clarify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentQuestion: currentQ.question,
            candidateQuery: query,
            track,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.answer) reply = data.answer
        }
      } catch (e) {
        console.warn('Clarification fetch error:', e)
      }

      speakText(reply, () => {
        setCandidateTranscript('')
        startCandidateListening()
      })
    },
    [currentQ, track, speakText, startCandidateListening]
  )

  // Smart Speech Recognition with Intent Detection & Automatic Turn-Taking
  useEffect(() => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setAiDialogueStatus('⚠️ Voice input unsupported in this browser — use Chrome or Edge')
      return
    }

    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (event: any) => {
      let fullTranscript = ''
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript + ' '
      }
      const cleaned = fullTranscript.trim()
      setCandidateTranscript(cleaned)
      isCandidateSpeakingRef.current = true

      const lower = cleaned.toLowerCase()

      // 1. REPEAT INTENT (kept broad on purpose — candidates phrase this many ways)
      const isRepeatIntent =
        lower.includes('repeat') ||
        lower.includes('pardon') ||
        lower.includes('say again') ||
        lower.includes('say that again') ||
        lower.includes('could you repeat') ||
        lower.includes('come again') ||
        lower.includes("didn't catch") ||
        lower.includes("didn't get") ||
        lower.includes('what was that') ||
        lower.includes('one more time') ||
        lower.includes('excuse me') ||
        lower.includes('sorry') ||
        lower === 'what' ||
        lower === 'huh' ||
        lower.includes('dobara') ||
        lower.includes('phir se') ||
        lower.includes('samajh nahi aaya') ||
        lower.includes("didn't hear")

      if (isRepeatIntent && cleaned.split(' ').length <= 8) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        if (promptTimerRef.current) clearTimeout(promptTimerRef.current)
        shouldBeListeningRef.current = false
        try { rec.stop() } catch {}
        setCandidateTranscript('')
        speakText(`Sure, let me repeat the question for you: ${currentQ.question}`, () => {
          startCandidateListening()
        })
        return
      }

      // 2. SKIP / "I DON'T KNOW" INTENT
      const isSkipIntent =
        lower.includes("don't know") ||
        lower.includes('do not know') ||
        lower.includes('no idea') ||
        lower.includes('skip') ||
        lower.includes('pass') ||
        lower.includes('nahi pata') ||
        lower.includes('not sure')

      if (isSkipIntent && cleaned.split(' ').length <= 7) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        if (promptTimerRef.current) clearTimeout(promptTimerRef.current)
        shouldBeListeningRef.current = false
        try { rec.stop() } catch {}
        speakText("Understood, that's completely alright. Let's move on to the next question.", () => {
          proceedToNextQuestion('[Skipped / Candidate stated: I do not know]')
        })
        return
      }

      // 3. CROSS-QUESTION / CLARIFICATION INTENT
      const isCrossQuestion =
        lower.startsWith('can i') ||
        lower.startsWith('can we') ||
        lower.startsWith('could you clarify') ||
        lower.startsWith('could you give') ||
        lower.startsWith('do you mean') ||
        lower.startsWith('is it allowed') ||
        lower.startsWith('should i assume') ||
        lower.startsWith('what if') ||
        lower.startsWith('what do you mean') ||
        lower.includes('give me an example') ||
        lower.includes('any hint') ||
        lower.includes('clarify that') ||
        lower.includes('can i use')

      if (isCrossQuestion && cleaned.split(' ').length <= 15) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        if (promptTimerRef.current) clearTimeout(promptTimerRef.current)
        shouldBeListeningRef.current = false
        try { rec.stop() } catch {}
        setCandidateTranscript('')
        handleCrossQuestion(cleaned)
        return
      }

      // 4. SUBSTANTIVE ANSWER -> VAD SILENCE DETECTION (2.2s after user finishes speaking)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = setTimeout(() => {
        if (cleaned.length >= 6) {
          shouldBeListeningRef.current = false
          try { rec.stop() } catch {}
          speakText('Thank you. Moving to the next question.', () => {
            proceedToNextQuestion(cleaned)
          })
        }
      }, 2200)
    }

    rec.onerror = (err: any) => {
      if (err.error === 'no-speech') return // expected during natural pauses, not an error
      if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
        setAiDialogueStatus('⚠️ Microphone permission blocked — please allow mic access')
        shouldBeListeningRef.current = false
        return
      }
      console.warn('Recognition error:', err.error)
      // Transient errors (network hiccup, aborted) — let onend's restart logic recover it.
    }

    // Chrome's SpeechRecognition can silently stop (fires onend) after a pause even
    // though we never called .stop() ourselves — this was the root cause of "the AI
    // doesn't hear me anymore" mid-interview. If we still expect to be listening,
    // restart it immediately instead of leaving the mic dead for the rest of the call.
    rec.onend = () => {
      if (shouldBeListeningRef.current) {
        try {
          rec.start()
        } catch {
          setTimeout(() => {
            if (shouldBeListeningRef.current) {
              try { rec.start() } catch {}
            }
          }, 300)
        }
      }
    }

    recognitionRef.current = rec

    return () => {
      shouldBeListeningRef.current = false
      try { rec.stop() } catch {}
    }
  }, [currentQ, speakText, startCandidateListening, proceedToNextQuestion, handleCrossQuestion])

  // Trigger question speech on question change
  useEffect(() => {
    if (!currentQ) return
    setCandidateTranscript('')
    isCandidateSpeakingRef.current = false
    shouldBeListeningRef.current = false
    setAiDialogueStatus('Interviewer is speaking...')

    speakText(currentQ.question, () => {
      startCandidateListening()
    })

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current)
    }
  }, [currentIndex, currentQ, speakText, startCandidateListening])

  // Strict Proctoring Violation & Disqualification Trigger
  const triggerProctorStrike = useCallback(
    (reason: string) => {
      violationsRef.current += 1
      const count = violationsRef.current
      setViolations(count)

      shouldBeListeningRef.current = false
      try { recognitionRef.current?.stop() } catch {}

      if (count === 1) {
        setWarningMessage(`⚠️ WARNING 1/2: Please look directly at the camera. ${reason}`)
        speakText('Candidate, please keep your eyes focused directly on the screen. Looking away or checking other devices is prohibited.', () => {
          startCandidateListening()
        })
        setTimeout(() => setWarningMessage(null), 6000)
      } else if (count >= 2) {
        setWarningMessage('❌ DISQUALIFIED: Second proctor infraction detected. Disconnecting call.')
        speakText('Interview terminated. Multiple proctoring violations detected.', () => {
          if (stream) stream.getTracks().forEach((t) => t.stop())
          onDisqualify(reason, recordedAnswersRef.current)
        })
      }
    },
    [speakText, startCandidateListening, stream, onDisqualify]
  )

  // Load a real face-landmark model (MediaPipe Tasks Vision) at runtime from a CDN.
  // This needs no npm install / build changes — it's a plain browser ESM import —
  // so the app never fails to build even if this can't reach the CDN; it just
  // falls back to the simpler heuristic below in that case.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const mediapipeCdnBase = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
        // Template-literal specifier on purpose: TypeScript only statically resolves
        // string-literal import() specifiers, so this stays a plain runtime browser
        // ESM import (type `any`) without needing type declarations for the CDN URL.
        const visionModule: any = await import(/* webpackIgnore: true */ `${mediapipeCdnBase}/vision_bundle.mjs`)
        const { FaceLandmarker, FilesetResolver } = visionModule
        const filesetResolver = await FilesetResolver.forVisionTasks(`${mediapipeCdnBase}/wasm`)
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
          runningMode: 'VIDEO',
          numFaces: 1,
        })
        if (!cancelled) {
          faceLandmarkerRef.current = landmarker
          useMediapipeRef.current = true
        } else {
          landmarker.close?.()
        }
      } catch (e) {
        console.warn('[proctor] Real face-landmark model unavailable, using fallback heuristic:', e)
        useMediapipeRef.current = false
      }
    })()
    return () => {
      cancelled = true
      try { faceLandmarkerRef.current?.close?.() } catch {}
    }
  }, [])

  // Real-time Computer Vision Proctoring Loop (Checking Gaze & Head Tilt)
  useEffect(() => {
    if (!stream || !candidateVideoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = 160
    canvas.height = 120
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    // Real face-mesh based check: uses actual facial landmarks (eyes, nose, chin,
    // forehead) to estimate yaw (turning away) and pitch (looking down at a phone),
    // instead of guessing from raw skin-colored pixels.
    const checkWithFaceLandmarker = (video: HTMLVideoElement): 'ok' | 'no-face' | 'away' | 'down' | null => {
      const landmarker = faceLandmarkerRef.current
      if (!landmarker) return null
      try {
        const result = landmarker.detectForVideo(video, performance.now())
        const faces = result?.faceLandmarks
        if (!faces || faces.length === 0) return 'no-face'

        const lm = faces[0]
        const leftEye = lm[33]
        const rightEye = lm[263]
        const nose = lm[1]
        const forehead = lm[10]
        const chin = lm[152]
        if (!leftEye || !rightEye || !nose || !forehead || !chin) return null

        const eyeMidX = (leftEye.x + rightEye.x) / 2
        const eyeSpan = Math.abs(rightEye.x - leftEye.x) || 0.001
        const yawOffset = (nose.x - eyeMidX) / eyeSpan

        const faceHeight = Math.abs(chin.y - forehead.y) || 0.001
        const eyeMidY = (leftEye.y + rightEye.y) / 2
        const pitchOffset = (nose.y - eyeMidY) / faceHeight

        if (Math.abs(yawOffset) > 0.42) return 'away'
        if (pitchOffset > 0.32) return 'down'
        return 'ok'
      } catch (e) {
        return null
      }
    }

    // Fallback heuristic (used only if the real face model failed to load): crude
    // skin-tone centroid tracking. Much less accurate, kept purely so proctoring
    // doesn't disappear entirely on an unreachable CDN / offline dev environment.
    const checkWithPixelHeuristic = (video: HTMLVideoElement): 'ok' | 'no-face' | 'away' | 'down' | null => {
      if (!ctx) return null
      ctx.drawImage(video, 0, 0, 160, 120)
      const frame = ctx.getImageData(0, 0, 160, 120)
      const data = frame.data

      let totalWeight = 0
      let sumX = 0
      let sumY = 0
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const isSkin = r > 70 && g > 40 && b > 25 && r > b && r - g > 8
        if (isSkin) {
          const idx = i / 4
          sumX += idx % 160
          sumY += Math.floor(idx / 160)
          totalWeight++
        }
      }

      if (totalWeight < 35) return 'no-face'
      const normX = (sumX / totalWeight - 80) / 80
      const normY = (sumY / totalWeight - 60) / 60
      if (Math.abs(normX) > 0.4) return 'away'
      if (normY > 0.36) return 'down'
      return 'ok'
    }

    proctorLoopRef.current = setInterval(() => {
      if (!candidateVideoRef.current || candidateVideoRef.current.readyState < 2) return
      try {
        const status = useMediapipeRef.current
          ? checkWithFaceLandmarker(candidateVideoRef.current)
          : checkWithPixelHeuristic(candidateVideoRef.current)

        if (status === null) return // model not ready yet this tick, skip silently

        if (status === 'no-face') {
          noFaceCounterRef.current++
          offCenterCounterRef.current = Math.max(0, offCenterCounterRef.current - 1)
          lookingDownCounterRef.current = Math.max(0, lookingDownCounterRef.current - 1)
          if (noFaceCounterRef.current >= 5) {
            noFaceCounterRef.current = 0
            setGazeStatus('looking-away')
            triggerProctorStrike('Candidate moved out of camera frame / no face detected')
          }
          return
        }
        noFaceCounterRef.current = Math.max(0, noFaceCounterRef.current - 1)

        if (status === 'away') {
          setGazeStatus('looking-away')
          offCenterCounterRef.current++
          lookingDownCounterRef.current = Math.max(0, lookingDownCounterRef.current - 1)
          if (offCenterCounterRef.current >= 4) {
            offCenterCounterRef.current = 0
            triggerProctorStrike('Looking away from screen')
          }
        } else if (status === 'down') {
          setGazeStatus('looking-down')
          lookingDownCounterRef.current++
          offCenterCounterRef.current = Math.max(0, offCenterCounterRef.current - 1)
          if (lookingDownCounterRef.current >= 4) {
            lookingDownCounterRef.current = 0
            triggerProctorStrike('Looking downward towards mobile phone or notes')
          }
        } else {
          setGazeStatus('focused')
          offCenterCounterRef.current = Math.max(0, offCenterCounterRef.current - 1)
          lookingDownCounterRef.current = Math.max(0, lookingDownCounterRef.current - 1)
        }
      } catch (e) {}
    }, 450)

    return () => {
      if (proctorLoopRef.current) clearInterval(proctorLoopRef.current)
    }
  }, [stream, triggerProctorStrike])

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = !micEnabled))
      setMicEnabled(!micEnabled)
    }
  }

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach((t) => (t.enabled = !cameraEnabled))
      setCameraEnabled(!cameraEnabled)
    }
  }

  const handleEndCall = () => {
    if (confirm('Are you sure you want to end this interview call? Your answers will be strictly evaluated as-is.')) {
      shouldBeListeningRef.current = false
      try { recognitionRef.current?.stop() } catch {}
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current)
      if (stream) stream.getTracks().forEach((t) => t.stop())
      onFinishInterview(recordedAnswersRef.current, violationsRef.current)
    }
  }

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="relative flex h-[calc(100vh-140px)] min-h-[640px] flex-col overflow-hidden rounded-3xl border border-white/15 bg-black shadow-2xl">
      {/* Top Meeting Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-400 border border-rose-500/30">
            <span className="size-2 rounded-full bg-rose-500 animate-ping"></span>
            <span>REC · PROCTOR ACTIVE</span>
          </div>
          <span className="text-xs font-semibold text-slate-300">
            Placement Interview · <span className="text-brand-cyan capitalize">{track} Round</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-200">
            <Clock className="size-3.5 text-brand-cyan" />
            <span>{formatTimer(callDuration)}</span>
          </div>

          <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white border border-white/10">
            Q {currentIndex + 1} / {questions.length}
          </span>
        </div>
      </div>

      {/* Main Split Video Grid */}
      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-2">
        {/* Tile 1: AI Interviewer Video Tile */}
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-slate-900 to-slate-950 shadow-inner">
          {/* Corporate Office Backdrop */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950 via-slate-900 to-slate-950"></div>
            {/* Window skyline */}
            <div className="absolute top-8 left-12 right-12 h-44 rounded-xl border border-sky-500/20 bg-sky-950/20"></div>
          </div>

          {/* Persona Avatar with Lip Sync */}
          <div className="relative z-10 flex flex-col items-center">
            {interviewerPersona === 'priya' ? (
              <svg viewBox="0 0 320 380" className="h-64 w-64 drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)] sm:h-72 sm:w-72">
                <defs>
                  <linearGradient id="skinPriya2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#e8b898" /><stop offset="100%" stopColor="#d59e7c" />
                  </linearGradient>
                  <linearGradient id="blazerPriya2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                </defs>
                <path d="M 85 140 Q 70 240 95 280 Q 160 290 225 280 Q 250 240 235 140 Z" fill="#1e1822" />
                <path d="M 40 380 Q 60 250 120 230 L 160 270 L 200 230 Q 260 250 280 380 Z" fill="url(#blazerPriya2)" stroke="#334155" strokeWidth="2" />
                <polygon points="120,230 160,300 200,230 180,225 160,240 140,225" fill="#38bdf8" />
                <rect x="142" y="180" width="36" height="50" rx="8" fill="url(#skinPriya2)" />
                <path d="M 105 130 Q 100 215 160 220 Q 220 215 215 130 Q 210 65 160 65 Q 110 65 105 130 Z" fill="url(#skinPriya2)" />
                <path d="M 95 130 Q 120 60 160 60 Q 200 60 225 130 Q 200 95 160 100 Q 120 95 95 130 Z" fill="#1e1822" />

                {/* Eyes */}
                {isBlinking ? (
                  <>
                    <path d="M 122 140 Q 134 144 144 140" stroke="#1e1822" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    <path d="M 176 140 Q 186 144 198 140" stroke="#1e1822" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  </>
                ) : (
                  <>
                    <ellipse cx="133" cy="139" rx="9" ry="6" fill="#ffffff" />
                    <circle cx="134" cy="139" r="4.5" fill="#3b2219" /><circle cx="135.5" cy="137.5" r="1.5" fill="#ffffff" />
                    <ellipse cx="187" cy="139" rx="9" ry="6" fill="#ffffff" />
                    <circle cx="186" cy="139" r="4.5" fill="#3b2219" /><circle cx="187.5" cy="137.5" r="1.5" fill="#ffffff" />
                  </>
                )}

                {/* Mouth Lip-Sync */}
                {isInterviewerSpeaking ? (
                  <ellipse cx="160" cy={186} rx={12 + mouthOpen * 3} ry={4 + mouthOpen * 11} fill="#450a0a" stroke="#c2410c" strokeWidth="1.5" />
                ) : (
                  <path d="M 148 184 Q 160 191 172 184" stroke="#9a3412" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                )}
              </svg>
            ) : (
              <svg viewBox="0 0 320 380" className="h-64 w-64 drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)] sm:h-72 sm:w-72">
                <defs>
                  <linearGradient id="skinVikram2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#d8a47f" /><stop offset="100%" stopColor="#c58e67" />
                  </linearGradient>
                </defs>
                <path d="M 30 380 Q 55 240 120 225 L 160 265 L 200 225 Q 265 240 290 380 Z" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
                <polygon points="155,230 165,230 168,320 160,340 152,320" fill="#0284c7" />
                <rect x="140" y="175" width="40" height="52" rx="8" fill="url(#skinVikram2)" />
                <path d="M 105 125 Q 102 210 160 216 Q 218 210 215 125 Q 210 60 160 60 Q 110 60 105 125 Z" fill="url(#skinVikram2)" />
                <path d="M 98 120 Q 105 50 160 48 Q 215 50 222 120 Q 200 75 160 78 Q 120 75 98 120 Z" fill="#18181b" />

                {isBlinking ? (
                  <>
                    <path d="M 122 136 Q 134 140 146 136" stroke="#18181b" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                    <path d="M 174 136 Q 186 140 198 136" stroke="#18181b" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                  </>
                ) : (
                  <>
                    <ellipse cx="134" cy="135" rx="9" ry="5.5" fill="#ffffff" />
                    <circle cx="135" cy="135" r="4.5" fill="#261c14" />
                    <ellipse cx="186" cy="135" rx="9" ry="5.5" fill="#ffffff" />
                    <circle cx="185" cy="135" r="4.5" fill="#261c14" />
                  </>
                )}
                {/* Glasses */}
                <rect x="120" y="125" width="28" height="20" rx="4" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.8" />
                <rect x="172" y="125" width="28" height="20" rx="4" fill="none" stroke="#64748b" strokeWidth="2" opacity="0.8" />
                <line x1="148" y1="133" x2="172" y2="133" stroke="#64748b" strokeWidth="2" />

                {isInterviewerSpeaking ? (
                  <ellipse cx="160" cy={183} rx={13 + mouthOpen * 3} ry={4 + mouthOpen * 10} fill="#3b0764" stroke="#1e293b" strokeWidth="1.5" />
                ) : (
                  <path d="M 148 181 Q 160 186 172 181" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                )}
              </svg>
            )}
          </div>

          {/* Interviewer Name Tag bottom-left */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-slate-950/80 px-3 py-1.5 backdrop-blur-md border border-white/10">
            <div className="flex size-6 items-center justify-center rounded-lg bg-brand-cyan/20 text-brand-cyan">
              <Radio className="size-3" />
            </div>
            <span className="text-xs font-bold text-white">
              {interviewerPersona === 'priya' ? 'Priya Sharma (Senior Recruiter)' : 'Vikram Malhotra (Lead Engineer)'}
            </span>
            {isInterviewerSpeaking && (
              <span className="flex size-2 rounded-full bg-brand-cyan animate-ping"></span>
            )}
          </div>

          {/* Subtitle Caption Bar for Question */}
          <div className="absolute inset-x-4 top-4 z-20 rounded-2xl bg-slate-950/85 p-3.5 backdrop-blur-md border border-white/10 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-cyan">
                {currentQ.roundName || `Question ${currentIndex + 1}`}
              </span>
              <span className="text-[10px] text-slate-400">
                {aiDialogueStatus}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-100 sm:text-sm leading-relaxed">
              "{currentQ.question}"
            </p>
          </div>
        </div>

        {/* Tile 2: Candidate Real Webcam Video Tile */}
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-black shadow-inner">
          <video
            ref={candidateVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover -scale-x-100"
          />

          {/* Proctor HUD in top-right */}
          <div className="absolute top-4 right-4 flex items-center gap-2 rounded-xl bg-slate-950/85 px-3 py-1.5 backdrop-blur-md border border-white/10">
            <div
              className={`flex items-center gap-1 text-[11px] font-bold ${
                gazeStatus === 'focused'
                  ? 'text-emerald-400'
                  : gazeStatus === 'looking-down'
                  ? 'text-rose-400 animate-pulse'
                  : 'text-amber-400'
              }`}
            >
              <Eye className="size-3.5" />
              <span>
                {gazeStatus === 'focused' ? 'Eye Contact OK' : gazeStatus === 'looking-down' ? 'Looking Down' : 'Looking Away'}
              </span>
            </div>
            <span className="text-slate-600">|</span>
            <span className={`text-xs font-bold ${violations > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              Strikes: {violations}/2
            </span>
          </div>

          {/* Candidate Name Tag & Live Mic Level bottom-left */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-slate-950/80 px-3 py-1.5 backdrop-blur-md border border-white/10">
            <Mic className={`size-3.5 ${candidateAudioLevel > 15 ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="text-xs font-bold text-white">You</span>
            <div className="h-2 w-16 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-75"
                style={{ width: `${candidateAudioLevel}%` }}
              ></div>
            </div>
          </div>

          {/* Live Subtitle of what Candidate is speaking */}
          {candidateTranscript && (
            <div className="absolute inset-x-4 bottom-14 rounded-2xl bg-slate-950/90 p-3 backdrop-blur-md border border-white/15 text-xs text-emerald-300 animate-in fade-in">
              <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Speaking:</span>
              "{candidateTranscript}"
            </div>
          )}

          {/* Warning Banner Overlay */}
          {warningMessage && (
            <div className="absolute inset-x-4 top-16 z-30 flex items-center gap-3 rounded-2xl border-2 border-amber-500 bg-amber-950/95 p-3.5 text-xs font-bold text-amber-200 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4">
              <AlertTriangle className="size-5 shrink-0 text-amber-400 animate-bounce" />
              <span>{warningMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Meeting Controls Bar (Google Meet Style) */}
      <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/90 px-6 py-4 backdrop-blur-md">
        {/* Left helper tip */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <Sparkles className="size-3.5 text-brand-cyan" />
          <span>Speak naturally · Say <b>"repeat"</b> to hear again, or <b>"skip"</b> to pass</span>
        </div>

        {/* Center Control Buttons */}
        <div className="flex items-center gap-3 mx-auto sm:mx-0">
          <button
            onClick={toggleMic}
            className={`flex size-11 items-center justify-center rounded-2xl border transition-all ${
              micEnabled ? 'border-white/10 bg-white/10 text-white hover:bg-white/15' : 'border-rose-500/40 bg-rose-500/20 text-rose-400'
            }`}
            title="Toggle Microphone"
          >
            {micEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </button>

          <button
            onClick={toggleCamera}
            className={`flex size-11 items-center justify-center rounded-2xl border transition-all ${
              cameraEnabled ? 'border-white/10 bg-white/10 text-white hover:bg-white/15' : 'border-rose-500/40 bg-rose-500/20 text-rose-400'
            }`}
            title="Toggle Camera"
          >
            {cameraEnabled ? <Camera className="size-5" /> : <CameraOff className="size-5" />}
          </button>

          <button
            onClick={handleEndCall}
            className="flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition-all hover:bg-rose-700 active:scale-95"
            title="End Interview Call"
          >
            <PhoneOff className="size-4" />
            <span>End Call</span>
          </button>
        </div>

        {/* Right Switch Persona Toggle */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => setInterviewerPersona((p) => (p === 'priya' ? 'vikram' : 'priya'))}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Switch to {interviewerPersona === 'priya' ? 'Vikram' : 'Priya'}
          </button>
        </div>
      </div>
    </div>
  )
}
