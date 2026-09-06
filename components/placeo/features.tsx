'use client'

import type { LucideIcon } from 'lucide-react'
import {
  Code2,
  FileText,
  Map,
  MessagesSquare,
  Mic,
  Radar,
} from 'lucide-react'
import { Reveal } from './reveal'
import { TiltCard } from './tilt-card'

type Feature = {
  icon: LucideIcon
  title: string
  desc: string
}

const features: Feature[] = [
  {
    icon: Map,
    title: 'AI Roadmap',
    desc: 'Get a personalized, step-by-step career path generated from your goals, skills, and target roles.',
  },
  {
    icon: Mic,
    title: 'Interview Simulator',
    desc: 'Practice realistic AI-driven interviews with instant feedback on answers, tone, and confidence.',
  },
  {
    icon: Radar,
    title: 'Skill Analyzer',
    desc: 'Map your strengths and gaps against real job requirements with a live skill radar.',
  },
  {
    icon: Code2,
    title: 'Coding Hub',
    desc: 'Sharpen DSA and problem-solving with curated challenges and AI hints tailored to you.',
  },
  {
    icon: MessagesSquare,
    title: 'GD Simulator',
    desc: 'Rehearse group discussions with AI participants and get scored on clarity and impact.',
  },
  {
    icon: FileText,
    title: 'Resume Analyzer',
    desc: 'Instant ATS scoring, keyword optimization, and line-by-line suggestions that get callbacks.',
  },
]

export function Features() {
  return (
    <section id="features" className="relative px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="glass inline-flex rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
            Everything you need
          </span>
          <h2 className="font-display mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            One platform to run your entire{' '}
            <span className="text-gradient">career journey</span>
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Six powerful AI modules working together so you spend less time
            guessing and more time getting placed.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <TiltCard className="glass group h-full rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:glow-ring">
                <div className="brand-gradient glow-ring flex size-12 items-center justify-center rounded-xl text-primary-foreground transition-transform duration-300 group-hover:scale-110">
                  <f.icon className="size-6" />
                </div>
                <h3 className="font-display mt-5 text-lg font-semibold">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
