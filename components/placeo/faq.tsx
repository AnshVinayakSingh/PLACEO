'use client'

import { Reveal } from './reveal'

type QA = { q: string; a: string }

const faqs: QA[] = [
  {
    q: 'What exactly is PLACEO?',
    a: 'PLACEO is an all-in-one AI career operating system for students. It combines roadmaps, interview simulation, skill and resume analysis, coding practice, and group-discussion prep into a single platform.',
  },
  {
    q: 'Is there really a free plan?',
    a: 'Yes. The Starter plan is free forever and includes an AI roadmap, three mock interviews a month, and the basic skill analyzer — no credit card required.',
  },
  {
    q: 'How accurate is the AI interview feedback?',
    a: 'Our models are trained on thousands of real interview transcripts and evaluate your answers, structure, tone, and confidence. You get actionable, specific feedback after every session.',
  },
  {
    q: 'Will the resume analyzer work with company ATS systems?',
    a: 'Absolutely. The analyzer scores your resume against real ATS parsing rules and role-specific keywords, then gives line-by-line suggestions to improve your callback rate.',
  },
  {
    q: 'Can my college or placement cell use PLACEO?',
    a: 'Yes — the Campus plan gives placement cells cohort analytics, SSO, custom hiring partners, and a dedicated success manager. Reach out through the Contact sales button.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Of course. Plans are month-to-month and you can cancel or downgrade at any time from your account settings, no questions asked.',
  },
]

export function Faq() {
  return (
    <section id="faq" className="relative px-5 py-28">
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl">
        <Reveal className="max-w-xl">
          <p className="eyebrow">FAQ</p>
          <h2 className="font-display mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-5xl">
            Before you <span className="text-gradient">sign up</span>
          </h2>
        </Reveal>

        <dl className="mt-16 grid gap-x-16 gap-y-12 md:grid-cols-2">
          {faqs.map((item, i) => (
            <Reveal key={item.q} delay={(i % 2) * 0.05} className={i % 2 === 1 ? 'md:mt-10' : ''}>
              <dt className="font-display text-xl font-medium tracking-tight">{item.q}</dt>
              <dd className="mt-3 max-w-md leading-relaxed text-muted-foreground">{item.a}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  )
}
