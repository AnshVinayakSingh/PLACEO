'use client'

import { Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal } from './reveal'

type Plan = {
  name: string
  price: string
  period: string
  desc: string
  features: string[]
  cta: string
  popular?: boolean
}

const plans: Plan[] = [
  {
    name: 'Starter',
    price: '$0',
    period: '/forever',
    desc: 'Everything you need to explore your career path.',
    features: [
      'AI Roadmap (1 goal)',
      '3 mock interviews / month',
      'Basic skill analyzer',
      'Community access',
    ],
    cta: 'Start free',
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    desc: 'For students serious about landing top placements.',
    features: [
      'Unlimited AI roadmaps',
      'Unlimited mock interviews',
      'Advanced skill radar',
      'Resume + ATS analyzer',
      'GD simulator & Coding Hub',
      'Priority AI feedback',
    ],
    cta: 'Get Pro',
    popular: true,
  },
  {
    name: 'Campus',
    price: 'Custom',
    period: '',
    desc: 'For colleges and placement cells at scale.',
    features: [
      'Everything in Pro',
      'Cohort analytics dashboard',
      'Dedicated success manager',
      'SSO & integrations',
      'Custom hiring partners',
    ],
    cta: 'Contact sales',
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="relative px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="glass inline-flex rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
            Simple pricing
          </span>
          <h2 className="font-display mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Invest in your <span className="text-gradient">future self</span>
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Start free, upgrade when you&apos;re ready. No hidden fees, cancel
            anytime.
          </p>
        </Reveal>

        <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.08} className="h-full">
              <div
                className={cn(
                  'relative flex h-full flex-col rounded-3xl p-8 transition-all duration-300',
                  plan.popular
                    ? 'glass-strong glow-ring lg:-translate-y-4 lg:scale-[1.02]'
                    : 'glass hover:-translate-y-1',
                )}
              >
                {plan.popular && (
                  <div className="brand-gradient absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg">
                    <Sparkles className="size-3" />
                    Most Popular
                  </div>
                )}

                <h3 className="font-display text-lg font-semibold">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.desc}
                </p>

                <div className="mt-6 flex items-end gap-1">
                  <span className="font-display text-4xl font-bold tracking-tight">
                    {plan.price}
                  </span>
                  <span className="mb-1 text-sm text-muted-foreground">
                    {plan.period}
                  </span>
                </div>

                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <span className="brand-gradient mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full">
                        <Check className="size-2.5 text-primary-foreground" />
                      </span>
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#top"
                  className={cn(
                    'mt-8 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-all',
                    plan.popular
                      ? 'brand-gradient glow-ring text-primary-foreground hover:scale-[1.03]'
                      : 'glass text-foreground hover:bg-white/5',
                  )}
                >
                  {plan.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
