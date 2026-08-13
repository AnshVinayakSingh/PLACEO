'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
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

function FaqItem({ item, index }: { item: QA; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <Reveal delay={index * 0.04}>
      <div
        className={cn(
          'glass overflow-hidden rounded-2xl transition-colors',
          open && 'glow-ring',
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        >
          <span className="font-display font-semibold">{item.q}</span>
          <Plus
            className={cn(
              'size-5 shrink-0 text-muted-foreground transition-transform duration-300',
              open && 'rotate-45 text-foreground',
            )}
          />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <p className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  )
}

export function Faq() {
  return (
    <section id="faq" className="relative px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="glass inline-flex rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
            FAQ
          </span>
          <h2 className="font-display mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Questions? <span className="text-gradient">Answered.</span>
          </h2>
        </Reveal>

        <div className="mt-12 flex flex-col gap-3">
          {faqs.map((item, i) => (
            <FaqItem key={item.q} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
