'use client'

import { Reveal } from './reveal'

const modules = [
  {
    no: '01',
    title: 'Roadmap',
    desc: 'A week-by-week plan built from your target role and what you already know. It reshuffles when you fall behind.',
  },
  {
    no: '02',
    title: 'Interview simulator',
    desc: 'A voice interview that follows up on your answers, then scores structure, clarity and confidence.',
  },
  {
    no: '03',
    title: 'Skill analyzer',
    desc: 'Short quizzes per topic. You see accuracy by skill, so the weak ones stop hiding.',
  },
  {
    no: '04',
    title: 'Coding hub',
    desc: 'Company-tagged DSA problems and hints that nudge instead of handing over the answer.',
  },
  {
    no: '05',
    title: 'GD simulator',
    desc: 'Group discussions with AI participants, or with friends in a live room. Scored on how you contribute.',
  },
  {
    no: '06',
    title: 'Resume analyzer',
    desc: 'ATS-style parsing, missing keywords, and rewrites line by line.',
  },
]

export function Features() {
  return (
    <section id="modules" className="relative px-5 py-28">
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="eyebrow">Modules</p>
            <h2 className="font-display mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-5xl">
              Six tools, one <span className="text-gradient">habit</span>.
            </h2>
          </Reveal>
          <Reveal className="lg:col-span-6 lg:col-start-7 lg:pt-10" delay={0.05}>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Each module feeds the next. A weak quiz result changes your
              roadmap; a rough interview adds practice to your week.
            </p>
          </Reveal>
        </div>

        <ul className="mt-16 border-t border-border">
          {modules.map((m, i) => (
            <Reveal as="li" key={m.title} delay={i * 0.03}>
              <div className="group grid gap-2 border-b border-border py-7 transition-colors hover:bg-card/60 sm:grid-cols-12 sm:gap-6 sm:px-3">
                <span className="font-mono text-xs text-muted-foreground sm:col-span-1 sm:pt-2">
                  {m.no}
                </span>
                <h3 className="font-display text-2xl font-medium tracking-tight sm:col-span-4">
                  {m.title}
                </h3>
                <p className="max-w-xl text-muted-foreground sm:col-span-7">
                  {m.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
