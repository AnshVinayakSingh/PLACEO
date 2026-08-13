'use client'

import { AtSign, Code2, Play, Send, Sparkles } from 'lucide-react'
import { Reveal } from './reveal'

const columns = [
  {
    title: 'Product',
    links: ['Features', 'Pricing', 'AI Roadmap', 'Interview Simulator'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Blog', 'Contact'],
  },
  {
    title: 'Resources',
    links: ['Help Center', 'Community', 'Guides', 'Status'],
  },
  {
    title: 'Legal',
    links: ['Privacy', 'Terms', 'Security', 'Cookies'],
  },
]

const socials = [
  { icon: Send, label: 'Twitter' },
  { icon: AtSign, label: 'LinkedIn' },
  { icon: Code2, label: 'GitHub' },
  { icon: Play, label: 'YouTube' },
]

export function Footer() {
  return (
    <footer className="relative px-4 pb-10 pt-16">
      <div className="mx-auto max-w-6xl">
        <Reveal className="glass-strong glow-ring relative overflow-hidden rounded-3xl p-8 text-center sm:p-14">
          <div className="animate-float-orb absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full bg-[oklch(0.62_0.2_265_/_0.4)] blur-[90px]" />
          <div className="relative">
            <h2 className="font-display text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to run your career on{' '}
              <span className="text-gradient">autopilot?</span>
            </h2>
            <p className="mx-auto mt-3 max-w-md text-pretty text-muted-foreground">
              Join 10,000+ students building their future with PLACEO. Start
              free today.
            </p>
            <a
              href="#pricing"
              className="brand-gradient glow-ring mt-7 inline-flex rounded-xl px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
            >
              Get Started Free
            </a>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <a href="#top" className="flex items-center gap-2">
              <span className="brand-gradient flex size-8 items-center justify-center rounded-lg text-primary-foreground">
                <Sparkles className="size-4" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight">
                PLACEO
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Your AI Career Operating System — built to help students plan,
              prepare, and get placed.
            </p>
            <div className="mt-5 flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="glass inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
                >
                  <s.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-sm font-semibold">
                {col.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} PLACEO. All rights reserved.</p>
          <p>Made for ambitious students.</p>
        </div>
      </div>
    </footer>
  )
}
