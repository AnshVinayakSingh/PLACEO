'use client'

import { useState } from 'react'
import {
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Printer,
  ShieldCheck,
  Brain,
  MessageSquare,
  BarChart3,
} from 'lucide-react'

export interface EvaluationResult {
  overallScore: number
  grade: string
  readinessStatus: string
  parameterScores: {
    technical: number
    communication: number
    behavioral: number
    integrity: number
  }
  selectionProbability: {
    current: number
    projected: number
    boost: number
    rationale: string
  }
  identifiedWeaknesses: string[]
  actionableRoadmap: {
    title: string
    description: string
    priority: string
  }[]
  questionReviews: {
    id: string
    question: string
    candidateAnswer: string
    score: number
    feedback: string
    idealModelAnswer: string
    missingPoints?: string[]
  }[]
}

interface InterviewReportCardProps {
  report: EvaluationResult
  track: string
  level: number
  onRetake: () => void
}

export function InterviewReportCard({ report, track, level, onRetake }: InterviewReportCardProps) {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)

  const toggleQuestion = (id: string) => {
    setExpandedQuestion((prev) => (prev === id ? null : id))
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 60) return 'text-brand-cyan'
    if (score >= 45) return 'text-amber-400'
    return 'text-rose-400'
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header Summary Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-brand-blue/20 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs font-semibold text-brand-cyan">
              <Award className="size-3.5" />
              <span>Campus Placement Evaluation Report</span>
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
              Strict Performance Scorecard
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Track: <span className="font-semibold text-white capitalize">{track}</span> · Difficulty Level: <span className="font-semibold text-brand-cyan">Level {level}</span>
            </p>
          </div>

          {/* Big Score Gauge */}
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <div className="relative flex size-20 items-center justify-center rounded-2xl bg-slate-900 border border-white/15 shadow-inner">
              <span className={`font-mono text-3xl font-extrabold ${getScoreColor(report.overallScore)}`}>
                {report.overallScore}
              </span>
              <span className="absolute bottom-1.5 text-[9px] font-semibold text-slate-400">/ 100</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-brand-blue/30 px-2 py-0.5 text-xs font-bold text-brand-cyan">
                  Grade {report.grade}
                </span>
              </div>
              <p className="mt-1 text-xs font-bold text-white sm:text-sm">
                {report.readinessStatus}
              </p>
              <p className="text-[11px] text-slate-400">Strict placement benchmark</p>
            </div>
          </div>
        </div>
      </div>

      {/* Selection Probability Boost Card */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-900 p-6 backdrop-blur-md shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400">
              <TrendingUp className="size-5" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Placement Selection Probability</h2>
            </div>
            <p className="mt-1 text-xs text-slate-300 sm:text-sm max-w-xl">
              {report.selectionProbability.rationale}
            </p>
          </div>

          {/* Visual Percentage Jump */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Current</span>
              <p className="text-xl font-bold font-mono text-slate-200">{report.selectionProbability.current}%</p>
            </div>
            <div className="text-emerald-400 font-extrabold text-lg">➔</div>
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/60 px-4 py-3 text-center">
              <span className="text-[10px] uppercase font-semibold text-emerald-400">With Fixes</span>
              <p className="text-2xl font-black font-mono text-emerald-300">{report.selectionProbability.projected}%</p>
            </div>
            <div className="rounded-xl bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
              +{report.selectionProbability.boost}% Boost
            </div>
          </div>
        </div>
      </div>

      {/* Parameter Scores Breakdown */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5"><Brain className="size-4 text-brand-cyan" /> Tech & Logic</span>
            <span className="font-mono text-brand-cyan">{report.parameterScores.technical}%</span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-brand-cyan transition-all" style={{ width: `${report.parameterScores.technical}%` }}></div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5"><MessageSquare className="size-4 text-purple-400" /> Communication</span>
            <span className="font-mono text-purple-400">{report.parameterScores.communication}%</span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-purple-400 transition-all" style={{ width: `${report.parameterScores.communication}%` }}></div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5"><BarChart3 className="size-4 text-emerald-400" /> Behavioral</span>
            <span className="font-mono text-emerald-400">{report.parameterScores.behavioral}%</span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-emerald-400 transition-all" style={{ width: `${report.parameterScores.behavioral}%` }}></div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-amber-400" /> Proctor Integrity</span>
            <span className="font-mono text-amber-400">{report.parameterScores.integrity}%</span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-amber-400 transition-all" style={{ width: `${report.parameterScores.integrity}%` }}></div>
          </div>
        </div>
      </div>

      {/* Identified Weaknesses & Action Plan */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Identified Weaknesses */}
        <div className="rounded-3xl border border-rose-500/20 bg-slate-950/70 p-6 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-2 text-rose-400 mb-3">
            <AlertTriangle className="size-4" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Identified Weaknesses & Lags</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            These are the specific areas where you hesitated, missed key technical terms, or gave surface-level answers:
          </p>

          <div className="space-y-2.5">
            {report.identifiedWeaknesses.map((weakness, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-200">
                <XCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{weakness}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Improvement Roadmap */}
        <div className="rounded-3xl border border-brand-blue/30 bg-slate-950/70 p-6 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-2 text-brand-cyan mb-3">
            <Sparkles className="size-4" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Actionable Placement Roadmap</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Follow this 3-step action plan to maximize your campus placement interview clearance:
          </p>

          <div className="space-y-3">
            {report.actionableRoadmap.map((item, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-white">{item.title}</h4>
                  <span className="rounded bg-brand-cyan/20 px-1.5 py-0.5 text-[9px] font-semibold text-brand-cyan">
                    {item.priority} Priority
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Question-by-Question Review */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider">DETAILED BREAKDOWN</span>
            <h2 className="text-base font-semibold text-white">Question-by-Question Analysis</h2>
          </div>
          <span className="text-xs text-slate-400">{report.questionReviews.length} Questions Evaluated</span>
        </div>

        <div className="space-y-3">
          {report.questionReviews.map((q, index) => {
            const isExpanded = expandedQuestion === q.id
            return (
              <div
                key={q.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleQuestion(q.id)}
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-white/5"
                >
                  <div className="flex items-center gap-3 pr-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-brand-cyan border border-white/10">
                      {index + 1}
                    </span>
                    <p className="text-xs font-semibold text-white sm:text-sm line-clamp-1">
                      {q.question}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-mono text-xs font-bold ${getScoreColor(q.score)}`}>
                      {q.score}/100
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="size-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="size-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-white/10 bg-slate-950/60 p-4 space-y-3 text-xs">
                    <div>
                      <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">Your Recorded Answer:</span>
                      <p className="mt-1 rounded-xl bg-slate-900/80 p-3 text-slate-200 italic leading-relaxed border border-white/5">
                        "{q.candidateAnswer}"
                      </p>
                    </div>

                    <div>
                      <span className="font-semibold text-brand-cyan uppercase text-[10px] tracking-wider">AI Recruiter Feedback:</span>
                      <p className="mt-1 text-slate-300 leading-relaxed">{q.feedback}</p>
                    </div>

                    {q.missingPoints && q.missingPoints.length > 0 && (
                      <div>
                        <span className="font-semibold text-amber-400 uppercase text-[10px] tracking-wider">Key Points You Missed:</span>
                        <ul className="mt-1 list-disc list-inside space-y-0.5 text-slate-400">
                          {q.missingPoints.map((pt, idx) => (
                            <li key={idx}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <span className="font-semibold text-emerald-400 uppercase text-[10px] tracking-wider">Ideal Benchmark Answer:</span>
                      <p className="mt-1 rounded-xl bg-emerald-950/20 p-3 text-emerald-200 leading-relaxed border border-emerald-500/20">
                        {q.idealModelAnswer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <Printer className="size-4" />
          <span>Save / Print Report</span>
        </button>

        <button
          onClick={onRetake}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95"
        >
          <RotateCcw className="size-4" />
          <span>Retake Another Interview</span>
        </button>
      </div>
    </div>
  )
}
