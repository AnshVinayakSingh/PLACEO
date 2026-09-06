'use client'

import { useState, useCallback } from 'react'
import { PageShell } from '@/components/dashboard/page-shell'
import { InterviewSetupWizard, SetupConfig } from '@/components/interview-simulator/interview-setup-wizard'
import { AiInterviewerCharacter } from '@/components/interview-simulator/ai-interviewer-character'
import { CandidateProctorView } from '@/components/interview-simulator/candidate-proctor-view'
import { InterviewReportCard, EvaluationResult } from '@/components/interview-simulator/interview-report-card'
import { ShieldAlert, AlertTriangle, RotateCcw, Brain, CheckCircle2, XCircle } from 'lucide-react'

interface QuestionItem {
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

interface RecordedAnswer {
  questionId: string
  question: string
  userTranscript: string
  timeTakenSeconds: number
  expectedKeyPoints?: string[]
  modelAnswer?: string
  skill?: string
  roundName?: string
}

export default function InterviewSimulatorPage() {
  const [view, setView] = useState<'setup' | 'interview' | 'evaluating' | 'report' | 'terminated'>('setup')
  const [isLoading, setIsLoading] = useState(false)
  const [setupConfig, setSetupConfig] = useState<SetupConfig>({
    track: 'hr',
    jobDescription: '',
    resumeText: '',
    level: 2,
    questionCount: 10,
  })
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [recordedAnswers, setRecordedAnswers] = useState<RecordedAnswer[]>([])
  const [proctorViolations, setProctorViolations] = useState(0)
  const [terminationReason, setTerminationReason] = useState('')
  const [evaluationReport, setEvaluationReport] = useState<EvaluationResult | null>(null)
  const [isCandidateSpeaking, setIsCandidateSpeaking] = useState(false)

  // Start interview from setup wizard
  const handleStartInterview = async (config: SetupConfig) => {
    setIsLoading(true)
    setSetupConfig(config)
    setRecordedAnswers([])
    setProctorViolations(0)
    setCurrentIndex(0)

    try {
      const res = await fetch('/api/interview-simulator/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      const data = await res.json()
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions)
        setView('interview')
      } else {
        alert('Could not generate questions. Please check your inputs.')
      }
    } catch (err) {
      console.error('Failed to generate questions:', err)
      alert('Network or server error while generating questions.')
    } finally {
      setIsLoading(false)
    }
  }

