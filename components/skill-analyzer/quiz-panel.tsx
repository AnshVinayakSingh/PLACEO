'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle2, Loader2, RotateCcw, TrendingUp, X, XCircle } from 'lucide-react'

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
}

type Stage = 'choosing' | 'loading-questions' | 'quiz' | 'finished' | 'error'

export function QuizPanel({ topic, onClose }: { topic: string; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>('loading-questions')
  const [progress, setProgress] = useState<Progress | null>(null)
  const [curriculum, setCurriculum] = useState<string[]>([])
  const [activeLevelName, setActiveLevelName] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [error, setError] = useState('')
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [leveledUp, setLeveledUp] = useState(false)
  const [explicitRestart, setExplicitRestart] = useState(false)

  // Step 1: check for existing progress on this skill.
  useEffect(() => {
    async function checkProgress() {
      setStage('loading-questions')
      try {
        const res = await fetch(`/api/skill-progress?skill=${encodeURIComponent(topic)}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Could not load your progress.')
          setStage('error')
          return
        }
        setCurriculum(data.curriculum || [])
        if (data.progress && data.progress.questionsAnswered > 0) {
          setProgress(data.progress)
          setStage('choosing')
        } else {
          // No history yet — just start straight at Level 0.
          startQuiz(data.curriculum?.[0] ?? topic)
        }
      } catch {
        setError('Network error. Please try again.')
        setStage('error')
      }
    }
    checkProgress()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic])

  async function startQuiz(levelName: string) {
    setActiveLevelName(levelName)
    setStage('loading-questions')
    setIndex(0)
    setSelected(null)
    setScore(0)
    setLeveledUp(false)
    try {
      const res = await fetch('/api/skill-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, subtopic: levelName, count: 5 }),
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

  function handleChooseRestart() {
    setExplicitRestart(true)
    startQuiz(curriculum[0] ?? topic)
  }

  function handleChooseContinue() {
    if (progress) startQuiz(progress.levelName)
  }

  const current = questions[index]

  function handleSelect(optionIndex: number) {
    if (selected !== null) return
    setSelected(optionIndex)
    if (optionIndex === current.correctIndex) setScore((s) => s + 1)
  }

  async function saveProgress(finalScore: number, startFromZero: boolean) {
    try {
      const res = await fetch('/api/skill-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill: topic,
          correctCount: finalScore,
          totalCount: questions.length,
          startFromZero,
        }),
      })
      const data = await res.json()
      if (res.ok && data.progress) {
        const advanced = curriculum.indexOf(data.progress.levelName) > curriculum.indexOf(activeLevelName)
        setLeveledUp(advanced)
        setProgress(data.progress)
      }
    } catch {
      // Non-critical — quiz result still shows even if saving progress fails.
    }
  }

  function handleNext() {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1)
      setSelected(null)
    } else {
      saveProgress(score, explicitRestart)
      setExplicitRestart(false)
      setStage('finished')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong glow-ring w-full max-w-xl rounded-2xl p-5 sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold">{topic} Assessment</h3>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {stage === 'loading-questions' && (
          <div className="flex h-56 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-brand-cyan" />
            Generating fresh questions for you...
          </div>
        )}

        {stage === 'error' && (
          <div className="flex h-56 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => startQuiz(activeLevelName || topic)}
              className="brand-gradient rounded-xl px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Try again
            </button>
          </div>
        )}

        {stage === 'choosing' && progress && (
          <div className="py-2">
            <p className="mb-5 text-sm text-muted-foreground">
              You've made progress on {topic} before. How do you want to continue?
            </p>
            <div className="space-y-3">
              <button
                onClick={handleChooseContinue}
                className="glass glow-ring flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left hover:bg-white/5"
              >
                <span>
                  <span className="block text-sm font-medium">Continue where I left off</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {progress.levelName} · Level {progress.levelIndex + 1}
                  </span>
                </span>
                <TrendingUp className="size-4 shrink-0 text-brand-cyan" />
              </button>
              <button
                onClick={handleChooseRestart}
                className="glass flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left hover:bg-white/5"
              >
                <span>
                  <span className="block text-sm font-medium">Start from Level 0</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Restart from the basics</span>
                </span>
                <RotateCcw className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {stage === 'quiz' && current && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Question {index + 1} of {questions.length}
              </p>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-brand-cyan">
                {activeLevelName}
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
                        className={`glass flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                          revealed && isCorrect
                            ? 'ring-2 ring-emerald-400/60 bg-emerald-400/10'
                            : revealed && isSelected && !isCorrect
                              ? 'ring-2 ring-destructive/60 bg-destructive/10'
                              : 'hover:bg-white/5'
                        }`}
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
            <p className="mt-1 text-xs text-muted-foreground">{activeLevelName}</p>
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
            <p className="mt-3 text-sm text-muted-foreground">
              {score === questions.length
                ? "Perfect score! You've got this topic down."
                : score >= questions.length * 0.6
                  ? 'Solid work — score 80%+ to advance to the next level.'
                  : "Keep practicing — that's exactly what this is for."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => startQuiz(progress?.levelName ?? activeLevelName)}
                className="glass flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/5"
              >
                <RotateCcw className="size-4" />
                More Questions
              </button>
              <button
                onClick={onClose}
                className="brand-gradient rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
