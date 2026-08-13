'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { Reveal } from './reveal'

type Testimonial = {
  quote: string
  name: string
  role: string
  avatar: string
}

const testimonials: Testimonial[] = [
  {
    quote:
      'PLACEO turned my scattered prep into a clear roadmap. The mock interviews felt scarily real — I walked into my Google loop already calm.',
    name: 'Ananya Sharma',
    role: 'SDE Intern @ Google',
    avatar: '/avatar-1.png',
  },
  {
    quote:
      'The resume analyzer bumped my ATS score from 54 to 91. I started getting callbacks within a week. This is the edge every student needs.',
    name: 'Marcus Johnson',
    role: 'Data Analyst @ Stripe',
    avatar: '/avatar-2.png',
  },
  {
    quote:
      'The skill radar showed exactly where I was weak. Three weeks of targeted practice later, I cleared my dream product role.',
    name: 'Mei Lin',
    role: 'APM @ Notion',
    avatar: '/avatar-3.png',
  },
  {
    quote:
      'GD Simulator is genius. Practicing with AI participants killed my nerves completely. I led my actual group discussion with confidence.',
    name: 'David Müller',
    role: 'Consultant @ McKinsey',
    avatar: '/avatar-4.png',
  },
]

export function Testimonials() {
  const [index, setIndex] = useState(0)
  const count = testimonials.length

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count])
  const prev = () => setIndex((i) => (i - 1 + count) % count)

  useEffect(() => {
    const id = setInterval(next, 6000)
    return () => clearInterval(id)
  }, [next])

  const t = testimonials[index]

  return (
    <section id="testimonials" className="relative px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="glass inline-flex rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
            Loved by students
          </span>
          <h2 className="font-display mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Results that speak for{' '}
            <span className="text-gradient">themselves</span>
          </h2>
        </Reveal>

        <div className="relative mt-12">
          <div className="glass-strong glow-ring overflow-hidden rounded-3xl p-8 sm:p-12">
            <Quote className="size-9 text-[oklch(0.62_0.2_265)]" />
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <p className="mt-4 text-balance text-lg font-medium leading-relaxed sm:text-2xl">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <footer className="mt-8 flex items-center gap-4">
                  <Image
                    src={t.avatar || '/placeholder.svg'}
                    alt={t.name}
                    width={52}
                    height={52}
                    className="size-12 rounded-full border-2 border-white/10 object-cover"
                  />
                  <div>
                    <div className="font-display font-semibold">{t.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {t.role}
                    </div>
                  </div>
                </footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous testimonial"
              className="glass inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/5"
            >
              <ChevronLeft className="size-5" />
            </button>
            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                  className={
                    i === index
                      ? 'brand-gradient h-2 w-6 rounded-full transition-all'
                      : 'h-2 w-2 rounded-full bg-white/20 transition-all hover:bg-white/40'
                  }
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              aria-label="Next testimonial"
              className="glass inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/5"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
