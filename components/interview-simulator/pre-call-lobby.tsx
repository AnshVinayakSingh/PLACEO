'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Mic, MicOff, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react'

interface PreCallLobbyProps {
  track: string
  level: number
  questionCount: number
  onJoinCall: (stream: MediaStream) => void
  onCancel: () => void
}

export function PreCallLobby({ track, level, questionCount, onJoinCall, onCancel }: PreCallLobbyProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [micEnabled, setMicEnabled] = useState(true)
  const [micVolume, setMicVolume] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isRequesting, setIsRequesting] = useState(true)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const animFrameRef = useRef<number | null>(null)

  const requestMedia = async () => {
    setIsRequesting(true)
    setError(null)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play().catch(() => {})
      }

      // Mic volume visualizer loop
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const analyser = audioContext.createAnalyser()
        const source = audioContext.createMediaStreamSource(mediaStream)
        source.connect(analyser)
        analyser.fftSize = 64
        const data = new Uint8Array(analyser.frequencyBinCount)

        const checkVolume = () => {
          analyser.getByteFrequencyData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) sum += data[i]
          const avg = sum / data.length
          setMicVolume(Math.min(100, Math.round((avg / 128) * 100)))
          animFrameRef.current = requestAnimationFrame(checkVolume)
        }
        checkVolume()
      } catch (e) {
        console.warn('AudioContext check error:', e)
      }
    } catch (err: any) {
      console.error('Camera / Mic permission denied:', err)
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera or Microphone permission was denied. Please allow camera and mic permissions in your browser URL bar.'
          : 'Could not access your camera or microphone. Please check your hardware connections.'
      )
    } finally {
      setIsRequesting(false)
    }
  }

  useEffect(() => {
    requestMedia()
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach((track) => (track.enabled = !cameraEnabled))
      setCameraEnabled(!cameraEnabled)
    }
  }

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach((track) => (track.enabled = !micEnabled))
      setMicEnabled(!micEnabled)
    }
  }

  const handleJoin = async () => {
    if (!stream) return
    try {
      await document.documentElement.requestFullscreen?.()
    } catch {
      // Fullscreen can be denied by browser policy; the call room will log the exit.
    }
    onJoinCall(stream)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 mb-2">
            <ShieldCheck className="size-3.5" />
            <span>Pre-Interview Hardware Verification</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Check Your Camera & Microphone
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            The interviewer will generate the conversation live. You can interrupt, ask questions, clarify requirements, and answer naturally.
          </p>
        </div>

        {/* Video Preview & Call Controls */}
        <div className="relative mx-auto aspect-video max-w-2xl overflow-hidden rounded-3xl border-2 border-white/15 bg-slate-900 shadow-2xl">
          {stream && cameraEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover -scale-x-100"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-400">
              <CameraOff className="size-16 stroke-1 text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-300">Camera is turned off or not permitted</p>
              {error && <p className="mt-2 text-xs text-rose-400 max-w-md">{error}</p>}
            </div>
          )}

          {/* HUD Overlay Bar */}
          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl bg-slate-950/80 px-4 py-2.5 backdrop-blur-md border border-white/10">
            {/* Mic Meter */}
            <div className="flex items-center gap-2">
              <Mic className={`size-4 ${micVolume > 10 ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              <div className="h-2 w-24 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{ width: `${micVolume}%` }}
                ></div>
              </div>
              <span className="text-[10px] font-mono text-slate-300">
                {micVolume > 10 ? 'Speaking...' : 'Mic Ready'}
              </span>
            </div>

            {/* In-Lobby Toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMic}
                type="button"
                className={`flex size-9 items-center justify-center rounded-xl border transition-all ${
                  micEnabled ? 'border-white/10 bg-white/10 text-white' : 'border-rose-500/30 bg-rose-500/20 text-rose-400'
                }`}
              >
                {micEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
              </button>

              <button
                onClick={toggleCamera}
                type="button"
                className={`flex size-9 items-center justify-center rounded-xl border transition-all ${
                  cameraEnabled ? 'border-white/10 bg-white/10 text-white' : 'border-rose-500/30 bg-rose-500/20 text-rose-400'
                }`}
              >
                {cameraEnabled ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Retry button if permission failed */}
        {error && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={requestMedia}
              className="rounded-xl border border-brand-cyan/40 bg-brand-cyan/10 px-4 py-2 text-xs font-semibold text-brand-cyan hover:bg-brand-cyan/20"
            >
              Retry Camera & Mic Permission
            </button>
          </div>
        )}

        {/* Meeting Info & Action Buttons */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <div className="text-left">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white capitalize">{track} Interview · Level {level}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{questionCount} adaptive turns · Live voice AI · Integrity monitoring</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold text-slate-400 hover:bg-white/10 hover:text-white"
            >
              Back to Setup
            </button>

            <button
              onClick={handleJoin}
              disabled={!stream}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-7 py-3 text-sm font-bold text-slate-950 shadow-xl shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <span>Join Interview Call</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
