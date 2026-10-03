'use client'

import { Reveal } from './reveal'

const steps = [
  {
    n: '1',
    title: 'Tell us the role',
    body: 'Pick a target role and take a short skill check. It takes about ten minutes.',
  },
  {
    n: '2',
    title: 'Get a plan',
    body: 'You receive a weekly roadmap tied to your gaps, not a generic syllabus.',
  },
  {
    n: '3',
    title: 'Rehearse, then adjust',
    body: 'Mock interviews and GDs feed back into the plan, so each week is a bit sharper.',
  },
]

const facts = [
  { v: '10+', l: 'tools in one login' },
  { v: '13', l: 'DSA topics tracked' },
  { v: '12', l: 'companies in the coding hub' },
  { v: '₹0', l: 'to start' },
]

export function Stats() {
  return (
    <section id="process" className="relative border-y border-border bg-card/40 px-5 py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="eyebrow">How it works</p>
          <h2 className="font-display mt-4 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-5xl">
            Three steps, and the loop repeats.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.05} className="bg-background p-8">
              <span className="font-display text-5xl font-medium text-primary">{s.n}</span>
              <h3 className="font-display mt-6 text-xl font-medium">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </Reveal>
          ))}
        </div>

        <dl className="mt-16 grid grid-cols-2 gap-y-8 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.l} className="border-l border-border pl-5">
              <dt className="font-display text-4xl font-medium tabular-nums tracking-tight">{f.v}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{f.l}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
