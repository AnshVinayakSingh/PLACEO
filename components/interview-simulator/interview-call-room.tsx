'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TemporalProctorFusion } from './proctor-fusion'
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
  Wifi,
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
type DialogueTurn = { role: 'interviewer' | 'candidate'; text: string; at: number }

const LIVE_WS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained'
const VIDEO_INTERVAL_MS = 1000

function base64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)))
  return btoa(binary)
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
  const result = new Float32Array(Math.round(buffer.length / ratio))
  let resultIndex = 0
  let sourceIndex = 0
  while (resultIndex < result.length) {
    const next = Math.min(buffer.length, Math.round((resultIndex + 1) * ratio))
    let sum = 0
    let count = 0
    for (let i = sourceIndex; i < next; i++) { sum += buffer[i]; count++ }
    result[resultIndex++] = count ? sum / count : 0
    sourceIndex = next
  }
  return result
}

function pcm16ToFloat32(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const result = new Float32Array(Math.floor(bytes.byteLength / 2))
  for (let i = 0; i < result.length; i++) result[i] = view.getInt16(i * 2, true) / 32768
  return result
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const websocketRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const outputContextRef = useRef<AudioContext | null>(null)
  const nextPlaybackTimeRef = useRef(0)
  const playbackSourcesRef = useRef<AudioBufferSourceNode[]>([])
  const faceLandmarkerRef = useRef<any>(null)
  const objectDetectorRef = useRef<any>(null)
  const proctorTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
  const resumptionHandleRef = useRef<string | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const intentionallyClosingRef = useRef(false)
  const startedModelConversationRef = useRef(false)
  const candidateTurnCountRef = useRef(0)
  const streamReadyRef = useRef(false)
  const proctorFusionRef = useRef(new TemporalProctorFusion(8500))
  const candidateActivityRef = useRef(false)
  const lastCandidateAudioAtRef = useRef(0)

  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState('Preparing secure real-time interviewer…')
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false)
  const [candidateSpeaking, setCandidateSpeaking] = useState(false)
  const [candidateTranscript, setCandidateTranscript] = useState('')
  const [interviewerTranscript, setInterviewerTranscript] = useState('')
  const [gaze, setGaze] = useState<GazeState>('focused')
  const [violations, setViolations] = useState(0)
  const [warning, setWarning] = useState<string | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [detection, setDetection] = useState('Initializing multi-signal proctor…')
  const [audioLevel, setAudioLevel] = useState(0)
  const [turnCount, setTurnCount] = useState(0)
  const [liveAssessment, setLiveAssessment] = useState<{ technicalDepth: number; communication: number; reasoning: number; confidence: number; relevance: number; evidence: string } | null>(null)

  const personaName = persona === 'priya' ? 'Priya Sharma' : 'Vikram Malhotra'
  const personaRole = persona === 'priya' ? 'Senior Technical Recruiter' : 'Lead Software Engineer'
  const avatar = persona === 'priya' ? '/avatar-1.png' : '/avatar-2.png'

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }
    streamReadyRef.current = true
  }, [stream])

  useEffect(() => {
    const timer = setInterval(() => setCallDuration((v) => v + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const stopPlayback = useCallback(() => {
    playbackSourcesRef.current.forEach((source) => { try { source.stop() } catch {} })
    playbackSourcesRef.current = []
    nextPlaybackTimeRef.current = outputContextRef.current?.currentTime || 0
    setInterviewerSpeaking(false)
  }, [])

  const queuePcm = useCallback((base64: string, mimeType?: string) => {
    try {
      if (!outputContextRef.current) outputContextRef.current = new AudioContext()
      const ctx = outputContextRef.current
      if (ctx.state === 'suspended') void ctx.resume()
      const pcm = pcm16ToFloat32(base64ToBytes(base64))
      const rateMatch = mimeType?.match(/rate=(\d+)/i)
      const sampleRate = Number(rateMatch?.[1] || 24000)
      const buffer = ctx.createBuffer(1, pcm.length, sampleRate)
      buffer.copyToChannel(pcm, 0)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      const start = Math.max(ctx.currentTime + 0.015, nextPlaybackTimeRef.current)
      source.start(start)
      nextPlaybackTimeRef.current = start + buffer.duration
      playbackSourcesRef.current.push(source)
      source.onended = () => {
        playbackSourcesRef.current = playbackSourcesRef.current.filter((s) => s !== source)
        if (!playbackSourcesRef.current.length) setInterviewerSpeaking(false)
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
    const answers: CandidateAnswer[] = []
    let latestQuestion = 'Live adaptive interview prompt'
    let answerIndex = 0
    for (const turn of dialogueRef.current) {
      if (turn.role === 'interviewer') {
        latestQuestion = turn.text
      } else {
        answerIndex++
        const previousCandidateAt = dialogueRef.current
          .filter((item) => item.role === 'candidate' && item.at <= turn.at)
          .slice(-2, -1)[0]?.at
        answers.push({
          questionId: `live-turn-${answerIndex}`,
          question: latestQuestion,
          userTranscript: turn.text,
          timeTakenSeconds: Math.max(1, Math.round((turn.at - (previousCandidateAt || startTimeRef.current)) / 1000)),
          expectedKeyPoints: [],
          modelAnswer: '',
          roundName: 'Adaptive Real-Time Round',
          skill: track,
        })
      }
    }
    return answers
  }, [track])

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    intentionallyClosingRef.current = true
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    if (videoTimerRef.current) clearInterval(videoTimerRef.current)
    try { websocketRef.current?.close(1000, 'Interview ended by candidate') } catch {}
    try { processorRef.current?.disconnect() } catch {}
    try { sourceRef.current?.disconnect() } catch {}
    try { audioContextRef.current?.close() } catch {}
    try { outputContextRef.current?.close() } catch {}
    stream.getTracks().forEach((track) => track.stop())
    const answers = buildAnswerTurns()
    audit('interview-ended', 'info', 'Candidate ended the real-time interview normally.')
    onFinishInterview(answers, strikesRef.current)
  }, [audit, buildAnswerTurns, onFinishInterview, stream])

  const strike = useCallback((reason: string) => {
    if (finishedRef.current) return
    strikesRef.current += 1
    const count = strikesRef.current
    setViolations(count)
    audit(count === 1 ? 'proctor-warning' : 'proctor-disqualification', count === 1 ? 'warning' : 'critical', reason)
    setWarning(count === 1
      ? `Warning 1/2 — ${reason}. Please correct the issue before continuing.`
      : `Disqualified — second confirmed integrity violation: ${reason}`)
    if (count >= 2) {
      finishedRef.current = true
      intentionallyClosingRef.current = true
      try { websocketRef.current?.close() } catch {}
      stream.getTracks().forEach((track) => track.stop())
      setStatus('Interview terminated by proctor')
      onDisqualify(reason, buildAnswerTurns())
      return
    }
    window.setTimeout(() => setWarning(null), 7000)
  }, [audit, buildAnswerTurns, onDisqualify, stream])

  // One persistent audio capture pipeline survives Live API reconnects.
  // AudioWorklet keeps PCM capture off the main UI thread; ScriptProcessor is
  // retained as a compatibility fallback for older browsers.
  useEffect(() => {
    if (!stream || audioContextRef.current) return
    const setupAudio = async () => {
      try {
        const audioContext = new AudioContext()
        audioContextRef.current = audioContext
        const source = audioContext.createMediaStreamSource(stream)
        sourceRef.current = source

        const sendPcm = (input: Float32Array) => {
          const ws = websocketRef.current
          if (!ws || ws.readyState !== WebSocket.OPEN || !micEnabledRef.current || finishedRef.current) return
          let sum = 0
          for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
          const rms = Math.sqrt(sum / Math.max(1, input.length))
          setAudioLevel(Math.min(100, Math.round(rms * 300)))
          if (rms > 0.012) {
            candidateActivityRef.current = true
            lastCandidateAudioAtRef.current = performance.now()
            setCandidateSpeaking(true)
          } else if (candidateActivityRef.current && performance.now() - lastCandidateAudioAtRef.current > 650) {
            candidateActivityRef.current = false
            setCandidateSpeaking(false)
            // Hybrid VAD: the server still performs automatic VAD, while this
            // explicit end-of-stream signal makes finalization feel snappier.
            try { ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } })) } catch {}
          }
          const pcm = floatTo16BitPCM(downsample(input, audioContext.sampleRate, 16000))
          try {
            ws.send(JSON.stringify({ realtimeInput: { audio: { data: bytesToBase64(new Uint8Array(pcm.buffer)), mimeType: 'audio/pcm;rate=16000' } } }))
          } catch {}
        }

        if (audioContext.audioWorklet) {
          try {
            await audioContext.audioWorklet.addModule('/interview-audio-processor.js')
            const worklet = new AudioWorkletNode(audioContext, 'placeo-interview-audio-processor', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 })
            const silentGain = audioContext.createGain()
            silentGain.gain.value = 0
            worklet.port.onmessage = (event) => {
              const input = event.data instanceof Float32Array ? event.data : new Float32Array(event.data)
              sendPcm(input)
            }
            source.connect(worklet)
            worklet.connect(silentGain)
            silentGain.connect(audioContext.destination)
            processorRef.current = worklet
          } catch (workletError) {
            console.warn('AudioWorklet unavailable; falling back to ScriptProcessor:', workletError)
          }
        }

        if (!processorRef.current) {
          const processor = audioContext.createScriptProcessor(2048, 1, 1)
          const silentGain = audioContext.createGain()
          silentGain.gain.value = 0
          source.connect(processor)
          processor.connect(silentGain)
          silentGain.connect(audioContext.destination)
          processor.onaudioprocess = (event) => sendPcm(event.inputBuffer.getChannelData(0))
          processorRef.current = processor
        }

        if (audioContext.state === 'suspended') await audioContext.resume()
      } catch (error) {
        console.error('Microphone pipeline failed:', error)
        setStatus('Microphone audio pipeline could not start.')
      }
    }
    void setupAudio()
    return () => {
      try { processorRef.current?.disconnect() } catch {}
      try { sourceRef.current?.disconnect() } catch {}
      try { audioContextRef.current?.close() } catch {}
      processorRef.current = null
      sourceRef.current = null
      audioContextRef.current = null
    }
  }, [stream])

  // Send low-rate camera frames to Gemini as multimodal context. The separate
  // proctor remains the source of truth for integrity actions; Gemini only uses
  // the frames to make the conversation more human and context-aware.
  useEffect(() => {
    const timer = setInterval(() => {
      const ws = websocketRef.current
      const video = videoRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN || !video || video.readyState < 2 || finishedRef.current || !cameraEnabled) return
      // Gemini 3.1 Live includes all video frames in turn coverage. Only send
      // frames while the candidate is actively speaking (plus a short tail),
      // reducing cost while retaining multimodal context for the conversation.
      const recentAudio = performance.now() - lastCandidateAudioAtRef.current < 2200
      if (!candidateActivityRef.current && !recentAudio) return
      try {
        const canvas = canvasRef.current || document.createElement('canvas')
        canvasRef.current = canvas
        const width = 480
        const ratio = video.videoWidth > 0 ? video.videoHeight / video.videoWidth : 9 / 16
        canvas.width = width
        canvas.height = Math.max(270, Math.round(width * ratio))
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.52)
        const base64 = dataUrl.split(',')[1]
        if (base64) ws.send(JSON.stringify({ realtimeInput: { video: { data: base64, mimeType: 'image/jpeg' } } }))
      } catch {}
    }, VIDEO_INTERVAL_MS)
    videoTimerRef.current = timer
    return () => clearInterval(timer)
  }, [cameraEnabled])

  const analyzeCandidateTurn = useCallback(async (question: string, answer: string) => {
    if (!question || !answer || answer.trim().length < 5) return
    try {
      const response = await fetch('/api/interview-simulator/live-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer }),
      })
      if (!response.ok) return
      const payload = await response.json()
      if (payload?.analysis) setLiveAssessment(payload.analysis)
    } catch {
      // Shadow assessment must never interrupt the live interview.
    }
  }, [])

  const connectLive = useCallback(async (resumeHandle?: string | null) => {
    const tokenResponse = await fetch('/api/interview-simulator/live-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription, resumeText, resumeHandle: resumeHandle || undefined }),
    })
    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok || !tokenData.token) throw new Error(tokenData.error || 'Live token unavailable')

    const ws = new WebSocket(`${LIVE_WS}?access_token=${encodeURIComponent(tokenData.token)}`)
    websocketRef.current = ws

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0
      setConnected(true)
      setStatus(resumeHandle ? 'Interview session resumed · listening' : 'Interviewer connected · listening')
      ws.send(JSON.stringify({
        setup: {
          model: `models/${tokenData.model}`,
          responseModalities: ['AUDIO'],
          inputAudioTranscription: { languageCodes: ['en-IN', 'en-US'], mode: 'SMART' },
          outputAudioTranscription: {},
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,
              startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
              endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
              prefixPaddingMs: 220,
              silenceDurationMs: 720,
            },
            activityHandling: 'START_OF_ACTIVITY_INTERRUPTS',
            turnCoverage: 'TURN_INCLUDES_AUDIO_ACTIVITY_AND_ALL_VIDEO',
          },
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: persona === 'priya' ? 'Kore' : 'Puck' } } },
          sessionResumption: resumeHandle ? { handle: resumeHandle } : {},
          historyConfig: { initialHistoryInClientContent: true },
          thinkingConfig: { thinkingLevel: 'low' },
          contextWindowCompression: { slidingWindow: {} },
        },
      }))

      if (!startedModelConversationRef.current && !resumeHandle) {
        startedModelConversationRef.current = true
        const openingContext = `Start the interview now. You must generate the opening question yourself from the candidate context. Do NOT use a fixed question bank. Ask exactly one concise question, then stop speaking and listen. Candidate track: ${track}; difficulty ${level}/5; target ${questionCount} candidate answer turns. Resume: ${resumeText || 'not provided'}. Job description: ${jobDescription || 'not provided'}.`
        ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: openingContext }] }], turnComplete: true } }))
      }
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.sessionResumptionUpdate?.resumable && message.sessionResumptionUpdate?.newHandle) {
          resumptionHandleRef.current = message.sessionResumptionUpdate.newHandle
          audit('live-session-resumable', 'info', 'Live session resumption handle refreshed.')
        }
        if (message.goAway) {
          setStatus('Refreshing secure real-time connection…')
          return
        }
        const content = message.serverContent
        if (!content) return
        if (content.interrupted) {
          stopPlayback()
          setStatus('Interviewer interrupted · listening to you')
        }
        if (content.inputTranscription?.text) {
          currentCandidateTextRef.current += ` ${String(content.inputTranscription.text)}`
          setCandidateTranscript(currentCandidateTextRef.current.trim())
          setCandidateSpeaking(true)
        }
        if (content.outputTranscription?.text) {
          currentInterviewerTextRef.current += ` ${String(content.outputTranscription.text)}`
          setInterviewerTranscript(currentInterviewerTextRef.current.trim())
        }
        if (content.modelTurn?.parts) {
          setInterviewerSpeaking(true)
          for (const part of content.modelTurn.parts) if (part.inlineData?.data) queuePcm(part.inlineData.data, part.inlineData.mimeType)
        }
        if (content.turnComplete) {
          const candidate = currentCandidateTextRef.current.trim()
          const interviewer = currentInterviewerTextRef.current.trim()
          if (candidate) {
            const questionForAnalysis = dialogueRef.current.filter((item) => item.role === 'interviewer').slice(-1)[0]?.text || 'Live adaptive interview question'
            addDialogue('candidate', candidate)
            void analyzeCandidateTurn(questionForAnalysis, candidate)
            candidateTurnCountRef.current += 1
            setTurnCount(candidateTurnCountRef.current)
            audit('candidate-spoke', 'info', candidate.slice(0, 400))
          }
          if (interviewer) {
            addDialogue('interviewer', interviewer)
            audit('interviewer-spoke', 'info', interviewer.slice(0, 400))
          }
          currentCandidateTextRef.current = ''
          currentInterviewerTextRef.current = ''
          setCandidateTranscript('')
          setCandidateSpeaking(false)
          if (candidateTurnCountRef.current >= questionCount && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: 'The target interview length has been reached. Close the interview professionally. Do not ask another question.' }] }], turnComplete: true } }))
            setStatus('Wrapping up the interview…')
          } else {
            setStatus('Listening · adaptive interviewer is thinking…')
          }
        }
      } catch (error) {
        console.warn('Live API message parse error:', error)
      }
    }

    ws.onerror = () => {
      setConnected(false)
      setStatus('Real-time connection interrupted · recovering…')
    }

    ws.onclose = () => {
      setConnected(false)
      if (finishedRef.current || intentionallyClosingRef.current) return
      const nextAttempt = reconnectAttemptsRef.current + 1
      if (nextAttempt > 4) {
        setStatus('Secure real-time connection could not be recovered. Please end and retry.')
        return
      }
      reconnectAttemptsRef.current = nextAttempt
      const delay = Math.min(6000, 700 * 2 ** (nextAttempt - 1))
      setStatus(`Recovering interview connection… retry ${nextAttempt}/4`)
      reconnectTimerRef.current = setTimeout(() => {
        void connectLive(resumptionHandleRef.current).catch(() => setStatus('Could not recover the interviewer connection.'))
      }, delay)
    }
  }, [addDialogue, analyzeCandidateTurn, audit, jobDescription, level, persona, questionCount, queuePcm, resumeText, stopPlayback, track])

  useEffect(() => {
    let cancelled = false
    void connectLive(null).catch((error) => {
      if (!cancelled) setStatus(error instanceof Error ? error.message : 'Could not connect to Gemini Live.')
    })
    return () => {
      cancelled = true
      intentionallyClosingRef.current = true
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      try { websocketRef.current?.close() } catch {}
    }
  }, [connectLive])

  // Vision stack: face landmarks + object detection. These are integrity signals,
  // not proof of intent; persistent signals are required before a strike.
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
          numFaces: 3,
          outputFaceBlendshapes: false,
        })
        if (!cancelled) faceLandmarkerRef.current = landmarker

        const tf = document.createElement('script')
        tf.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js'
        tf.async = true
        await new Promise<void>((resolve, reject) => { tf.onload = () => resolve(); tf.onerror = () => reject(new Error('tfjs failed')); document.head.appendChild(tf) })
        const coco = document.createElement('script')
        coco.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js'
        coco.async = true
        await new Promise<void>((resolve, reject) => { coco.onload = () => resolve(); coco.onerror = () => reject(new Error('coco failed')); document.head.appendChild(coco) })
        const detector = (window as any).cocoSsd
        if (detector?.load && !cancelled) objectDetectorRef.current = await detector.load({ base: 'mobilenet_v2' })
        if (!cancelled) { setDetection('Face + object integrity models ready'); audit('model-ready', 'info', 'Face and object proctor models loaded.') }
      } catch (error) {
        console.warn('Proctor model load failed:', error)
        setDetection('Face integrity model active · object model unavailable')
        audit('model-error', 'warning', 'One or more local vision models could not be loaded.')
      }
    }
    void loadVision()
    return () => { cancelled = true; try { faceLandmarkerRef.current?.close?.() } catch {} }
  }, [audit])

  useEffect(() => {
    const video = videoRef.current
    if (!stream || !video) return
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
          if (!faces.length) {
            noFaceRef.current++
            proctorFusionRef.current.push({ name: 'no-face', confidence: 0.92, at: Date.now(), durationMs: 1100 })
            setGaze('no-face')
          } else {
            noFaceRef.current = Math.max(0, noFaceRef.current - 1)
            if (faces.length > 1) {
              extraPersonRef.current++
              proctorFusionRef.current.push({ name: 'multiple-faces', confidence: 0.96, at: Date.now(), durationMs: 1500 })
              setDetection('Multiple faces detected')
            }
            const face = faces[0]
            const leftEye = face[33], rightEye = face[263], nose = face[1], forehead = face[10], chin = face[152]
            const leftIris = face[468], rightIris = face[473]
            if (leftEye && rightEye && nose && forehead && chin) {
              const eyeMidX = (leftEye.x + rightEye.x) / 2
              const eyeSpan = Math.max(0.02, Math.abs(rightEye.x - leftEye.x))
              const yaw = Math.abs((nose.x - eyeMidX) / eyeSpan)
              const faceHeight = Math.max(0.08, Math.abs(chin.y - forehead.y))
              const pitch = (nose.y - (leftEye.y + rightEye.y) / 2) / faceHeight
              const irisDown = leftIris && rightIris ? ((leftIris.y + rightIris.y) / 2 - (leftEye.y + rightEye.y) / 2) / faceHeight : 0
              if (pitch > 0.30 || irisDown > 0.055) { setGaze('looking-down'); downRef.current++; proctorFusionRef.current.push({ name: 'looking-down', confidence: Math.min(1, 0.72 + Math.max(0, pitch - 0.30)), at: Date.now(), durationMs: 1000 }) }
              else if (yaw > 0.42) { setGaze('looking-away'); awayRef.current++; proctorFusionRef.current.push({ name: 'looking-away', confidence: Math.min(1, 0.62 + Math.max(0, yaw - 0.42)), at: Date.now(), durationMs: 900 }) }
              else { setGaze('focused'); downRef.current = Math.max(0, downRef.current - 1); awayRef.current = Math.max(0, awayRef.current - 1) }
            }
          }
        }
        const detector = objectDetectorRef.current
        if (detector) {
          const predictions = await detector.detect(video)
          const persons = predictions.filter((p: any) => p.class === 'person' && p.score >= 0.55)
          const prohibited = predictions.filter((p: any) => ['cell phone', 'laptop', 'book', 'tablet', 'remote'].includes(p.class) && p.score >= 0.60)
          if (persons.length > 1) {
            extraPersonRef.current++
            proctorFusionRef.current.push({ name: 'multiple-faces', confidence: 0.9, at: Date.now(), durationMs: 1500 })
          } else extraPersonRef.current = Math.max(0, extraPersonRef.current - 1)
          if (prohibited.length) {
            prohibitedObjectRef.current++
            proctorFusionRef.current.push({ name: 'prohibited-object', confidence: Math.min(1, Number(prohibited[0]?.score || 0.75)), at: Date.now(), durationMs: 1800 })
          }
          else prohibitedObjectRef.current = Math.max(0, prohibitedObjectRef.current - 1)
          if (prohibited.length) setDetection(`Flagged object: ${prohibited[0].class}`)
          else if (persons.length > 1) setDetection('Multiple people detected')
          else if (gaze === 'looking-down') setDetection('Gaze anomaly under review')
          else setDetection('Scene clear')
        }
        if (proctorFusionRef.current.shouldStrike()) {
          const fused = proctorFusionRef.current.score()
          proctorFusionRef.current.reset()
          const reasonMap: Record<string, string> = {
            'no-face': 'Candidate face was repeatedly unavailable',
            'multiple-faces': 'Another person was repeatedly detected in the camera frame',
            'looking-down': 'Repeated downward gaze was detected',
            'looking-away': 'Repeated gaze away from the interview screen was detected',
            'prohibited-object': 'A prohibited external device or reference object was repeatedly detected',
          }
          strike(reasonMap[fused.dominantSignal || ''] || 'Multiple integrity signals were repeatedly detected')
        }
      } catch (error) { console.warn('Proctor inspection error:', error) }
      finally { busy = false }
    }
    proctorTimerRef.current = setInterval(() => void inspect(), 700)
    return () => { running = false; if (proctorTimerRef.current) clearInterval(proctorTimerRef.current) }
  }, [stream, strike, gaze])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') { proctorFusionRef.current.push({ name: 'tab-hidden', confidence: 1, at: Date.now(), durationMs: 2200 }); audit('tab-hidden', 'warning', 'Interview tab became hidden.'); strike('Interview tab was hidden or another application became active') }
      else audit('tab-visible', 'info', 'Interview tab became visible again.')
    }
    const onBlur = () => audit('window-blur', 'info', 'Interview window lost focus.')
    const onFocus = () => audit('window-focus', 'info', 'Interview window regained focus.')
    const onFullscreen = () => {
      if (!document.fullscreenElement && !finishedRef.current) { proctorFusionRef.current.push({ name: 'fullscreen-exit', confidence: 1, at: Date.now(), durationMs: 1800 }); audit('fullscreen-exit', 'warning', 'Candidate exited fullscreen.'); strike('Fullscreen mode was exited during the interview') }
      else if (document.fullscreenElement) audit('fullscreen-enter', 'info', 'Fullscreen mode active.')
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
      document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('blur', onBlur); window.removeEventListener('focus', onFocus)
      document.removeEventListener('fullscreenchange', onFullscreen); document.removeEventListener('copy', onCopy); document.removeEventListener('paste', onPaste); document.removeEventListener('contextmenu', onContext)
      videoTrack?.removeEventListener('ended', onVideoEnded); audioTrack?.removeEventListener('ended', onAudioEnded)
    }
  }, [audit, stream, strike])

  const toggleMic = () => {
    const next = !micEnabledRef.current
    micEnabledRef.current = next
    stream.getAudioTracks().forEach((track) => { track.enabled = next })
    setMicEnabled(next)
    if (!next && websocketRef.current?.readyState === WebSocket.OPEN) websocketRef.current.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }))
  }

  const toggleCamera = () => {
    const next = !cameraEnabled
    stream.getVideoTracks().forEach((track) => { track.enabled = next })
    setCameraEnabled(next)
  }

  const handleEnd = () => { if (confirm('End the interview and evaluate only the conversation completed so far?')) finish() }
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`

  return (
    <div className="relative flex min-h-[680px] h-[calc(100vh-140px)] flex-col overflow-hidden rounded-3xl border border-white/15 bg-black shadow-2xl">
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/95 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-300"><span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE AI INTERVIEW</span>
          <span className="hidden text-xs text-slate-400 sm:inline">{track} · adaptive · multimodal</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-slate-200"><span className="flex items-center gap-1.5"><Clock className="size-3.5 text-brand-cyan" />{formatTime(callDuration)}</span><span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-emerald-400" />{violations}/2</span><span className="hidden items-center gap-1.5 sm:flex"><Wifi className={`size-3.5 ${connected ? 'text-emerald-400' : 'text-amber-400'}`} />{connected ? 'LIVE' : 'RECOVERING'}</span></div>
      </div>

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,.22),transparent_45%),linear-gradient(135deg,#111827,#020617)]" />
          <div className="absolute inset-x-8 top-8 h-40 rounded-2xl border border-sky-400/10 bg-sky-900/10 shadow-inner backdrop-blur-sm" />
          <div className="absolute left-1/2 top-12 -translate-x-1/2 text-[9px] uppercase tracking-[0.35em] text-sky-300/40">PLACEO INTERVIEW SUITE</div>
          <div className="absolute inset-0 flex items-center justify-center p-8"><div className={`relative w-[min(78%,420px)] overflow-hidden rounded-[2.25rem] border border-white/15 bg-slate-900/60 shadow-2xl transition-transform duration-700 ${interviewerSpeaking ? 'scale-[1.015]' : ''}`}>
            <img src={avatar} alt={`${personaName}, AI interviewer`} className="h-[min(62vh,620px)] w-full object-cover object-top" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
            {interviewerSpeaking && <div className="absolute inset-x-6 bottom-24 flex items-end gap-1 rounded-xl border border-white/10 bg-black/35 p-2 backdrop-blur-md">{Array.from({ length: 24 }).map((_, i) => <span key={i} className="h-1 flex-1 rounded-full bg-cyan-300/80 animate-pulse" style={{ animationDelay: `${i * 35}ms`, transform: `scaleY(${0.35 + ((i * 17) % 9) / 10})` }} />)}</div>}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 backdrop-blur-xl"><div><p className="text-xs font-bold text-white">{personaName}</p><p className="text-[10px] text-slate-400">{personaRole}</p></div><span className={`flex items-center gap-1.5 text-[10px] font-semibold ${interviewerSpeaking ? 'text-cyan-300' : 'text-slate-400'}`}><Volume2 className="size-3.5" /> {interviewerSpeaking ? 'Speaking' : 'Listening'}</span></div>
          </div></div>
          <div className="absolute inset-x-4 top-4 rounded-2xl border border-white/10 bg-slate-950/85 p-3 backdrop-blur-xl"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">AI interviewer</span><span className="text-[10px] text-slate-400">{status}</span></div><p className="mt-1 text-xs leading-relaxed text-slate-100 sm:text-sm">{interviewerTranscript || 'The interviewer is listening and preparing the next response…'}</p></div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover -scale-x-100" />
          <div className="absolute left-4 right-4 top-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/85 px-3 py-2 backdrop-blur-xl"><div className={`flex items-center gap-2 text-[11px] font-bold ${gaze === 'focused' ? 'text-emerald-300' : gaze === 'looking-down' ? 'text-rose-300' : 'text-amber-300'}`}><Eye className="size-4" />{gaze === 'focused' ? 'Eye contact OK' : gaze === 'looking-down' ? 'Looking down' : gaze === 'no-face' ? 'Face not visible' : 'Looking away'}</div><div className="text-[10px] text-slate-400">{detection}</div></div>
          {warning && <div className="absolute left-4 right-4 top-20 z-20 flex items-start gap-3 rounded-2xl border-2 border-amber-400 bg-amber-950/95 p-4 text-xs font-bold text-amber-100 shadow-2xl backdrop-blur-xl"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-300" /><span>{warning}</span></div>}
          {liveAssessment && <div className="absolute bottom-20 left-4 right-4 rounded-2xl border border-cyan-400/15 bg-slate-950/90 p-3 backdrop-blur-xl"><div className="mb-2 flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300">Live assessment engine</span><span className="text-[9px] text-slate-500">shadow evaluator</span></div><div className="grid grid-cols-5 gap-1.5">{[['Tech', liveAssessment.technicalDepth], ['Talk', liveAssessment.communication], ['Reason', liveAssessment.reasoning], ['Conf', liveAssessment.confidence], ['Rel', liveAssessment.relevance]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-white/5 bg-white/[0.03] p-1.5 text-center"><div className="text-[8px] text-slate-500">{label}</div><div className="mt-0.5 text-xs font-bold text-white">{Math.round(Number(value))}</div></div>)}</div><p className="mt-2 line-clamp-2 text-[9px] leading-relaxed text-slate-400">{liveAssessment.evidence}</p></div>}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/85 p-3 backdrop-blur-xl"><div className="flex items-center gap-2"><Mic className={`size-4 ${candidateSpeaking ? 'text-emerald-300 animate-pulse' : 'text-slate-400'}`} /><div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${audioLevel}%` }} /></div><span className="text-[10px] font-semibold text-slate-300">{candidateSpeaking ? 'Listening to you…' : `Turn ${turnCount}/${questionCount}`}</span></div><span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[9px] text-slate-400">AI proctor active</span></div>
          {candidateTranscript && <div className="absolute bottom-20 left-4 right-4 rounded-2xl border border-emerald-400/20 bg-slate-950/90 p-3 text-xs text-emerald-200 backdrop-blur-xl"><span className="mb-1 block text-[9px] uppercase tracking-wider text-slate-500">Live transcript</span>{candidateTranscript}</div>}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-xl"><div className="hidden items-center gap-2 text-[10px] text-slate-500 sm:flex"><Sparkles className="size-3.5 text-cyan-400" /> Speak naturally. Interrupt the interviewer, ask a question, or challenge a point — the Live AI handles the conversation in real time.</div><div className="mx-auto flex items-center gap-2 sm:mx-0"><button onClick={toggleMic} className={`flex size-11 items-center justify-center rounded-2xl border ${micEnabled ? 'border-white/10 bg-white/10 text-white' : 'border-rose-500/30 bg-rose-500/20 text-rose-300'}`}>{micEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}</button><button onClick={toggleCamera} className={`flex size-11 items-center justify-center rounded-2xl border ${cameraEnabled ? 'border-white/10 bg-white/10 text-white' : 'border-rose-500/30 bg-rose-500/20 text-rose-300'}`}>{cameraEnabled ? <Camera className="size-5" /> : <CameraOff className="size-5" />}</button><button onClick={handleEnd} className="flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700"><PhoneOff className="size-4" /> End Interview</button></div><div className="hidden items-center gap-2 text-[10px] text-slate-500 sm:flex"><Radio className="size-3.5 text-cyan-400" /> Secure session · {connected ? 'connected' : 'recovering'}</div></div>
    </div>
  )
}
