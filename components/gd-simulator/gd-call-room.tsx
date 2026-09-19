'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { buildGDModeratorInstruction, type GDParticipant } from '@/lib/gd-instruction'
import { AIGDAvatar } from '@/components/gd-simulator/ai-gd-avatar'
import { Mic, MicOff, PhoneOff, Radio, Users, Wifi } from 'lucide-react'

export interface GDTranscriptEntry {
  speaker: string
  text: string
  at: number
  offTopic?: boolean
}

export interface GDRoomMemberLite {
  userId: string
  name: string
  isHost: boolean
}

interface GDCallRoomProps {
  roomId: string
  mode: 'solo' | 'multiplayer'
  companyName: string
  jobRole: string
  topic: string
  userName: string
  participants: GDParticipant[]
  /** Multiplayer only. */
  currentUserId?: string
  isHost?: boolean
  roomMembers?: GDRoomMemberLite[]
  onEnd: (transcript: GDTranscriptEntry[]) => void
}

const LIVE_WS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained'

// Public STUN (Google, free, no key) + Open Relay Project's public free TURN
// endpoint as a NAT-traversal fallback. For real production scale beyond
// testing, swap the TURN entry for a paid/dedicated TURN provider — the free
// relay is rate-limited and only meant to get P2P working across most
// home/campus networks during development.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

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

