'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Clock,
  Eye,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Volume2,
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
  persona: 'priya' | 'vikram'
  questionCount: number
  jobDescription: string
  resumeText: string
  onFinishInterview: (answers: CandidateAnswer[], violations: number) => void
  onDisqualify: (reason: string, answers: CandidateAnswer[]) => void
}

type GazeState = 'focused' | 'looking-away' | 'looking-down' | 'no-face'

type DialogueTurn = {
  role: 'interviewer' | 'candidate'
  text: string
  at: number
}

const LIVE_WS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained'

function base64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function floatTo16BitPCM(input: Float32Array) {
  const output = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return output
}

function downsample(buffer: Float32Array, inputRate: number, outputRate: number) {
  if (inputRate === outputRate) return buffer
  const ratio = inputRate / outputRate
  const newLength = Math.round(buffer.length / ratio)
  const result = new Float32Array(newLength)
  let offsetResult = 0
  let offsetBuffer = 0
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio)
    let accum = 0
    let count = 0
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i]
      count++
    }
    result[offsetResult] = count ? accum / count : 0
    offsetResult++
    offsetBuffer = nextOffsetBuffer
  }
  return result
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)))
  }
  return btoa(binary)
}

function pcm16ToFloat32(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const result = new Float32Array(Math.floor(bytes.byteLength / 2))
  for (let i = 0; i < result.length; i++) result[i] = view.getInt16(i * 2, true) / 32768
  return result
}

