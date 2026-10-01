'use client'

import Link from 'next/link'
import { Reveal } from './reveal'
import { Wordmark } from './navbar'

const links = [
  { label: 'Modules', href: '#modules' },
  { label: 'How it works', href: '#process' },
  { label: 'Students', href: '#students' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Sign in', href: '/login' },
  { label: 'Create account', href: '/signup' },
]

export function Footer() {
  return (
    <footer className="relative border-t border-border px-5 pb-10 pt-24">
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl">
        <Reveal className="grid items-end gap-8 lg:grid-cols-12">
          <h2 className="font-display text-5xl font-semibold leading-[0.98] tracking-[-0.03em] sm:text-7xl lg:col-span-8">
            Your next interview is
            <br />
            closer than your <span className="text-gradient">plan</span>.
          </h2>
          <div className="lg:col-span-4 lg:justify-self-end">
            <Link
              href="/signup"
              className="brand-gradient inline-flex rounded-md px-7 py-4 text-sm font-medium"
            >
              Start free
            </Link>
          </div>
        </Reveal>

        <div className="mt-24 flex flex-col justify-between gap-10 md:flex-row md:items-end">
          <div>
            <a href="#top" aria-label="placeo home">
              <Wordmark />
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Placement prep for students: plan, practise, get placed.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-3 text-sm">
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-16 flex flex-col justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} placeo</p>
          <p>Made for students who are tired of guessing.</p>
        </div>
      </div>
    </footer>
  )
}
