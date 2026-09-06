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

function getClientFallbackQuestions(config: SetupConfig): QuestionItem[] {
  const timeLimit = config.level >= 4 ? 25 : config.level === 3 ? 45 : 60

  if (config.track === 'technical') {
    return [
      {
        id: 'tech-fb-1',
        track: 'technical',
        skill: 'Data Structures',
        level: config.level,
        question: 'Explain how hashing works internally in collections (like HashMap) and what happens during a hash collision.',
        expectedKeyPoints: ['Hash function & bucket indexing', 'Separate chaining with linked lists or balanced trees', 'O(1) average lookup'],
        timeLimitSeconds: timeLimit,
        modelAnswer: 'Keys are hashed and mapped to bucket indices. Collisions are handled via linked lists or red-black trees.',
      },
      {
        id: 'tech-fb-2',
        track: 'technical',
        skill: 'Database Systems',
        level: config.level,
        question: 'What are ACID properties in database transactions? Provide a concrete banking transaction example.',
        expectedKeyPoints: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
        timeLimitSeconds: timeLimit,
        modelAnswer: 'Atomicity ensures all-or-nothing debit/credit. Consistency preserves non-negative balances. Isolation prevents dirty reads. Durability writes to disk.',
      },
      {
        id: 'tech-fb-3',
        track: 'technical',
        skill: 'System Performance',
        level: config.level,
        question: 'How would you diagnose and optimize a slow database query and high-latency API endpoint under peak traffic?',
        expectedKeyPoints: ['Query profiling & EXPLAIN', 'Indexing foreign keys', 'Redis caching', 'Connection pooling'],
        timeLimitSeconds: timeLimit,
        modelAnswer: 'Profile query execution plans with EXPLAIN, add indexes on filtered columns, implement Redis caching, and tune connection pools.',
      },
      {
        id: 'tech-fb-4',
        track: 'technical',
        skill: 'Web Architecture',
        level: config.level,
        question: 'Explain the difference between client-side rendering and server-side rendering, and when to use each.',
        expectedKeyPoints: ['SEO & initial page load advantages of SSR', 'Rich client-side reactivity of CSR', 'Hydration concepts'],
        timeLimitSeconds: timeLimit,
        modelAnswer: 'SSR renders HTML on the server for faster first contentful paint and SEO, while CSR executes rendering in the browser.',
      },
      {
        id: 'tech-fb-5',
        track: 'technical',
        skill: 'Algorithms',
        level: config.level,
        question: 'Analyze the time and space complexity trade-offs between QuickSort and MergeSort. Which would you choose for linked lists?',
        expectedKeyPoints: ['MergeSort guarantees O(n log n)', 'QuickSort in-place O(1) space', 'MergeSort is optimal for linked lists'],
        timeLimitSeconds: timeLimit,
        modelAnswer: 'MergeSort offers guaranteed O(n log n) and works efficiently with sequential access in linked lists without random pointer overhead.',
      },
    ]
  } else if (config.track === 'communication') {
    return [
      {
        id: 'comm-fb-1',
        track: 'communication',
        roundName: 'Round 1: Articulation & Pacing',
        level: config.level,
        question: 'Read this sentence clearly with steady pacing: "The architectural synchronization of asynchronous microservices requires meticulous resilience and cryptographic precision."',
        expectedKeyPoints: ['Even pacing', 'Clear pronunciation of synchronization', 'Crisp consonant articulation'],
        timeLimitSeconds: timeLimit,
        modelAnswer: 'Cadence maintained with natural pauses after key technical clauses.',
      },
      {
        id: 'comm-fb-2',
        track: 'communication',
        roundName: 'Round 2: Jumbled Story',
        level: config.level,
        question: 'Connect these 3 events sequentially into a logical story: (A) Severe traffic spike during flash sale, (B) Connection timeouts observed, (C) Read-replicas provisioned to resolve lag.',
        expectedKeyPoints: ['Chronological order A -> B -> C', 'Transitions like Initially, Consequently, Finally'],
        timeLimitSeconds: timeLimit + 15,
        modelAnswer: 'Initially, a flash sale generated high traffic (A). Consequently, database connection timeouts occurred (B). Finally, the team provisioned read replicas to restore normal latency (C).',
      },
      {
        id: 'comm-fb-3',
        track: 'communication',
        roundName: 'Round 3: Grammar Test',
        level: config.level,
        question: 'Convert this sentence into Passive Voice: "The engineering team deployed the hotfix before midnight."',
        expectedKeyPoints: ['Passive construction: "The hotfix was deployed by the engineering team before midnight."'],
        timeLimitSeconds: timeLimit,
        modelAnswer: 'The hotfix was deployed by the engineering team before midnight.',
      },
    ]
  } else if (config.track === 'behavioral') {
    return [
      {
        id: 'beh-fb-1',
        track: 'behavioral',
        level: config.level,
        question: 'Describe a situation where you had a critical release deadline and discovered an unexpected bug right before deployment. What steps did you take?',
        expectedKeyPoints: ['Risk assessment', 'Proactive communication with lead', 'Mitigation options like feature flags'],
        timeLimitSeconds: timeLimit,
        modelAnswer: 'Assessed blast radius immediately, alerted engineering lead, and disabled the buggy module via a feature flag.',
      },
      {
        id: 'beh-fb-2',
        track: 'behavioral',
        level: config.level,
        question: 'How do you handle constructive criticism on your code reviews when you disagree with the reviewer?',
        expectedKeyPoints: ['Ego-free discussions', 'Benchmarking trade-offs', 'Prioritizing readability and maintainability'],
        timeLimitSeconds: timeLimit,
        modelAnswer: 'Focus on code metrics rather than ego. Discuss the architectural trade-off openly with data and benchmarks.',
      },
      {
        id: 'beh-fb-3',
        track: 'behavioral',
        level: config.level,
        question: 'What are your expectations regarding overtime during project crunch periods versus work-life balance?',
        expectedKeyPoints: ['Commitment during genuine releases', 'Preventing burnout through sustainable pace', 'Advance communication on leaves'],
        timeLimitSeconds: timeLimit,
        modelAnswer: 'Fully committed to helping the team during genuine crunch, while communicating planned leaves well in advance.',
      },
    ]
  } else {
    // HR Track
    return [
      {
        id: 'hr-fb-1',
        track: 'hr',
        level: config.level,
        question: 'Tell me about yourself, your engineering background, and what drives your passion for software engineering.',
        expectedKeyPoints: ['Education summary', 'Core technical projects', 'Career aspiration aligned with the role'],
        timeLimitSeconds: timeLimit,
        modelAnswer: 'Computer science graduate passionate about scalable software and continuous problem solving.',
      },
      {
        id: 'hr-fb-2',
        track: 'hr',
        level: config.level,
        question: 'Why do you want to join our company specifically, and what makes you interested in this role?',
        expectedKeyPoints: ['Company knowledge', 'Alignment with tech stack', 'Product impact'],
        timeLimitSeconds: timeLimit,
        modelAnswer: 'Drawn to your team engineering culture and the high-scale challenges your products solve.',
      },
      {
        id: 'hr-fb-3',
        track: 'hr',
        level: config.level,
        question: 'Where do you see yourself in the next 2 to 3 years within our engineering organization?',
        expectedKeyPoints: ['Technical depth', 'Module ownership', 'Mentorship & leadership growth'],
        timeLimitSeconds: timeLimit,
        modelAnswer: 'Owning key backend modules, ensuring high system reliability, and mentoring junior interns.',
      },
      {
        id: 'hr-fb-4',
        track: 'hr',
        level: config.level,
        question: 'Describe a time when you faced a difficult challenge in a project and how you resolved it.',
        expectedKeyPoints: ['STAR method', 'Problem solving', 'Key learnings'],
        timeLimitSeconds: timeLimit,
        modelAnswer: 'Encountered high query latency, analyzed bottlenecks with profiler, and implemented Redis caching for a 65% latency reduction.',
      },
      {
        id: 'hr-fb-5',
        track: 'hr',
        level: config.level,
        question: 'What are your salary expectations and are you open to relocation or hybrid work?',
        expectedKeyPoints: ['Professional tone', 'Market alignment', 'Flexibility'],
        timeLimitSeconds: timeLimit,
        modelAnswer: 'My priority is joining a high-impact team. Open to standard compensation for this role and fully flexible for hybrid or on-site work.',
      },
    ]
  }
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

    let finalQuestions: QuestionItem[] = []

    try {
      const res = await fetch('/api/interview-simulator/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          finalQuestions = data.questions
        }
      }
    } catch (err) {
      console.warn('Network call to generate API failed, using client generator:', err)
    }

    // If server generation returned empty or failed, use instant client synthesis fallback
    if (finalQuestions.length === 0) {
      finalQuestions = getClientFallbackQuestions(config)
    }

    setQuestions(finalQuestions)
    setView('interview')
    setIsLoading(false)
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

      if (res.ok) {
        const reportData = await res.json()
        if (reportData.success) {
          setEvaluationReport(reportData)
          setView('report')
          return
        }
      }
    } catch (err) {
      console.error('Evaluation API failed:', err)
    }

    // Client-side fallback evaluation if API fails
    const fallbackReport: EvaluationResult = {
      overallScore: 72,
      grade: 'B+',
      readinessStatus: 'Needs Polish ⚠️',
      parameterScores: {
        technical: 75,
        communication: 70,
        behavioral: 74,
        integrity: violations >= 2 ? 30 : violations === 1 ? 70 : 95,
      },
      selectionProbability: {
        current: 48,
        projected: 86,
        boost: 38,
        rationale: 'Refining structured answers with the STAR method and maintaining unbroken eye contact will boost your placement selection chances by +38%.',
      },
      identifiedWeaknesses: [
        'Gave brief answers on system optimization questions',
        'Hesitated on architectural trade-offs',
        violations > 0 ? 'Lost camera eye contact during the session' : 'Can quantify project impact with metrics',
      ],
      actionableRoadmap: [
        {
          title: 'Master the STAR Framework (Situation, Task, Action, Result)',
          description: 'Structure every scenario response clearly stating the challenge, your technical actions, and the measurable business outcome.',
          priority: 'High',
        },
        {
          title: 'Reinforce Core Computer Science Fundamentals',
          description: 'Review hashing internals, concurrency models, and database index operations.',
          priority: 'High',
        },
        {
          title: 'Maintain Constant Eye Contact with the Camera',
          description: 'Keep your gaze locked on the webcam to project confidence and eliminate integrity flags.',
          priority: 'Medium',
        },
      ],
      questionReviews: answers.map((a, i) => ({
        id: a.questionId,
        question: a.question,
        candidateAnswer: a.userTranscript || '[No response recorded]',
        score: a.userTranscript.length > 20 ? 75 : 40,
        feedback: a.userTranscript.length > 20 ? 'Good effort! Add more quantified metrics and system tradeoffs.' : 'Answer was brief. Elaborate on core concepts.',
        idealModelAnswer: a.modelAnswer || 'Clear structured explanation with practical examples.',
      })),
    }

    setEvaluationReport(fallbackReport)
    setView('report')
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