  // Answer submitted by candidate
  const handleSubmitAnswer = async (transcript: string, timeSpentSeconds: number) => {
    const currentQ = questions[currentIndex]
    const updatedAnswers = [
      ...recordedAnswers,
      {
        questionId: currentQ.id,
        question: currentQ.question,
        userTranscript: transcript,
        timeTakenSeconds: timeSpentSeconds,
        expectedKeyPoints: currentQ.expectedKeyPoints,
        modelAnswer: currentQ.modelAnswer,
        skill: currentQ.skill,
        roundName: currentQ.roundName,
      },
    ]
    setRecordedAnswers(updatedAnswers)

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      // Completed all questions -> Evaluate
      await triggerEvaluation(updatedAnswers, proctorViolations)
    }
  }

  // Skip question
  const handleSkipQuestion = async () => {
    const currentQ = questions[currentIndex]
    const updatedAnswers = [
      ...recordedAnswers,
      {
        questionId: currentQ.id,
        question: currentQ.question,
        userTranscript: '[Skipped by candidate]',
        timeTakenSeconds: 5,
        expectedKeyPoints: currentQ.expectedKeyPoints,
        modelAnswer: currentQ.modelAnswer,
        skill: currentQ.skill,
        roundName: currentQ.roundName,
      },
    ]
    setRecordedAnswers(updatedAnswers)

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      await triggerEvaluation(updatedAnswers, proctorViolations)
    }
  }

  // Proctor violation handler
  const handleProctorViolation = (count: number, reason: string) => {
    setProctorViolations(count)
  }

  // Proctor termination (Strike 2)
  const handleProctorDisconnect = (reason: string) => {
    setTerminationReason(reason)
    setView('terminated')
  }

  // Trigger evaluation API
  const triggerEvaluation = async (answers: RecordedAnswer[], violations: number) => {
    setView('evaluating')
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
      if (reportData.success) {
        setEvaluationReport(reportData)
        setView('report')
      } else {
        alert('Could not complete evaluation. Returning to setup.')
        setView('setup')
      }
    } catch (err) {
      console.error('Evaluation failed:', err)
      alert('Error during evaluation. Returning to setup.')
      setView('setup')
    }
  }

  const currentQ = questions[currentIndex]

  return (
    <PageShell
      title="AI Human Interview Simulator"
      description="Practice realistic, voice-based interviews with animated AI interviewer, strict proctoring, and instant placement feedback."
    >
      {view === 'setup' && (
        <InterviewSetupWizard onStart={handleStartInterview} isLoading={isLoading} />
      )}

      {view === 'interview' && currentQ && (
        <div className="space-y-4">
          {/* Top Control Bar */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 px-5 py-2.5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="flex size-2 rounded-full bg-rose-500 animate-ping"></span>
              <span className="text-xs font-semibold text-white">INTERVIEW IN PROGRESS</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-400 capitalize">{setupConfig.track} Track</span>
            </div>

            <button
              onClick={() => {
                if (confirm('Are you sure you want to end this interview early and generate a report?')) {
                  triggerEvaluation(recordedAnswers, proctorViolations)
                }
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 transition-all"
            >
              End Interview Early
            </button>
          </div>

          {/* Split Screen Container */}
          <div className="grid h-[calc(100vh-210px)] min-h-[580px] gap-4 lg:grid-cols-2">
            {/* Left: AI Interviewer Character with Lip-Sync & Corporate Desk */}
            <AiInterviewerCharacter
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              questionText={currentQ.question}
              track={setupConfig.track}
              roundName={currentQ.roundName}
              skill={currentQ.skill}
              level={setupConfig.level}
              isCandidateSpeaking={isCandidateSpeaking}
              isEvaluating={false}
            />

            {/* Right: Candidate Live Webcam & Anti-Cheat Proctor */}
            <CandidateProctorView
              timeLimitSeconds={currentQ.timeLimitSeconds}
              isCandidateTurn={true}
              currentQuestionId={currentQ.id}
              onSubmitAnswer={handleSubmitAnswer}
              onSkipQuestion={handleSkipQuestion}
              onProctorViolation={handleProctorViolation}
              onProctorDisconnect={handleProctorDisconnect}
              onSpeakingStateChange={setIsCandidateSpeaking}
            />
          </div>
        </div>
      )}

      {/* Evaluating State Loader */}
      {view === 'evaluating' && (
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-950/80 p-10 text-center backdrop-blur-xl shadow-2xl">
          <div className="relative flex size-20 items-center justify-center rounded-2xl bg-brand-blue/20 text-brand-cyan border border-brand-blue/30 shadow-inner mb-6">
            <Brain className="size-10 animate-pulse" />
          </div>

          <h2 className="font-display text-xl font-bold text-white">
            Analyzing Your Placement Readiness
          </h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Strictly evaluating your answers against campus placement benchmarks:
          </p>

          <div className="mt-6 w-full space-y-3 text-left">
            <div className="flex items-center gap-2.5 text-xs text-brand-cyan">
              <CheckCircle2 className="size-4 shrink-0 text-brand-cyan animate-spin" />
              <span>Verifying technical accuracy & domain logic...</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-purple-400">
              <CheckCircle2 className="size-4 shrink-0 text-purple-400 animate-spin" />
              <span>Measuring vocabulary, pacing, & articulation...</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400 animate-spin" />
              <span>Calculating selection probability boost (+%)...</span>
            </div>
          </div>
        </div>
      )}

      {/* Report Card */}
      {view === 'report' && evaluationReport && (
        <InterviewReportCard
          report={evaluationReport}
          track={setupConfig.track}
          level={setupConfig.level}
          onRetake={() => setView('setup')}
        />
      )}

      {/* Proctor Disconnected / Terminated State */}
      {view === 'terminated' && (
        <div className="mx-auto max-w-xl rounded-3xl border-2 border-rose-500 bg-gradient-to-b from-rose-950/80 via-slate-950 to-black p-8 text-center backdrop-blur-xl shadow-2xl animate-in zoom-in-95">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-inner mb-5">
            <ShieldAlert className="size-8 animate-bounce" />
          </div>

          <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-400 border border-rose-500/30 uppercase tracking-wider">
            SESSION TERMINATED BY PROCTOR
          </span>

          <h2 className="mt-4 font-display text-2xl font-bold text-white">
            Interview Disqualified
          </h2>

          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200 text-left leading-relaxed">
            <p className="font-bold mb-1">Violation Log:</p>
            <p>
              {terminationReason || 'Multiple camera focus infractions detected (candidate repeatedly looked away from screen or tilted down towards mobile device/notes).'}
            </p>
          </div>

          <p className="mt-4 text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            In campus placements and corporate technical screenings, repeated loss of eye contact triggers immediate integrity flags. Maintain direct eye contact with the camera throughout the mock session.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setView('setup')}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <RotateCcw className="size-4" />
              <span>Retry Interview (Follow Proctor Rules)</span>
            </button>
          </div>
        </div>
      )}
    </PageShell>
  )
}