export function GDCallRoom({
  roomId,
  mode,
  companyName,
  jobRole,
  topic,
  userName,
  participants,
  currentUserId,
  isHost,
  roomMembers,
  onEnd,
}: GDCallRoomProps) {
  // ── Shared refs (used by both solo and multiplayer paths) ──────────────────
  const websocketRef = useRef<WebSocket | null>(null)
  const outputContextRef = useRef<AudioContext | null>(null)
  const nextPlaybackTimeRef = useRef(0)
  const playbackSourcesRef = useRef<AudioBufferSourceNode[]>([])
  const liveReadyRef = useRef(false)
  const micEnabledRef = useRef(true)
  const finishedRef = useRef(false)
  const startedConversationRef = useRef(false)
  const currentUserTextRef = useRef('')
  const currentAiTextRef = useRef('')
  const transcriptRef = useRef<GDTranscriptEntry[]>([])
  const reconnectAttemptsRef = useRef(0)
  const micStreamRef = useRef<MediaStream | null>(null)

  // ── Solo-only refs (unchanged from the original working implementation) ────
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  // ── Multiplayer-only refs ────────────────────────────────────────────────
  // The AI's spoken output gets mixed into this destination (in addition to
  // the listener's own speakers) so it can be added as a real outgoing
  // WebRTC track and heard by every other human in the room. Stays null in
  // solo mode and on non-host multiplayer clients.
  const aiOutputDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map())
  const localVideoElRef = useRef<HTMLVideoElement | null>(null)
  const signalEventSourceRef = useRef<EventSource | null>(null)
  const speechRecRef = useRef<any>(null)
  const aiSpeakingPulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [remotePeerIds, setRemotePeerIds] = useState<string[]>([])

  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState(mode === 'multiplayer' ? 'Connecting voice room…' : 'Connecting to GD Coach AI…')
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [userSpeaking, setUserSpeaking] = useState(false)
  const [micEnabled, setMicEnabled] = useState(true)
  const [callDuration, setCallDuration] = useState(0)
  const [liveTranscript, setLiveTranscript] = useState<GDTranscriptEntry[]>([])
  const [audioLevel, setAudioLevel] = useState(0)
  const [peersConnected, setPeersConnected] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setCallDuration((v) => v + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const stopPlayback = useCallback(() => {
    playbackSourcesRef.current.forEach((s) => { try { s.stop() } catch {} })
    playbackSourcesRef.current = []
    nextPlaybackTimeRef.current = outputContextRef.current?.currentTime || 0
    setAiSpeaking(false)
  }, [])

  // Plays a chunk of AI-spoken PCM audio locally, AND (host, multiplayer only)
  // also routes it into aiOutputDestRef so it becomes a live WebRTC track
  // every other room member hears through their own peer connection.
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
      if (aiOutputDestRef.current) source.connect(aiOutputDestRef.current)
      const start = Math.max(ctx.currentTime + 0.015, nextPlaybackTimeRef.current)
      source.start(start)
      nextPlaybackTimeRef.current = start + buffer.duration
      playbackSourcesRef.current.push(source)
      source.onended = () => {
        playbackSourcesRef.current = playbackSourcesRef.current.filter((s) => s !== source)
        if (!playbackSourcesRef.current.length) setAiSpeaking(false)
      }
      setAiSpeaking(true)
    } catch (error) {
      console.warn('GD audio playback error:', error)
    }
  }, [])

  const addTranscript = useCallback((speaker: string, text: string, offTopic = false) => {
    const clean = text.trim()
    if (!clean) return
    const entry: GDTranscriptEntry = { speaker, text: clean, at: Date.now(), offTopic }
    transcriptRef.current.push(entry)
    setLiveTranscript((prev) => [...prev.slice(-24), entry])
  }, [])

  // Brief visual "AI is speaking" pulse for non-host multiplayer clients, who
  // hear the AI over WebRTC (not their own Gemini connection) and so have no
  // direct audio-driven speaking state of their own.
  const pulseAiSpeaking = useCallback(() => {
    setAiSpeaking(true)
    if (aiSpeakingPulseTimeoutRef.current) clearTimeout(aiSpeakingPulseTimeoutRef.current)
    aiSpeakingPulseTimeoutRef.current = setTimeout(() => setAiSpeaking(false), 2500)
  }, [])

  const cleanupMultiplayer = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => { try { pc.close() } catch {} })
    peerConnectionsRef.current.clear()
    pendingIceRef.current.clear()
    remoteStreamsRef.current.clear()
    setRemotePeerIds([])
    try { signalEventSourceRef.current?.close() } catch {}
    try { speechRecRef.current?.stop() } catch {}
    if (aiSpeakingPulseTimeoutRef.current) clearTimeout(aiSpeakingPulseTimeoutRef.current)
  }, [])

  const handleEndCall = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    try { websocketRef.current?.close() } catch {}
    try { processorRef.current?.disconnect() } catch {}
    try { sourceRef.current?.disconnect() } catch {}
    try { audioContextRef.current?.close() } catch {}
    try { micStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch {}
    cleanupMultiplayer()
    onEnd(transcriptRef.current)
  }, [onEnd, cleanupMultiplayer])

  // ══════════════════════════════════════════════════════════════════════
  // SOLO MODE — unchanged, proven Gemini Live voice pipeline.
  // ══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (mode !== 'solo') return
    let cancelled = false

    const connectLive = async () => {
      try {
        const tokenResponse = await fetch('/api/gd-simulator/live-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId }),
        })
        const tokenData = await tokenResponse.json()
        if (!tokenResponse.ok || !tokenData.token) throw new Error(tokenData.error || 'Live token unavailable')
        if (cancelled) return

        const ws = new WebSocket(`${LIVE_WS}?access_token=${encodeURIComponent(tokenData.token)}`)
        ws.binaryType = 'arraybuffer'
        websocketRef.current = ws

        ws.onopen = () => {
          reconnectAttemptsRef.current = 0
          liveReadyRef.current = false
          setConnected(false)
          setStatus('Connecting GD Coach AI…')
          const systemInstruction = buildGDModeratorInstruction(mode, companyName, jobRole, topic, participants)
          ws.send(JSON.stringify({
            setup: {
              model: `models/${tokenData.model}`,
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
              },
              systemInstruction: { parts: [{ text: systemInstruction }] },
              inputAudioTranscription: { languageCodes: ['en-IN', 'en-US'], mode: 'SMART' },
              outputAudioTranscription: {},
              realtimeInputConfig: {
                automaticActivityDetection: {
                  disabled: false,
                  startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
                  endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
                  prefixPaddingMs: 160,
                  silenceDurationMs: 1400,
                },
                activityHandling: 'START_OF_ACTIVITY_INTERRUPTS',
                turnCoverage: 'TURN_INCLUDES_AUDIO_ACTIVITY_AND_ALL_VIDEO',
              },
            },
          }))
        }

        ws.onmessage = (event) => {
          try {
            const raw = typeof event.data === 'string' ? event.data : new TextDecoder('utf-8').decode(event.data as ArrayBuffer)
            const message = JSON.parse(raw)
            if (message.error) console.error('GD Live server error:', message.error)

            if (message.setupComplete) {
              liveReadyRef.current = true
              setConnected(true)
              setStatus('Live · GD Coach AI is welcoming everyone…')
              if (!startedConversationRef.current) {
                startedConversationRef.current = true
                const opening = `Start the GD session now by speaking first, exactly per your instructions: welcome ${userName} by name, mention the company (${companyName}) and role (${jobRole}), then ask if everyone is ready. Do not reveal the topic yet.`
                ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: opening }] }], turnComplete: true } }))
              }
            }
            if (message.goAway) { setStatus('Refreshing connection…'); return }

            const content = message.serverContent
            if (!content) return
            if (content.interrupted) { stopPlayback(); setStatus('Listening…') }
            if (content.inputTranscription?.text) {
              currentUserTextRef.current += ` ${String(content.inputTranscription.text)}`
              setUserSpeaking(true)
            }
            if (content.outputTranscription?.text) {
              currentAiTextRef.current += ` ${String(content.outputTranscription.text)}`
            }
            if (content.modelTurn?.parts) {
              setAiSpeaking(true)
              for (const part of content.modelTurn.parts) if (part.inlineData?.data) queuePcm(part.inlineData.data, part.inlineData.mimeType)
            }
            if (content.turnComplete) {
              const userText = currentUserTextRef.current.trim()
              const aiText = currentAiTextRef.current.trim()
              if (userText) addTranscript(userName, userText)
              if (aiText) addTranscript('GD Coach AI', aiText, /off.?topic/i.test(aiText))
              currentUserTextRef.current = ''
              currentAiTextRef.current = ''
              setUserSpeaking(false)
            }
          } catch (err) {
            console.error('GD Live message parse error:', err)
          }
        }

        ws.onerror = () => setStatus('Connection error — retrying…')
        ws.onclose = () => {
          setConnected(false)
          if (!finishedRef.current && reconnectAttemptsRef.current < 3) {
            reconnectAttemptsRef.current += 1
            setStatus('Reconnecting…')
            setTimeout(() => { if (!cancelled && !finishedRef.current) void connectLive() }, 1200)
          }
        }
      } catch (err) {
        console.error('GD connectLive failed:', err)
        setStatus('Could not connect to GD Coach AI. Please retry.')
      }
    }

    const setupAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        micStreamRef.current = stream

        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
        const audioContext = new AudioContextCtor()
        audioContextRef.current = audioContext
        const source = audioContext.createMediaStreamSource(stream)
        sourceRef.current = source

        const sendPcm = (input: Float32Array) => {
          const ws = websocketRef.current
          if (!ws || ws.readyState !== WebSocket.OPEN || !liveReadyRef.current || !micEnabledRef.current || finishedRef.current) return
          let sum = 0
          for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
          const rms = Math.sqrt(sum / Math.max(1, input.length))
          setAudioLevel(Math.min(100, Math.round(rms * 300)))
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
        void connectLive()
      } catch (error) {
        console.error('GD microphone pipeline failed:', error)
        setStatus('⚠️ Microphone permission denied — please allow mic access and retry.')
      }
    }

    void setupAudio()

    return () => {
      cancelled = true
      try { processorRef.current?.disconnect() } catch {}
      try { sourceRef.current?.disconnect() } catch {}
      try { audioContextRef.current?.close() } catch {}
      try { websocketRef.current?.close() } catch {}
      try { micStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // ══════════════════════════════════════════════════════════════════════
  // MULTIPLAYER MODE — real WebRTC voice mesh between humans, own-speech
  // transcription broadcast to keep everyone's transcript in sync, and
  // (host only) a text-turn-driven Gemini Live moderator whose voice is
  // relayed to every peer.
  // ══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (mode !== 'multiplayer' || !currentUserId || !roomMembers) return
    let cancelled = false
    const others = roomMembers.filter((m) => m.userId !== currentUserId)

    const sendSignal = async (toUserId: string, type: string, payload: unknown) => {
      try {
        await fetch(`/api/gd-simulator/rooms/${roomId}/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toUserId, type, payload }),
        })
      } catch {}
    }

    const broadcastText = async (speakerName: string, text: string) => {
      try {
        await fetch(`/api/gd-simulator/rooms/${roomId}/broadcast-text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ speakerName, text }),
        })
      } catch {}
    }

    const refreshPeerCount = () => {
      let n = 0
      peerConnectionsRef.current.forEach((pc) => { if (pc.connectionState === 'connected') n++ })
      setPeersConnected(n)
      if (n > 0) setConnected(true)
    }

    const createPeerConnection = (otherUserId: string, isInitiator: boolean) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      peerConnectionsRef.current.set(otherUserId, pc)

      const micStream = micStreamRef.current
      if (micStream) {
        micStream.getAudioTracks().forEach((track) => pc.addTrack(track, micStream))
        micStream.getVideoTracks().forEach((track) => pc.addTrack(track, micStream))
      }
      if (isHost && aiOutputDestRef.current) {
        aiOutputDestRef.current.stream.getAudioTracks().forEach((track) => pc.addTrack(track, aiOutputDestRef.current!.stream))
      }

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams
        if (!remoteStream) return
        const hadIt = remoteStreamsRef.current.has(otherUserId)
        remoteStreamsRef.current.set(otherUserId, remoteStream)
        if (!hadIt) setRemotePeerIds((prev) => (prev.includes(otherUserId) ? prev : [...prev, otherUserId]))
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) void sendSignal(otherUserId, 'ice-candidate', event.candidate.toJSON())
      }
      pc.onconnectionstatechange = () => {
        refreshPeerCount()
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          remoteStreamsRef.current.delete(otherUserId)
          setRemotePeerIds((prev) => prev.filter((id) => id !== otherUserId))
        }
      }

      if (isInitiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer).then(() => offer))
          .then((offer) => sendSignal(otherUserId, 'offer', offer))
          .catch((e) => console.warn('GD offer creation failed:', e))
      }

      return pc
    }

    const flushPendingIce = async (otherUserId: string, pc: RTCPeerConnection) => {
      const pending = pendingIceRef.current.get(otherUserId)
      if (!pending?.length) return
      pendingIceRef.current.delete(otherUserId)
      for (const c of pending) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch (e) { console.warn('GD addIceCandidate failed:', e) }
      }
    }

    const handleSignal = async (fromUserId: string, type: string, payload: any) => {
      let pc = peerConnectionsRef.current.get(fromUserId)
      if (type === 'offer') {
        if (!pc) pc = createPeerConnection(fromUserId, false)
        await pc.setRemoteDescription(new RTCSessionDescription(payload))
        await flushPendingIce(fromUserId, pc)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        void sendSignal(fromUserId, 'answer', answer)
      } else if (type === 'answer') {
        if (pc && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload))
          await flushPendingIce(fromUserId, pc)
        }
      } else if (type === 'ice-candidate') {
        if (pc?.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(payload)) } catch (e) { console.warn('GD addIceCandidate failed:', e) }
        } else {
          const list = pendingIceRef.current.get(fromUserId) || []
          list.push(payload)
          pendingIceRef.current.set(fromUserId, list)
        }
      }
    }

    // Host-only: a Gemini Live session driven entirely by TEXT turns (each
    // participant's own browser transcribes their own speech — see
    // startOwnSpeechRecognition below — so the moderator always knows who
    // actually said what, instead of trying to diarize one mixed audio feed).
    const connectHostModerator = async () => {
      try {
        const tokenResponse = await fetch('/api/gd-simulator/live-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId }),
        })
        const tokenData = await tokenResponse.json()
        if (!tokenResponse.ok || !tokenData.token) throw new Error(tokenData.error || 'Live token unavailable')
        if (cancelled) return

        const ws = new WebSocket(`${LIVE_WS}?access_token=${encodeURIComponent(tokenData.token)}`)
        ws.binaryType = 'arraybuffer'
        websocketRef.current = ws

        ws.onopen = () => {
          liveReadyRef.current = false
          setStatus('Connecting GD Coach AI…')
          const systemInstruction = buildGDModeratorInstruction(mode, companyName, jobRole, topic, participants)
          ws.send(JSON.stringify({
            setup: {
              model: `models/${tokenData.model}`,
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
              },
              systemInstruction: { parts: [{ text: systemInstruction }] },
              outputAudioTranscription: {},
              // No inputAudioTranscription / automaticActivityDetection here —
              // this session never receives raw audio, only text turns.
            },
          }))
        }

        ws.onmessage = (event) => {
          try {
            const raw = typeof event.data === 'string' ? event.data : new TextDecoder('utf-8').decode(event.data as ArrayBuffer)
            const message = JSON.parse(raw)
            if (message.error) console.error('GD Live server error (host moderator):', message.error)

            if (message.setupComplete) {
              liveReadyRef.current = true
              setStatus('Live · GD Coach AI is welcoming everyone…')
              if (!startedConversationRef.current) {
                startedConversationRef.current = true
                const allNames = roomMembers.map((m) => m.name).join(', ')
                const opening = `Start the GD session now by speaking first, exactly per your instructions: warmly welcome everyone in this room by name (participants: ${allNames}), mention the company (${companyName}) and role (${jobRole}), then ask if everyone is ready. Do not reveal the topic yet.`
                ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: opening }] }], turnComplete: true } }))
              }
            }

            const content = message.serverContent
            if (!content) return
            if (content.interrupted) stopPlayback()
            if (content.outputTranscription?.text) currentAiTextRef.current += ` ${String(content.outputTranscription.text)}`
            if (content.modelTurn?.parts) {
              for (const part of content.modelTurn.parts) if (part.inlineData?.data) queuePcm(part.inlineData.data, part.inlineData.mimeType)
            }
            if (content.turnComplete) {
              const aiText = currentAiTextRef.current.trim()
              currentAiTextRef.current = ''
              if (aiText) {
                const offTopic = /off.?topic/i.test(aiText)
                addTranscript('GD Coach AI', aiText, offTopic)
                void broadcastText('GD Coach AI', aiText)
              }
            }
          } catch (err) {
            console.error('GD host-moderator message parse error:', err)
          }
        }

        ws.onerror = () => setStatus('Moderator connection error…')
        ws.onclose = () => {
          if (!finishedRef.current) setStatus('Moderator disconnected — voice room between participants continues.')
        }
      } catch (err) {
        console.error('GD host moderator connect failed:', err)
        setStatus('Could not connect GD Coach AI as moderator — voice room continues without it.')
      }
    }

    const sendTextTurnToGemini = (speakerName: string, text: string) => {
      const ws = websocketRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN || !liveReadyRef.current) return
      const turnText = speakerName === 'SYSTEM' ? text : `${speakerName} says: ${text}`
      try {
        ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: turnText }] }], turnComplete: true } }))
      } catch {}
    }

    const startOwnSpeechRecognition = () => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        setStatus((s) => `${s} (Note: your browser can't transcribe your speech for the AI moderator — use Chrome/Edge. Your voice is still heard live by everyone.)`)
        return
      }
      const rec = new SpeechRecognition()
      rec.continuous = true
      rec.interimResults = false
      rec.lang = 'en-IN'
      rec.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (!event.results[i].isFinal) continue
          const text = String(event.results[i][0].transcript || '').trim()
          if (text.length < 3 || !micEnabledRef.current) continue
          setUserSpeaking(true)
          addTranscript(userName, text)
          void broadcastText(userName, text)
          if (isHost) sendTextTurnToGemini(userName, text)
          setTimeout(() => setUserSpeaking(false), 800)
        }
      }
      rec.onerror = (err: any) => {
        if (err.error === 'not-allowed' || err.error === 'service-not-allowed') setStatus('⚠️ Microphone permission blocked.')
      }
      rec.onend = () => { if (!finishedRef.current) { try { rec.start() } catch {} } }
      speechRecRef.current = rec
      try { rec.start() } catch {}
    }

    const init = async () => {
      try {
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
          })
        } catch (videoErr) {
          console.warn('GD camera unavailable, continuing audio-only:', videoErr)
          stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
          setStatus((s) => `${s} (camera unavailable — joined with voice only)`)
        }
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        micStreamRef.current = stream
        if (localVideoElRef.current) localVideoElRef.current.srcObject = stream

        if (isHost) {
          if (!outputContextRef.current) outputContextRef.current = new AudioContext()
          aiOutputDestRef.current = outputContextRef.current.createMediaStreamDestination()
          void connectHostModerator()
        }

        for (const member of others) {
          const isInitiator = currentUserId < member.userId
          createPeerConnection(member.userId, isInitiator)
        }

        const es = new EventSource('/api/gd-simulator/events')
        signalEventSourceRef.current = es
        es.addEventListener('gd-signal', (e) => {
          try {
            const data = JSON.parse((e as MessageEvent).data)
            if (data.roomId === roomId) void handleSignal(data.fromUserId, data.type, data.payload)
          } catch {}
        })
        es.addEventListener('gd-transcript-line', (e) => {
          try {
            const data = JSON.parse((e as MessageEvent).data)
            if (data.roomId !== roomId) return
            const offTopic = /off.?topic/i.test(data.text)
            addTranscript(data.speakerName, data.text, offTopic)
            if (data.speakerName === 'GD Coach AI') pulseAiSpeaking()
            else if (isHost) sendTextTurnToGemini(data.speakerName, data.text)
          } catch {}
        })
        // Someone accepted an invite AFTER the GD was already live — connect to
        // them immediately, and (host only) have the AI pause to welcome them
        // with a quick catch-up before continuing.
        es.addEventListener('gd-member-joined', (e) => {
          try {
            const data = JSON.parse((e as MessageEvent).data)
            if (data.roomId !== roomId || !data.member?.userId) return
            const newUserId = data.member.userId as string
            if (newUserId === currentUserId || peerConnectionsRef.current.has(newUserId)) return
            const isInitiator = currentUserId < newUserId
            createPeerConnection(newUserId, isInitiator)
            if (isHost) {
              const recap = transcriptRef.current.slice(-8).map((t) => `${t.speaker}: ${t.text}`).join('\n') || 'The discussion has just begun.'
              sendTextTurnToGemini(
                'SYSTEM',
                `${data.member.name} has just joined the discussion mid-way. Pause briefly, warmly welcome them by name, give a 2-3 sentence recap of what's been discussed so far using this recent context, then continue the discussion and give them a chance to speak too.\n\nRecent context:\n${recap}`,
              )
            }
          } catch {}
        })

        startOwnSpeechRecognition()
        setStatus('Live · Voice room connected')
        setConnected(true)
      } catch (error) {
        console.error('GD multiplayer setup failed:', error)
        setStatus('⚠️ Microphone permission denied — please allow mic access and retry.')
      }
    }

    void init()

    return () => {
      cancelled = true
      cleanupMultiplayer()
      try { websocketRef.current?.close() } catch {}
      try { outputContextRef.current?.close() } catch {}
      try { micStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const toggleMic = () => {
    micEnabledRef.current = !micEnabled
    setMicEnabled((v) => !v)
    micStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !micEnabled })
  }

  const minutes = String(Math.floor(callDuration / 60)).padStart(2, '0')
  const seconds = String(callDuration % 60).padStart(2, '0')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="glass flex items-center justify-between rounded-2xl px-5 py-3">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
          <Wifi className={`size-4 ${connected ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`} />
          {status}
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          {mode === 'multiplayer' && (
            <span className="flex items-center gap-1">
              <Users className="size-3.5" /> {peersConnected}/{(roomMembers?.length || 1) - 1} peers
            </span>
          )}
          <span className="flex items-center gap-1"><Radio className="size-3.5" /> {minutes}:{seconds}</span>
        </div>
      </div>

      {mode === 'solo' ? (
        <div className="glass flex flex-col items-center gap-4 rounded-3xl p-8 text-center">
          <AIGDAvatar speaking={aiSpeaking} />
          <div>
            <p className="text-sm font-bold text-white">GD Coach AI</p>
            <p className="text-xs text-slate-400">{jobRole} · {companyName} · Topic: {topic}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users className="size-3.5" /> {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </div>
        </div>
      ) : (
        <div className="glass rounded-3xl p-4">
          <p className="mb-3 px-1 text-xs text-slate-400">
            {jobRole} · {companyName} · Topic: {topic}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {/* AI moderator tile */}
            <div className="relative flex aspect-video flex-col items-center justify-center gap-2 rounded-2xl bg-slate-900/70">
              <AIGDAvatar speaking={aiSpeaking} />
              <span className="absolute bottom-1.5 left-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">GD Coach AI</span>
            </div>
            {/* Self tile */}
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900/70">
              <video ref={localVideoElRef} autoPlay playsInline muted className="size-full object-cover" />
              <span className="absolute bottom-1.5 left-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">You ({userName})</span>
              {!micEnabled && <MicOff className="absolute right-2 top-2 size-4 text-rose-400" />}
            </div>
            {/* Remote peer tiles */}
            {remotePeerIds.map((peerId) => {
              const peerName = roomMembers?.find((m) => m.userId === peerId)?.name || 'Participant'
              return (
                <div key={peerId} className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900/70">
                  <video
                    autoPlay
                    playsInline
                    ref={(el) => { if (el) el.srcObject = remoteStreamsRef.current.get(peerId) || null }}
                    className="size-full object-cover"
                  />
                  <span className="absolute bottom-1.5 left-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">{peerName}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="glass max-h-64 overflow-y-auto rounded-2xl p-4 text-left text-xs">
        {liveTranscript.length === 0 && <p className="text-slate-500">Transcript will appear here as the discussion starts…</p>}
        {liveTranscript.map((entry, i) => (
          <p key={i} className={`mb-2 ${entry.offTopic ? 'text-amber-400' : 'text-slate-300'}`}>
            <span className="font-semibold">{entry.speaker}:</span> {entry.text}
          </p>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={toggleMic}
          className={`flex size-12 items-center justify-center rounded-full transition-colors ${micEnabled ? 'bg-slate-700 text-white' : 'bg-rose-500/20 text-rose-400'}`}
          style={micEnabled && userSpeaking ? { boxShadow: `0 0 ${Math.max(6, audioLevel / 2)}px rgba(34,211,238,0.6)` } : undefined}
        >
          {micEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
        </button>
        <button
          onClick={handleEndCall}
          className="flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105"
        >
          <PhoneOff className="size-4" /> End GD
        </button>
      </div>
    </div>
  )
}