function loadScript(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null
    if (existing) {
      if ((existing as any).dataset.loaded === 'true') resolve()
      else existing.addEventListener('load', () => resolve(), { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

export function InterviewCallRoom({
  stream,
  questions,
  track,
  level,
  persona,
  questionCount,
  jobDescription,
  resumeText,
  onFinishInterview,
  onDisqualify,
}: InterviewCallRoomProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const websocketRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const outputContextRef = useRef<AudioContext | null>(null)
  const nextPlaybackTimeRef = useRef(0)
  const playbackSourcesRef = useRef<AudioBufferSourceNode[]>([])
  const faceLandmarkerRef = useRef<any>(null)
  const objectDetectorRef = useRef<any>(null)
  const proctorTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const strikesRef = useRef(0)
  const noFaceRef = useRef(0)
  const awayRef = useRef(0)
  const downRef = useRef(0)
  const extraPersonRef = useRef(0)
  const prohibitedObjectRef = useRef(0)
  const dialogueRef = useRef<DialogueTurn[]>([])
  const currentCandidateTextRef = useRef('')
  const currentInterviewerTextRef = useRef('')
  const finishedRef = useRef(false)
  const micEnabledRef = useRef(true)
  const startTimeRef = useRef(Date.now())

  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState('Connecting to secure Gemini Live...')
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false)
  const [candidateSpeaking, setCandidateSpeaking] = useState(false)
  const [candidateTranscript, setCandidateTranscript] = useState('')
  const [interviewerTranscript, setInterviewerTranscript] = useState(questions[0]?.question || '')
  const [gaze, setGaze] = useState<GazeState>('focused')
  const [violations, setViolations] = useState(0)
  const [warning, setWarning] = useState<string | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [detection, setDetection] = useState('Vision proctor warming up…')
  const [audioLevel, setAudioLevel] = useState(0)

  const personaName = persona === 'priya' ? 'Priya Sharma' : 'Vikram Malhotra'
  const personaRole = persona === 'priya' ? 'Senior Technical Recruiter' : 'Lead Software Engineer'
  const avatar = persona === 'priya' ? '/avatar-1.png' : '/avatar-2.png'

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }
  }, [stream])

  useEffect(() => {
    const timer = setInterval(() => setCallDuration((v) => v + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const stopPlayback = useCallback(() => {
    playbackSourcesRef.current.forEach((source) => {
      try { source.stop() } catch {}
    })
    playbackSourcesRef.current = []
    nextPlaybackTimeRef.current = outputContextRef.current?.currentTime || 0
    setInterviewerSpeaking(false)
  }, [])

  const queuePcm = useCallback((base64: string, mimeType?: string) => {
    try {
      if (!outputContextRef.current) {
        outputContextRef.current = new AudioContext()
      }
      const ctx = outputContextRef.current
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const bytes = base64ToBytes(base64)
      const pcm = pcm16ToFloat32(bytes)
      const rateMatch = mimeType?.match(/rate=(\d+)/i)
      const sampleRate = Number(rateMatch?.[1] || 24000)
      const buffer = ctx.createBuffer(1, pcm.length, sampleRate)
      buffer.copyToChannel(pcm, 0)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      const start = Math.max(ctx.currentTime + 0.02, nextPlaybackTimeRef.current)
      source.start(start)
      nextPlaybackTimeRef.current = start + buffer.duration
      playbackSourcesRef.current.push(source)
      source.onended = () => {
        playbackSourcesRef.current = playbackSourcesRef.current.filter((s) => s !== source)
        if (playbackSourcesRef.current.length === 0) setInterviewerSpeaking(false)
      }
      setInterviewerSpeaking(true)
    } catch (error) {
      console.warn('Live audio playback error:', error)
    }
  }, [])

  const addDialogue = useCallback((role: 'interviewer' | 'candidate', text: string) => {
    const clean = text.trim()
    if (!clean) return
    dialogueRef.current.push({ role, text: clean, at: Date.now() })
  }, [])

  const audit = useCallback((type: string, severity: 'info' | 'warning' | 'critical' = 'info', detail = '', confidence?: number) => {
    void fetch('/api/interview-simulator/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, severity, detail, confidence }),
      keepalive: true,
    }).catch(() => {})
  }, [])

  const buildAnswerTurns = useCallback((): CandidateAnswer[] => {
    const answerTurns: CandidateAnswer[] = []
    let latestQuestion = questions[0]?.question || 'Live interview response'
    let answerIndex = 0
    for (const turn of dialogueRef.current) {
      if (turn.role === 'interviewer') {
        latestQuestion = turn.text
      } else if (turn.role === 'candidate') {
        answerIndex++
        answerTurns.push({
          questionId: `live-turn-${answerIndex}`,
          question: latestQuestion,
          userTranscript: turn.text,
          timeTakenSeconds: Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000 / Math.max(1, answerIndex))),
          expectedKeyPoints: [],
          modelAnswer: '',
          roundName: 'Adaptive Live Round',
          skill: track,
        })
      }
    }
    return answerTurns
  }, [questions, track])

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    try { websocketRef.current?.close() } catch {}
    try { processorRef.current?.disconnect() } catch {}
    try { sourceRef.current?.disconnect() } catch {}
    try { audioContextRef.current?.close() } catch {}
    try { outputContextRef.current?.close() } catch {}
    stream.getTracks().forEach((track) => track.stop())

    const answerTurns = buildAnswerTurns()
    audit('interview-ended', 'info', 'Candidate ended the interview normally.')
    onFinishInterview(answerTurns, strikesRef.current)
  }, [audit, buildAnswerTurns, onFinishInterview, stream])

  const strike = useCallback((reason: string) => {
    if (finishedRef.current) return
    strikesRef.current += 1
    const count = strikesRef.current
    setViolations(count)
    audit(count === 1 ? 'proctor-warning' : 'proctor-disqualification', count === 1 ? 'warning' : 'critical', reason)
    setWarning(count === 1
      ? `Warning 1/2 — ${reason}. Keep your face visible and remove any external device or person from the frame.`
      : `Disqualified — second confirmed proctoring violation: ${reason}`)

    if (count >= 2) {
      finishedRef.current = true
      try { websocketRef.current?.close() } catch {}
      stream.getTracks().forEach((track) => track.stop())
      setStatus('Interview terminated by proctor')
      onDisqualify(reason, buildAnswerTurns())
      return
    }

    window.setTimeout(() => setWarning(null), 6500)
  }, [audit, buildAnswerTurns, onDisqualify, stream])

  // Secure Gemini Live session: native bidirectional audio + real-time transcription.
  useEffect(() => {
    let cancelled = false

    const connect = async () => {
      try {
        const tokenResponse = await fetch('/api/interview-simulator/live-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            persona,
            track,
            level,
            questionCount,
            jobDescription,
            resumeText,
          }),
        })
        const tokenData = await tokenResponse.json()
        if (!tokenResponse.ok || !tokenData.token) throw new Error(tokenData.error || 'Live token unavailable')
        if (cancelled) return

        const ws = new WebSocket(`${LIVE_WS}?access_token=${encodeURIComponent(tokenData.token)}`)
        websocketRef.current = ws

        ws.onopen = async () => {
          if (cancelled) return
          setConnected(true)
          setStatus('Interviewer connected · listening')

          ws.send(JSON.stringify({
            setup: {
              model: `models/${tokenData.model}`,
              responseModalities: ['AUDIO'],
              inputAudioTranscription: { languageCodes: ['en-IN', 'en-US'], mode: 'SMART' },
              realtimeInputConfig: {
                automaticActivityDetection: { disabled: false, startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH', endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH', silenceDurationMs: 650 },
                activityHandling: 'START_OF_ACTIVITY_INTERRUPTS',
              },
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: persona === 'priya' ? 'Kore' : 'Puck' },
                },
              },
              contextWindowCompression: { slidingWindow: {} },
            },
          }))

          // Kick off the interview using the dynamically generated opening question.
          const opening = questions[0]?.question || 'Please introduce yourself and walk me through your recent work.'
          ws.send(JSON.stringify({
            clientContent: {
              turns: [{ role: 'user', parts: [{ text: `Begin the interview now. Ask exactly this opening question naturally, then wait for the candidate's answer: ${opening}` }] }],
              turnComplete: true,
            },
          }))

          // Capture microphone PCM at the 16 kHz format required by Live API.
          const audioContext = new AudioContext()
          audioContextRef.current = audioContext
          const source = audioContext.createMediaStreamSource(stream)
          const processor = audioContext.createScriptProcessor(4096, 1, 1)
          const silentGain = audioContext.createGain()
          silentGain.gain.value = 0
          source.connect(processor)
          processor.connect(silentGain)
          silentGain.connect(audioContext.destination)
          sourceRef.current = source
          processorRef.current = processor

          processor.onaudioprocess = (event) => {
            if (ws.readyState !== WebSocket.OPEN || !micEnabledRef.current || finishedRef.current) return
            const input = event.inputBuffer.getChannelData(0)
            let sum = 0
            for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
            setAudioLevel(Math.min(100, Math.round(Math.sqrt(sum / input.length) * 260)))
            const pcm = floatTo16BitPCM(downsample(input, audioContext.sampleRate, 16000))
            ws.send(JSON.stringify({
              realtimeInput: {
                audio: { data: bytesToBase64(new Uint8Array(pcm.buffer)), mimeType: 'audio/pcm;rate=16000' },
              },
            }))
          }
        }

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            const content = message.serverContent
            if (!content) return

            if (content.inputTranscription?.text) {
              const text = String(content.inputTranscription.text)
              currentCandidateTextRef.current += ` ${text}`
              setCandidateTranscript(currentCandidateTextRef.current.trim())
              setCandidateSpeaking(true)
            }

            if (content.outputTranscription?.text) {
              const text = String(content.outputTranscription.text)
              currentInterviewerTextRef.current += ` ${text}`
              setInterviewerTranscript(currentInterviewerTextRef.current.trim())
            }

            if (content.modelTurn?.parts) {
              setInterviewerSpeaking(true)
              for (const part of content.modelTurn.parts) {
                if (part.inlineData?.data) queuePcm(part.inlineData.data, part.inlineData.mimeType)
              }
            }

            if (content.turnComplete) {
              const candidate = currentCandidateTextRef.current.trim()
              const interviewer = currentInterviewerTextRef.current.trim()
              if (candidate) addDialogue('candidate', candidate)
              if (interviewer) addDialogue('interviewer', interviewer)
              currentCandidateTextRef.current = ''
              currentInterviewerTextRef.current = ''
              setCandidateTranscript('')
              setCandidateSpeaking(false)
              const completedCandidateTurns = dialogueRef.current.filter((turn) => turn.role === 'candidate').length
              if (completedCandidateTurns >= questionCount && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  clientContent: {
                    turns: [{ role: 'user', parts: [{ text: 'You have reached the target interview length. Briefly acknowledge the candidate and conclude the interview now. Do not ask another question.' }] }],
                    turnComplete: true,
                  },
                }))
              }
              setStatus(completedCandidateTurns >= questionCount ? 'Wrapping up the interview…' : 'Interviewer is thinking…')
            }

            if (message.goAway) setStatus('Live session preparing a seamless reconnect…')
          } catch (error) {
            console.warn('Live API message parse error:', error)
          }
        }

        ws.onerror = () => setStatus('Live connection error · attempting recovery…')
        ws.onclose = () => {
          if (!finishedRef.current) setStatus('Live session closed')
        }
      } catch (error) {
        console.error('Live interviewer connection failed:', error)
        setStatus('Could not connect to Gemini Live. Please retry the interview.')
      }
    }

    connect()
    return () => {
      cancelled = true
      try { websocketRef.current?.close() } catch {}
      try { processorRef.current?.disconnect() } catch {}
      try { sourceRef.current?.disconnect() } catch {}
      try { audioContextRef.current?.close() } catch {}
    }
  }, [addDialogue, jobDescription, level, persona, questionCount, queuePcm, questions, resumeText, stream, track])

  // High-quality local proctoring: MediaPipe face landmarks + COCO object detection.
  // The detector produces integrity flags, not a claim of intent; repeated confirmed
  // signals are required before a strike.
  useEffect(() => {
    let cancelled = false
    const loadVision = async () => {
      try {
        const base = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
        const visionModule: any = await import(/* webpackIgnore: true */ `${base}/vision_bundle.mjs`)
        const { FaceLandmarker, FilesetResolver } = visionModule
        const fileset = await FilesetResolver.forVisionTasks(`${base}/wasm`)
        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 2,
          outputFaceBlendshapes: false,
        })
        if (!cancelled) faceLandmarkerRef.current = landmarker

        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js', 'placeo-tfjs')
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js', 'placeo-coco')
        const coco = (window as any).cocoSsd
        if (coco?.load && !cancelled) objectDetectorRef.current = await coco.load({ base: 'mobilenet_v2' })
        if (!cancelled) { setDetection('Face + object models ready'); audit('model-ready', 'info', 'Face and object proctor models loaded.') }
      } catch (error) {
        console.warn('Advanced proctor model load failed; using face-only checks:', error)
        setDetection('Face model active · object model unavailable'); audit('model-error', 'warning', 'Object detector could not be loaded.')
      }
    }
    loadVision()
    return () => {
      cancelled = true
      try { faceLandmarkerRef.current?.close?.() } catch {}
    }
  }, [audit])

  useEffect(() => {
    if (!stream || !videoRef.current) return
    const video = videoRef.current
    let running = true
    let busy = false

    const inspect = async () => {
      if (!running || busy || video.readyState < 2 || finishedRef.current) return
      busy = true
      try {
        const landmarker = faceLandmarkerRef.current
        if (landmarker) {
          const result = landmarker.detectForVideo(video, performance.now())
          const faces = result?.faceLandmarks || []
          if (faces.length === 0) {
            noFaceRef.current++
            setGaze('no-face')
          } else {
            if (faces.length > 1) {
              extraPersonRef.current++
              setDetection('Multiple faces detected')
            }
            noFaceRef.current = Math.max(0, noFaceRef.current - 1)
            const face = faces[0]
            const leftEye = face[33]
            const rightEye = face[263]
            const nose = face[1]
            const forehead = face[10]
            const chin = face[152]
            const leftIris = face[468]
            const rightIris = face[473]
            const leftEyeInner = face[133]
            const rightEyeInner = face[362]
            if (leftEye && rightEye && nose && forehead && chin) {
              const eyeMidX = (leftEye.x + rightEye.x) / 2
              const eyeSpan = Math.max(0.02, Math.abs(rightEye.x - leftEye.x))
              const yaw = Math.abs((nose.x - eyeMidX) / eyeSpan)
              const faceHeight = Math.max(0.08, Math.abs(chin.y - forehead.y))
              const pitch = (nose.y - (leftEye.y + rightEye.y) / 2) / faceHeight
              const irisDown = leftIris && rightIris
                ? ((leftIris.y + rightIris.y) / 2 - (leftEye.y + rightEye.y) / 2) / faceHeight
                : 0
              const irisSide = leftIris && rightIris && leftEyeInner && rightEyeInner
                ? Math.abs(((leftIris.x - leftEyeInner.x) / Math.max(0.02, leftEye.x - leftEyeInner.x)) - ((rightIris.x - rightEye.x) / Math.max(0.02, rightEyeInner.x - rightEye.x)))
                : 0

              if (pitch > 0.30 || irisDown > 0.055) {
                setGaze('looking-down')
                downRef.current++
              } else if (yaw > 0.42 || irisSide > 0.72) {
                setGaze('looking-away')
                awayRef.current++
              } else {
                setGaze('focused')
                downRef.current = Math.max(0, downRef.current - 1)
                awayRef.current = Math.max(0, awayRef.current - 1)
              }
            }
          }
        }

        const detector = objectDetectorRef.current
        if (detector) {
          const predictions = await detector.detect(video)
          const persons = predictions.filter((p: any) => p.class === 'person' && p.score >= 0.55)
          const prohibited = predictions.filter((p: any) => ['cell phone', 'laptop', 'book', 'tablet', 'remote'].includes(p.class) && p.score >= 0.55)
          if (persons.length > 1) extraPersonRef.current++
          else extraPersonRef.current = Math.max(0, extraPersonRef.current - 1)
          if (prohibited.length > 0) prohibitedObjectRef.current++
          else prohibitedObjectRef.current = Math.max(0, prohibitedObjectRef.current - 1)
          if (prohibited.length > 0) setDetection(`Flagged object: ${prohibited[0].class}`)
          else if (persons.length > 1) setDetection('Multiple people detected')
          else setDetection('Scene clear')
        }

        if (noFaceRef.current >= 6) {
          noFaceRef.current = 0
          strike('No face detected in the camera frame')
        } else if (downRef.current >= 6) {
          downRef.current = 0
          strike('Repeated downward gaze detected')
        } else if (awayRef.current >= 6) {
          awayRef.current = 0
          strike('Repeated gaze away from the interview screen')
        } else if (extraPersonRef.current >= 4) {
          extraPersonRef.current = 0
          strike('Another person was detected in the camera frame')
        } else if (prohibitedObjectRef.current >= 4) {
          prohibitedObjectRef.current = 0
          strike('A prohibited external device or reference object was detected')
        }
      } catch (error) {
        console.warn('Proctor inspection error:', error)
      } finally {
        busy = false
      }
    }

    proctorTimerRef.current = setInterval(() => { void inspect() }, 700)
    return () => {
      running = false
      if (proctorTimerRef.current) clearInterval(proctorTimerRef.current)
    }
  }, [audit, strike, stream])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        audit('tab-hidden', 'warning', 'Interview tab became hidden.')
        strike('Interview tab was hidden or another application became active')
      } else {
        audit('tab-visible', 'info', 'Interview tab became visible again.')
      }
    }
    const onBlur = () => audit('window-blur', 'info', 'Interview window lost focus.')
    const onFocus = () => audit('window-focus', 'info', 'Interview window regained focus.')
    const onFullscreen = () => {
      if (!document.fullscreenElement && !finishedRef.current) {
        audit('fullscreen-exit', 'warning', 'Candidate exited fullscreen.')
        strike('Fullscreen mode was exited during the interview')
      } else if (document.fullscreenElement) {
        audit('fullscreen-enter', 'info', 'Fullscreen mode active.')
      }
    }
    const onCopy = () => audit('copy-attempt', 'warning', 'Copy action attempted during interview.')
    const onPaste = () => audit('paste-attempt', 'warning', 'Paste action attempted during interview.')
    const onContext = (event: MouseEvent) => { event.preventDefault(); audit('context-menu', 'warning', 'Context menu attempted during interview.') }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    document.addEventListener('fullscreenchange', onFullscreen)
    document.addEventListener('copy', onCopy)
    document.addEventListener('paste', onPaste)
    document.addEventListener('contextmenu', onContext)

    const videoTrack = stream.getVideoTracks()[0]
    const audioTrack = stream.getAudioTracks()[0]
    const onVideoEnded = () => { audit('camera-ended', 'critical', 'Camera track ended.'); strike('Camera was disconnected or stopped') }
    const onAudioEnded = () => { audit('microphone-ended', 'critical', 'Microphone track ended.'); strike('Microphone was disconnected or stopped') }
    videoTrack?.addEventListener('ended', onVideoEnded)
    audioTrack?.addEventListener('ended', onAudioEnded)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('fullscreenchange', onFullscreen)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('contextmenu', onContext)
      videoTrack?.removeEventListener('ended', onVideoEnded)
      audioTrack?.removeEventListener('ended', onAudioEnded)
    }
  }, [audit, stream, strike])

  const toggleMic = () => {
    const next = !micEnabledRef.current
    micEnabledRef.current = next
    stream.getAudioTracks().forEach((track) => { track.enabled = next })
    setMicEnabled(next)
  }

  const toggleCamera = () => {
    const next = !cameraEnabled
    stream.getVideoTracks().forEach((track) => { track.enabled = next })
    setCameraEnabled(next)
  }

  const handleEnd = () => {
    if (confirm('End the interview and evaluate only the conversation completed so far?')) finish()
  }

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`

  return (
    <div className="relative flex min-h-[680px] h-[calc(100vh-140px)] flex-col overflow-hidden rounded-3xl border border-white/15 bg-black shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/95 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-300">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE AI INTERVIEW
          </span>
          <span className="hidden text-xs text-slate-400 sm:inline">{track} · adaptive · {questionCount} target turns</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-slate-200">
          <span className="flex items-center gap-1.5"><Clock className="size-3.5 text-brand-cyan" />{formatTime(callDuration)}</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-emerald-400" />{violations}/2</span>
        </div>
      </div>

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,.22),transparent_45%),linear-gradient(135deg,#111827,#020617)]" />
          <div className="absolute inset-x-8 top-8 h-40 rounded-2xl border border-sky-400/10 bg-sky-900/10 shadow-inner backdrop-blur-sm" />
          <div className="absolute left-1/2 top-12 -translate-x-1/2 text-[9px] uppercase tracking-[0.35em] text-sky-300/40">PLACEO INTERVIEW SUITE</div>

          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className={`relative w-[min(78%,420px)] overflow-hidden rounded-[2.25rem] border border-white/15 bg-slate-900/60 shadow-2xl transition-transform duration-700 ${interviewerSpeaking ? 'scale-[1.015]' : ''}`}>
              <img src={avatar} alt={`${personaName}, AI interviewer`} className="h-[min(62vh,620px)] w-full object-cover object-top" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
              {interviewerSpeaking && (
                <div className="absolute inset-x-6 bottom-24 flex items-end gap-1 rounded-xl border border-white/10 bg-black/35 p-2 backdrop-blur-md">
                  {Array.from({ length: 24 }).map((_, i) => <span key={i} className="h-1 flex-1 rounded-full bg-cyan-300/80 animate-pulse" style={{ animationDelay: `${i * 35}ms`, transform: `scaleY(${0.35 + ((i * 17) % 9) / 10})` }} />)}
                </div>
              )}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 backdrop-blur-xl">
                <div>
                  <p className="text-xs font-bold text-white">{personaName}</p>
                  <p className="text-[10px] text-slate-400">{personaRole}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-[10px] font-semibold ${interviewerSpeaking ? 'text-cyan-300' : 'text-slate-400'}`}>
                  <Volume2 className="size-3.5" /> {interviewerSpeaking ? 'Speaking' : 'Listening'}
                </span>
              </div>
            </div>
          </div>

          <div className="absolute inset-x-4 top-4 rounded-2xl border border-white/10 bg-slate-950/85 p-3 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">AI interviewer</span>
              <span className="text-[10px] text-slate-400">{status}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-100 sm:text-sm">{interviewerTranscript || questions[0]?.question}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover -scale-x-100" />

          <div className="absolute left-4 right-4 top-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/85 px-3 py-2 backdrop-blur-xl">
            <div className={`flex items-center gap-2 text-[11px] font-bold ${gaze === 'focused' ? 'text-emerald-300' : gaze === 'looking-down' ? 'text-rose-300' : 'text-amber-300'}`}>
              <Eye className="size-4" />
              {gaze === 'focused' ? 'Eye contact OK' : gaze === 'looking-down' ? 'Looking down' : gaze === 'no-face' ? 'Face not visible' : 'Looking away'}
            </div>
            <div className="text-[10px] text-slate-400">{detection}</div>
          </div>

          {warning && (
            <div className="absolute left-4 right-4 top-20 z-20 flex items-start gap-3 rounded-2xl border-2 border-amber-400 bg-amber-950/95 p-4 text-xs font-bold text-amber-100 shadow-2xl backdrop-blur-xl">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-300" />
              <span>{warning}</span>
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/85 p-3 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Mic className={`size-4 ${candidateSpeaking ? 'text-emerald-300 animate-pulse' : 'text-slate-400'}`} />
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${audioLevel}%` }} />
              </div>
              <span className="text-[10px] font-semibold text-slate-300">{candidateSpeaking ? 'Listening to you…' : 'Your camera'}</span>
            </div>
            <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[9px] text-slate-400">AI proctor active</span>
          </div>

          {candidateTranscript && (
            <div className="absolute bottom-20 left-4 right-4 rounded-2xl border border-emerald-400/20 bg-slate-950/90 p-3 text-xs text-emerald-200 backdrop-blur-xl">
              <span className="mb-1 block text-[9px] uppercase tracking-wider text-slate-500">Live transcript</span>
              {candidateTranscript}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-xl">
        <div className="hidden items-center gap-2 text-[10px] text-slate-500 sm:flex">
          <Sparkles className="size-3.5 text-cyan-400" /> Ask the interviewer anything — Gemini can answer naturally before continuing the interview.
        </div>
        <div className="mx-auto flex items-center gap-2 sm:mx-0">
          <button onClick={toggleMic} className={`flex size-11 items-center justify-center rounded-2xl border ${micEnabled ? 'border-white/10 bg-white/10 text-white' : 'border-rose-500/30 bg-rose-500/20 text-rose-300'}`}>
            {micEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </button>
          <button onClick={toggleCamera} className={`flex size-11 items-center justify-center rounded-2xl border ${cameraEnabled ? 'border-white/10 bg-white/10 text-white' : 'border-rose-500/30 bg-rose-500/20 text-rose-300'}`}>
            {cameraEnabled ? <Camera className="size-5" /> : <CameraOff className="size-5" />}
          </button>
          <button onClick={handleEnd} className="flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700">
            <PhoneOff className="size-4" /> End Interview
          </button>
        </div>
        <div className="hidden items-center gap-2 text-[10px] text-slate-500 sm:flex">
          <Radio className="size-3.5 text-cyan-400" /> Secure session · {connected ? 'connected' : 'connecting'}
        </div>
      </div>
    </div>
  )
}
