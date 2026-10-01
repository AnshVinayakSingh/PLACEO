'use client'

import Link from 'next/link'
import { Reveal } from './reveal'
import { Wordmark } from './navbar'

const columns = [
  { title: 'Product', links: ['Modules', 'Roadmap', 'Interview simulator'] },
  { title: 'Company', links: ['About', 'Careers', 'Blog', 'Contact'] },
  { title: 'Resources', links: ['Help center', 'Community', 'Guides', 'Status'] },
  { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
]

export function Footer() {
  return (
    <footer className="relative border-t border-border px-5 pb-10 pt-24">
      <div className="mx-auto max-w-6xl">
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

        <div className="mt-24 grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <a href="#top" aria-label="placeo home">
              <Wordmark />
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Placement prep for students: plan, practise, get placed.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="eyebrow">{col.title}</h3>
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

        <div className="mt-16 flex flex-col justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} placeo</p>
          <p>Made for students who are tired of guessing.</p>
        </div>
      </div>
    </footer>
  )
}
