'use client'

import { useState, useRef } from 'react'
import {
  Briefcase,
  Code2,
  MessageCircle,
  Users,
  UploadCloud,
  FileText,
  Flame,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'
import { extractPdfText, readTextFile } from '@/lib/pdf'

export interface SetupConfig {
  track: 'hr' | 'technical' | 'communication' | 'behavioral'
  jobDescription: string
  resumeText: string
  level: number
  questionCount: number
  persona: 'priya' | 'vikram'
}

interface InterviewSetupWizardProps {
  onStart: (config: SetupConfig) => void
  isLoading: boolean
}

const TRACKS = [
  {
    id: 'hr',
    name: 'HR Interview',
    icon: Briefcase,
    badge: 'Campus Placement Classic',
    desc: 'Company background, cultural fit, salary expectations, why hire you, and STAR project discussions.',
  },
  {
    id: 'technical',
    name: 'Technical Interview',
    icon: Code2,
    badge: 'Skill-Verified',
    desc: 'Extracts programming skills directly from your resume & JD. 1-3 crisp, logic-focused questions per skill.',
  },
  {
    id: 'communication',
    name: 'Communication Test',
    icon: MessageCircle,
    badge: '3 Structured Rounds',
    desc: 'Round 1: Pronunciation & Articulation · Round 2: Jumbled Story Logic · Round 3: Grammatical & Voice Test.',
  },
  {
    id: 'behavioral',
    name: 'Behavioral Questions',
    icon: Users,
    badge: 'Pressure Scenarios',
    desc: 'Workplace dilemmas, tight deadlines, handling project delays, leave policies, and resolving disagreements.',
  },
] as const

const LEVELS = [
  { level: 0, label: 'Beginner', pace: '0.82x Slow', desc: 'Simple English, patient pace, ideal for beginners overcoming hesitation.' },
  { level: 1, label: 'Easy', pace: '0.90x Normal', desc: 'Conversational HR pace, friendly guidance, standard placement questions.' },
  { level: 2, label: 'Standard', pace: '1.00x Corporate', desc: 'Typical corporate tech interview. Formal tone with depth verification.' },
  { level: 3, label: 'Pressure', pace: '1.10x High', desc: 'Follow-up probes on your claims. Evaluates composure under scrutiny.' },
  { level: 4, label: 'Intense', pace: '1.22x Intense', desc: 'Fast-paced, aggressive cross-examination, and direct counter-questions.' },
  { level: 5, label: 'Extreme', pace: '1.35x Rapid-Fire', desc: 'Rapid-fire questions (25s timer) testing instant logic and sharpness.' },
]

const SAMPLE_JDS = [
  {
    role: 'SDE-1 (Java/Spring/AWS)',
    text: 'Looking for a Software Development Engineer (SDE-1) proficient in Java, Spring Boot, Microservices, and SQL databases. Candidate must understand data structures, multithreading, REST APIs, and cloud basics (AWS/Docker).'
  },
  {
    role: 'Fullstack Dev (React/Node)',
    text: 'Hiring Junior Full-Stack Developer experienced with React, Next.js, Node.js, TypeScript, and MongoDB/PostgreSQL. Strong command over state management, async JavaScript, and Git workflow required.'
  },
  {
    role: 'Data Analyst (Python/SQL)',
    text: 'Seeking an Associate Data Analyst skilled in Python (Pandas, NumPy), Advanced SQL queries, relational databases, data cleaning, and statistical problem-solving for business metrics.'
  }
]

export function InterviewSetupWizard({ onStart, isLoading }: InterviewSetupWizardProps) {
  const [track, setTrack] = useState<'hr' | 'technical' | 'communication' | 'behavioral'>('hr')
  const [jobDescription, setJobDescription] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [level, setLevel] = useState(2)
  const [questionCount, setQuestionCount] = useState<number>(10)
  const [persona, setPersona] = useState<'priya' | 'vikram'>('priya')
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [extractedSkills, setExtractedSkills] = useState<string[]>([])

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsingFile(true)
    setFileName(file.name)

    try {
      let text = ''
      if (file.name.endsWith('.pdf')) {
        text = await extractPdfText(file)
      } else {
        text = await readTextFile(file)
      }
      setResumeText(text)

      // Quick skill detection preview
      const skillCatalog = ['Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'MongoDB', 'C++', 'AWS', 'Docker', 'Git', 'Data Structures']
      const lowerText = text.toLowerCase()
      const detected = skillCatalog.filter((s) => {
        if (s === 'C++') return lowerText.includes('c++') || lowerText.includes('cpp')
        return lowerText.includes(s.toLowerCase())
      })
      setExtractedSkills(detected)
    } catch (err: any) {
      alert(err.message || 'Could not parse file. Please paste your resume text manually.')
    } finally {
      setIsParsingFile(false)
    }
  }

  const handleStart = () => {
    onStart({
      track,
      jobDescription,
      resumeText,
      level,
      questionCount,
      persona,
    })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-brand-blue/20 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs font-semibold text-brand-cyan">
              <Zap className="size-3.5" />
              <span>Campus Placement Preparation Engine</span>
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
              AI Human Interview Simulator
            </h1>
            <p className="mt-1.5 text-xs text-slate-400 sm:text-sm max-w-xl">
              Face a realistic animated AI interviewer, test real voice responses, pass strict webcam proctoring, and receive honest B.Tech campus placement scoring.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-center">
              <span className="block font-mono text-xl font-bold text-brand-cyan">4</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Tracks</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-center">
              <span className="block font-mono text-xl font-bold text-emerald-400">0 - 5</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Pace Levels</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-center">
              <span className="block font-mono text-xl font-bold text-purple-400">Strict</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Proctor AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: Select Track */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider">STEP 1</span>
            <h2 className="text-base font-semibold text-white">Choose Interview Track</h2>
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {TRACKS.map((t) => {
            const Icon = t.icon
            const active = track === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTrack(t.id as any)}
                className={`relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200 ${
                  active
                    ? 'border-brand-cyan bg-brand-cyan/10 shadow-lg shadow-brand-cyan/10 ring-2 ring-brand-cyan/30'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex size-10 items-center justify-center rounded-xl ${
                        active ? 'bg-brand-cyan text-slate-950 font-bold' : 'bg-white/10 text-brand-cyan'
                      }`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-slate-300">
                      {t.badge}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-white">{t.name}</h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">{t.desc}</p>
                </div>
                {active && (
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-brand-cyan">
                    <CheckCircle2 className="size-3.5" />
                    <span>Selected</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: Job Description & Resume Upload */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Job Description Input */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider">STEP 2</span>
              <h2 className="text-base font-semibold text-white">Target Job Description (JD)</h2>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Paste the job requirements from the company posting. The AI will formulate targeted interview questions based on this.
          </p>

          {/* Quick presets */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-slate-500 flex items-center mr-1">Quick fill:</span>
            {SAMPLE_JDS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setJobDescription(preset.text)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300 hover:bg-white/10 hover:text-white"
              >
                {preset.role}
              </button>
            ))}
          </div>

          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={5}
            placeholder="Paste Job Description (e.g. SDE-1 requirements, required skills, company responsibilities)..."
            className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900/90 p-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan/50"
          />
        </div>

        {/* Resume Upload / Paste */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider">STEP 3</span>
              <h2 className="text-base font-semibold text-white">Your Resume</h2>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsingFile}
              className="flex items-center gap-1.5 rounded-xl border border-brand-blue/40 bg-brand-blue/20 px-3 py-1 text-xs font-semibold text-brand-cyan transition-all hover:bg-brand-blue/30 disabled:opacity-50"
            >
              <UploadCloud className="size-3.5" />
              <span>{isParsingFile ? 'Parsing...' : 'Upload PDF / TXT'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Upload your resume file or paste text below. The AI parses your projects and skills to cross-examine you.
          </p>

          {fileName && (
            <div className="mb-2 flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-1.5 border border-emerald-500/20 text-xs text-emerald-400">
              <span className="flex items-center gap-1.5 truncate">
                <FileText className="size-3.5" />
                {fileName}
              </span>
              <span className="text-[10px] font-semibold text-emerald-300">PARSED</span>
            </div>
          )}

          {extractedSkills.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1 items-center">
              <span className="text-[10px] text-slate-400">Detected:</span>
              {extractedSkills.map((s, i) => (
                <span key={i} className="rounded bg-brand-cyan/20 px-1.5 py-0.5 text-[9px] font-semibold text-brand-cyan border border-brand-cyan/30">
                  {s}
                </span>
              ))}
            </div>
          )}

          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={4}
            placeholder="Or paste resume text here directly (skills, education, internships, projects)..."
            className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900/90 p-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan/50"
          />
        </div>
      </div>

      {/* Step 4: AI interviewer persona */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 backdrop-blur-md shadow-xl">
        <div className="mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan">STEP 4</span>
          <h2 className="text-base font-semibold text-white">Choose Your AI Interviewer</h2>
          <p className="mt-1 text-xs text-slate-400">The selected interviewer gets a distinct Gemini voice and professional persona.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { id: 'priya' as const, name: 'Priya Sharma', role: 'Senior Technical Recruiter', voice: 'Firm, warm · Gemini Kore', image: '/avatar-1.png' },
            { id: 'vikram' as const, name: 'Vikram Malhotra', role: 'Lead Software Engineer', voice: 'Confident, direct · Gemini Puck', image: '/avatar-2.png' },
          ].map((person) => (
            <button key={person.id} type="button" onClick={() => setPersona(person.id)} className={`flex items-center gap-4 rounded-2xl border p-3 text-left transition-all ${persona === person.id ? 'border-brand-cyan bg-brand-cyan/10 ring-2 ring-brand-cyan/30' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
              <img src={person.image} alt={person.name} className="size-16 rounded-xl object-cover object-top" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{person.name}</p>
                <p className="text-[11px] text-slate-300">{person.role}</p>
                <p className="mt-1 text-[10px] text-slate-500">{person.voice}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Difficulty / Pace Level & Question Count */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 backdrop-blur-md shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider">STEP 5</span>
            <h2 className="text-base font-semibold text-white">Difficulty Pacing & Number of Questions</h2>
          </div>

          {/* Question count selector (10, 15, 20, 25) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Attempt:</span>
            {[10, 15, 20, 25].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setQuestionCount(count)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  questionCount === count
                    ? 'bg-brand-cyan text-slate-950 shadow-md shadow-brand-cyan/20'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {count} Questions
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Level Cards (Level 0 - 5) */}
        <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {LEVELS.map((lvl) => {
            const active = level === lvl.level
            return (
              <button
                key={lvl.level}
                type="button"
                onClick={() => setLevel(lvl.level)}
                className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all ${
                  active
                    ? 'border-brand-cyan bg-brand-cyan/15 ring-2 ring-brand-cyan/40 shadow-lg'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-cyan">Level {lvl.level}</span>
                    <span className="text-[9px] font-mono text-slate-400">{lvl.pace}</span>
                  </div>
                  <h4 className="mt-1 text-xs font-bold text-white">{lvl.label}</h4>
                  <p className="mt-1 text-[10px] text-slate-400 leading-snug">{lvl.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Start Button Bar */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 sm:flex-row shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">
              {TRACKS.find((t) => t.id === track)?.name} · Level {level} · {questionCount} Questions
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Gemini Live voice interviewer + adaptive questions + two-strike AI proctoring will be active.
          </p>
        </div>

        <button
          onClick={handleStart}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              <span>Generating Custom Questions...</span>
            </>
          ) : (
            <>
              <span>Start Live AI Interview</span>
              <ChevronRight className="size-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
