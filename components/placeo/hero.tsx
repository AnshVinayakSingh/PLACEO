'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { AuroraBackground } from './aurora-background'

const ease = [0.25, 0.1, 0.25, 1] as const

const roadmap = [
  { week: 'Wk 1', task: 'Arrays, hashing, two pointers', done: true },
  { week: 'Wk 2', task: 'Trees and graph traversal', done: true },
  { week: 'Wk 3', task: 'DP patterns: knapsack, LIS', done: false },
  { week: 'Wk 4', task: 'System design basics + 2 mock interviews', done: false },
]

export function Hero() {
  return (
    <section id="top" className="relative px-5 pb-24 pt-32 sm:pt-40">
      <AuroraBackground />

      <div className="relative mx-auto grid max-w-6xl gap-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease }}
            className="eyebrow"
          >
            Placement prep, in one place
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease }}
            className="font-display mt-5 text-[2.75rem] font-semibold leading-[0.98] tracking-[-0.03em] sm:text-6xl lg:text-[5.25rem]"
          >
            Stop guessing
            <br />
            what to <span className="text-gradient">practise</span> next.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease }}
            className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground"
          >
            placeo reads your skills and your target role, writes a week-by-week
            plan, and then lets you rehearse the real thing: mock interviews,
            group discussions, resume checks.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2, ease }}
            className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3"
          >
            <Link
              href="/signup"
              className="brand-gradient group inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-sm font-medium"
            >
              Build my plan
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#modules"
              className="text-sm text-foreground underline decoration-border underline-offset-[6px] transition-colors hover:decoration-primary"
            >
              See what is inside
            </a>
          </motion.div>
        </div>

        {/* A real slice of the product, built in HTML, not a floating screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease }}
          className="lg:col-span-5 lg:pt-6"
        >
          <div className="glass rounded-lg">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <span className="eyebrow">Your roadmap / SDE</span>
              <span className="font-mono text-xs text-primary">50%</span>
            </div>
            <ol className="divide-y divide-border">
              {roadmap.map((r) => (
                <li key={r.week} className="flex items-start gap-4 px-5 py-4">
                  <span className="font-mono text-xs text-muted-foreground pt-0.5 w-9 shrink-0">
                    {r.week}
                  </span>
                  <span
                    className={
                      r.done
                        ? 'text-sm text-muted-foreground line-through decoration-border'
                        : 'text-sm text-foreground'
                    }
                  >
                    {r.task}
                  </span>
                </li>
              ))}
            </ol>
            <div className="border-t border-border px-5 py-4">
              <div className="h-1 w-full bg-secondary">
                <div className="h-full w-1/2 bg-primary" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Sample plan. Yours is generated from your own skill check.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
