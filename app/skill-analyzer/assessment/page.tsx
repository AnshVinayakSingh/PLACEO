'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RotateCcw,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'
import { cn } from '@/lib/utils'

type Question = {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

type Progress = {
  levelIndex: number
  levelName: string
  questionsAnswered: number
  correctAnswered: number
  accuracy: number
  weakTopic: string | null
} | null

type Stage = 'loading' | 'setup' | 'loading-questions' | 'quiz' | 'finished' | 'error'

const COUNT_OPTIONS = [5, 10, 15]

function AssessmentFlow() {
  const searchParams = useSearchParams()
  const skill = searchParams.get('skill') ?? ''

  const [stage, setStage] = useState<Stage>('loading')
  const [progress, setProgress] = useState<Progress>(null)
  const [curriculum, setCurriculum] = useState<string[]>([])
  const [count, setCount] = useState(5)
  const [activeTopic, setActiveTopic] = useState('')
  const [wasRestart, setWasRestart] = useState(false)

  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [leveledUp, setLeveledUp] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!skill) return
    async function loadProgress() {
      setStage('loading')
      try {
        const res = await fetch(`/api/skill-progress?skill=${encodeURIComponent(skill)}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Could not load your progress.')
          setStage('error')
          return
        }
        setCurriculum(data.curriculum || [])
        setProgress(data.progress)
        setStage('setup')
      } catch {
        setError('Network error. Please try again.')
        setStage('error')
      }
    }
    loadProgress()
  }, [skill])

  async function startQuiz(topic: string, isRestart: boolean) {
    setActiveTopic(topic)
    setWasRestart(isRestart)
    setStage('loading-questions')
    setIndex(0)
    setSelected(null)
    setScore(0)
    setLeveledUp(false)
    try {
      const res = await fetch('/api/skill-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: skill, subtopic: topic, count }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not load questions.')
        setStage('error')
        return
      }
      setQuestions(data.questions || [])
      setStage('quiz')
    } catch {
      setError('Network error. Please try again.')
      setStage('error')
    }
  }

  const current = questions[index]

  function handleSelect(optionIndex: number) {
    if (selected !== null) return
    setSelected(optionIndex)
    if (optionIndex === current.correctIndex) setScore((s) => s + 1)
  }

  async function saveProgress(finalScore: number) {
    try {
      const res = await fetch('/api/skill-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill,
          subtopic: activeTopic,
          correctCount: finalScore,
          totalCount: questions.length,
          startFromZero: wasRestart,
        }),
      })
      const data = await res.json()
      if (res.ok && data.progress) {
        const advanced =
          curriculum.indexOf(data.progress.levelName) > curriculum.indexOf(progress?.levelName ?? '')
        setLeveledUp(advanced)
        setProgress(data.progress)
      }
    } catch {
      // Non-critical — result still shows even if saving fails.
    }
  }

  function handleNext() {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1)
      setSelected(null)
    } else {
      saveProgress(score)
      setStage('finished')
    }
  }

  if (!skill) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
        No skill selected.{' '}
        <Link href="/skill-analyzer" className="text-brand-cyan hover:underline">
          Go back and pick one.
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link
        href="/skill-analyzer"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Skill Analyzer
      </Link>

      <div className="glass-strong rounded-2xl p-5 sm:p-8">
        {stage === 'loading' && (
          <div className="flex h-56 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-brand-cyan" />
          </div>
        )}

        {stage === 'error' && (
          <div className="flex h-56 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => (activeTopic ? startQuiz(activeTopic, wasRestart) : setStage('setup'))}
              className="brand-gradient rounded-xl px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Try again
            </button>
          </div>
        )}

        {stage === 'setup' && (
          <div>
            <h1 className="font-display text-xl font-bold">{skill} Assessment</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose how many questions, then pick a topic to start.
            </p>

            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Number of questions</p>
              <div className="flex gap-2">
                {COUNT_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCount(c)}
                    className={cn(
                      'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                      count === c ? 'brand-gradient text-primary-foreground' : 'glass text-muted-foreground',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {progress && progress.questionsAnswered > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Quick start</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <button
                    onClick={() => startQuiz(progress.levelName, false)}
                    className="glass glow-ring flex items-center justify-between rounded-xl px-4 py-3.5 text-left hover:bg-white/5"
                  >
                    <span>
                      <span className="block text-sm font-medium">Continue where I left off</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {progress.levelName} · {progress.accuracy}% accuracy so far
                      </span>
                    </span>
                    <TrendingUp className="size-4 shrink-0 text-brand-cyan" />
                  </button>
                  <button
                    onClick={() => startQuiz(curriculum[0], true)}
                    className="glass flex items-center justify-between rounded-xl px-4 py-3.5 text-left hover:bg-white/5"
                  >
                    <span>
                      <span className="block text-sm font-medium">Start from Level 0</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">Reset and restart</span>
                    </span>
                    <RotateCcw className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Or pick a specific topic</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {curriculum.map((topic, i) => {
                  const isWeak = progress?.weakTopic === topic
                  return (
                    <button
                      key={topic}
                      onClick={() => startQuiz(topic, false)}
                      className="glass flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm hover:bg-white/5"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">L{i + 1}</span>
                        {topic}
                        {isWeak && (
                          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] text-amber-300">
                            weak
                          </span>
                        )}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {stage === 'loading-questions' && (
          <div className="flex h-56 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-brand-cyan" />
            Generating fresh questions on {activeTopic}...
          </div>
        )}

        {stage === 'quiz' && current && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Question {index + 1} of {questions.length}
              </p>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-brand-cyan">
                {activeTopic}
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
              >
                <p className="text-sm font-medium leading-relaxed">{current.question}</p>
                <div className="mt-4 space-y-2">
                  {current.options.map((opt, i) => {
                    const isCorrect = i === current.correctIndex
                    const isSelected = i === selected
                    const revealed = selected !== null
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelect(i)}
                        disabled={selected !== null}
                        className={cn(
                          'glass flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition-colors',
                          revealed && isCorrect && 'ring-2 ring-emerald-400/60 bg-emerald-400/10',
                          revealed && isSelected && !isCorrect && 'ring-2 ring-destructive/60 bg-destructive/10',
                          !revealed && 'hover:bg-white/5',
                        )}
                      >
                        <span>{opt}</span>
                        {revealed && isCorrect && <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />}
                        {revealed && isSelected && !isCorrect && (
                          <XCircle className="size-4 shrink-0 text-destructive" />
                        )}
                      </button>
                    )
                  })}
                </div>

                {selected !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-xl bg-secondary/50 p-4 text-sm text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      {selected === current.correctIndex ? 'Correct — ' : 'Not quite — '}
                    </span>
                    {current.explanation}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>

            {selected !== null && (
              <button
                onClick={handleNext}
                className="brand-gradient glow-ring mt-5 flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold text-primary-foreground"
              >
                {index + 1 < questions.length ? 'Next Question' : 'See Results'}
              </button>
            )}
          </div>
        )}

        {stage === 'finished' && (
          <div className="flex flex-col items-center py-6 text-center">
            <p className="font-display text-3xl font-bold text-gradient">
              {score} / {questions.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{activeTopic}</p>
            {leveledUp && progress && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-300"
              >
                <TrendingUp className="size-3.5" />
                Level up! Now on: {progress.levelName}
              </motion.p>
            )}
            {progress && (
              <p className="mt-3 text-sm text-muted-foreground">
                Overall accuracy: <span className="font-medium text-foreground">{progress.accuracy}%</span>
                {progress.weakTopic && (
                  <>
                    {' '}
                    · Weak topic: <span className="font-medium text-foreground">{progress.weakTopic}</span>
                  </>
                )}
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => startQuiz(activeTopic, false)}
                className="glass flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/5"
              >
                <RotateCcw className="size-4" />
                Practice Again
              </button>
              <button
                onClick={() => setStage('setup')}
                className="glass rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/5"
              >
                Choose Another Topic
              </button>
              <Link
                href="/skill-analyzer"
                className="brand-gradient rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Done
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SkillAssessmentPage() {
  return (
    <PageShell title="Skill Assessment" description="">
      <Suspense fallback={<div className="h-56" />}>
        <AssessmentFlow />
      </Suspense>
    </PageShell>
  )
}
