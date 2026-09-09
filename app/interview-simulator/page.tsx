'use client'

import { useState } from 'react'
import { PageShell } from '@/components/dashboard/page-shell'
import { InterviewSetupWizard, SetupConfig } from '@/components/interview-simulator/interview-setup-wizard'
import { PreCallLobby } from '@/components/interview-simulator/pre-call-lobby'
import { InterviewCallRoom, QuestionItem, CandidateAnswer } from '@/components/interview-simulator/interview-call-room'
import { InterviewReportCard, EvaluationResult } from '@/components/interview-simulator/interview-report-card'
import { ShieldAlert, RotateCcw, Brain, CheckCircle2 } from 'lucide-react'

export default function InterviewSimulatorPage() {
  const [view, setView] = useState<'setup' | 'lobby' | 'call' | 'evaluating' | 'evaluation-error' | 'report' | 'disqualified'>('setup')
  const [isLoading, setIsLoading] = useState(false)
  const [setupConfig, setSetupConfig] = useState<SetupConfig>({
    track: 'hr',
    jobDescription: '',
    resumeText: '',
    level: 2,
    questionCount: 10,
    persona: 'priya',
  })
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [activeMediaStream, setActiveMediaStream] = useState<MediaStream | null>(null)
  const [evaluationReport, setEvaluationReport] = useState<EvaluationResult | null>(null)
  const [disqualificationReason, setDisqualificationReason] = useState<string>('')
  const [pendingAnswers, setPendingAnswers] = useState<CandidateAnswer[]>([])
  const [pendingViolations, setPendingViolations] = useState(0)

  // 1. Create a short-lived server-side interview session. Gemini Live generates the conversation.
  const handleStartSetup = async (config: SetupConfig) => {
    setIsLoading(true)
    setSetupConfig(config)

    try {
      const sessionRes = await fetch('/api/interview-simulator/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const sessionData = await sessionRes.json()
      if (!sessionRes.ok || !sessionData.success) throw new Error(sessionData.error || 'Secure interview session could not be created.')

      // The Live API is now the interview planner. No fixed/pre-generated question
      // list is created here; the real-time interviewer generates every turn from
      // the live conversation, resume, JD, track and difficulty.
      setQuestions([])
      setView('lobby')
    } catch (err) {
      console.error('Failed to create secure interview session:', err)
      alert('Network or server error while starting the interview.')
    } finally {
      setIsLoading(false)
    }
  }

  // 2. From Lobby -> Join Call
  const handleJoinCall = (stream: MediaStream) => {
    setActiveMediaStream(stream)
    setView('call')
  }

  const finalizeSecureSession = async (status: 'completed' | 'disqualified', answers: CandidateAnswer[], violations: number, finalScore?: number) => {
    try {
      await fetch('/api/interview-simulator/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          strikeCount: violations,
          finalScore,
          durationSeconds: answers.reduce((sum, answer) => sum + Math.max(0, Number(answer.timeTakenSeconds || 0)), 0),
          transcript: answers.flatMap((answer) => [
            { role: 'interviewer', text: answer.question, at: Date.now() },
            { role: 'candidate', text: answer.userTranscript, at: Date.now() },
          ]),
        }),
      })
    } catch (error) {
      console.warn('Secure interview finalization failed:', error)
    }
  }

  // 3. From Call -> Finish Interview -> Evaluate Strictly
  const handleFinishInterview = async (answers: CandidateAnswer[], violations: number) => {
    setView('evaluating')
    setPendingAnswers(answers)
    setPendingViolations(violations)
    await runEvaluation(answers, violations)
  }

  const runEvaluation = async (answers: CandidateAnswer[], violations: number) => {
    try {
      const res = await fetch('/api/interview-simulator/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track: setupConfig.track,
          level: setupConfig.level,
          violationsCount: violations,
          qaList: answers,
        }),
      })

      const reportData = await res.json()
      if (res.ok && reportData.success) {
        setEvaluationReport(reportData)
        await finalizeSecureSession('completed', answers, violations, Number(reportData.overallScore || 0))
        setView('report')
        return
      }
      throw new Error(reportData.error || 'Evaluation failed')
    } catch (err) {
      console.error('Evaluation API error:', err)
      // Never fabricate a score client-side (that was the exact source of the
      // "0 answers but 72% shown" bug). Show a real error and let them retry
      // the same evaluation call instead of inventing a number.
      setView('evaluation-error')
    }
  }

  // 4. Disqualified on Strike 2
  const handleDisqualify = async (reason: string, answers: CandidateAnswer[]) => {
    setDisqualificationReason(reason)
    await finalizeSecureSession('disqualified', answers, 2, 0)
    setView('disqualified')
  }

  return (
    <PageShell
      title="AI Human Interview Simulator"
      description="Interactive video interview call with animated AI recruiter, hands-free voice answering, and strict placement evaluation."
    >
      {/* 1. Setup Wizard */}
      {view === 'setup' && (
        <InterviewSetupWizard onStart={handleStartSetup} isLoading={isLoading} />
      )}

      {/* 2. Pre-Call Lobby Device Check */}
      {view === 'lobby' && (
        <PreCallLobby
          track={setupConfig.track}
          level={setupConfig.level}
          questionCount={setupConfig.questionCount}
          onJoinCall={handleJoinCall}
          onCancel={() => setView('setup')}
        />
      )}

      {/* 3. Live Interview Call Room */}
      {view === 'call' && activeMediaStream && (
        <InterviewCallRoom
          stream={activeMediaStream}
          questions={questions}
          track={setupConfig.track}
          level={setupConfig.level}
          persona={setupConfig.persona}
          questionCount={setupConfig.questionCount}
          jobDescription={setupConfig.jobDescription}
          resumeText={setupConfig.resumeText}
          onFinishInterview={handleFinishInterview}
          onDisqualify={handleDisqualify}
        />
      )}

      {/* 4. Strict Evaluating Loader */}
      {view === 'evaluating' && (
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-950/80 p-10 text-center backdrop-blur-xl shadow-2xl">
          <div className="relative flex size-20 items-center justify-center rounded-2xl bg-brand-blue/20 text-brand-cyan border border-brand-blue/30 shadow-inner mb-6">
            <Brain className="size-10 animate-pulse" />
          </div>

          <h2 className="font-display text-xl font-bold text-white">
            Strictly Evaluating Your Call Performance
          </h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Evaluating actual transcripts against real tech placement criteria (0 marks for unanswered questions):
          </p>

          <div className="mt-6 w-full space-y-3 text-left">
            <div className="flex items-center gap-2.5 text-xs text-brand-cyan">
              <CheckCircle2 className="size-4 shrink-0 text-brand-cyan animate-spin" />
              <span>Checking technical accuracy and logic substance...</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-purple-400">
              <CheckCircle2 className="size-4 shrink-0 text-purple-400 animate-spin" />
              <span>Verifying vocabulary, articulation, and coherence...</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400 animate-spin" />
              <span>Calculating genuine on-campus selection probability...</span>
            </div>
          </div>
        </div>
      )}

      {/* 4b. Evaluation Failed — retry instead of ever showing a fabricated score */}
      {view === 'evaluation-error' && (
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-3xl border border-rose-500/30 bg-slate-950/80 p-10 text-center backdrop-blur-xl shadow-2xl">
          <div className="relative flex size-16 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-inner mb-5">
            <ShieldAlert className="size-8" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">Couldn't Reach the Evaluator</h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Your interview answers are safely recorded, but we couldn't get a strict evaluation back from the server just now. No score is shown because we never invent one — please retry.
          </p>
          <button
            onClick={() => {
              setView('evaluating')
              runEvaluation(pendingAnswers, pendingViolations)
            }}
            className="mt-6 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95"
          >
            <RotateCcw className="size-4" />
            <span>Retry Evaluation</span>
          </button>
        </div>
      )}

      {/* 5. Report Card */}
      {view === 'report' && evaluationReport && (
        <InterviewReportCard
          report={evaluationReport}
          track={setupConfig.track}
          level={setupConfig.level}
          onRetake={() => setView('setup')}
        />
      )}

      {/* 6. Disqualified Screen */}
      {view === 'disqualified' && (
        <div className="mx-auto max-w-xl rounded-3xl border-2 border-rose-500 bg-gradient-to-b from-rose-950/90 via-slate-950 to-black p-8 text-center backdrop-blur-xl shadow-2xl animate-in zoom-in-95">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-inner mb-5">
            <ShieldAlert className="size-8 animate-bounce" />
          </div>

          <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-400 border border-rose-500/30 uppercase tracking-wider">
            INTERVIEW CALL DISCONNECTED
          </span>

          <h2 className="mt-4 font-display text-2xl font-bold text-white">
            Disqualified by Proctor AI
          </h2>

          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200 text-left leading-relaxed">
            <p className="font-bold mb-1">Disqualification Log:</p>
            <p>
              {disqualificationReason || 'Candidate repeatedly looked away from camera or tilted down towards external devices/notes after receiving Strike 1 warning.'}
            </p>
          </div>

          <div className="mt-4 rounded-xl bg-white/5 p-3 text-xs text-slate-300">
            Overall Score Awarded: <b className="text-rose-400 font-mono">0 / 100</b> · Placement Selection Chance: <b className="text-rose-400 font-mono">0%</b>
          </div>

          <p className="mt-4 text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            In corporate placements, failing proctoring integrity results in immediate rejection. Keep your gaze centered on the webcam throughout your next session.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setView('setup')}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <RotateCcw className="size-4" />
              <span>Retry New Call (Follow Proctor Rules)</span>
            </button>
          </div>
        </div>
      )}
    </PageShell>
  )
}
