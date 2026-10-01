'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Reveal } from './reveal'

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger)

const indent = ['md:pl-8', 'md:pl-16', 'md:pl-24']

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
  const list = useRef<HTMLDivElement>(null)
  const line = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap = list.current
    const bar = line.current
    if (!wrap || !bar) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(bar, { scaleY: 1 })
      return
    }
    const tween = gsap.fromTo(
      bar,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: { trigger: wrap, start: 'top 70%', end: 'bottom 55%', scrub: true },
      },
    )
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [])

  return (
    <section id="process" className="relative border-y border-border bg-card/40 px-5 py-28">
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl">
        <Reveal>
          <p className="eyebrow">How it works</p>
          <h2 className="font-display mt-4 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.025em] sm:text-5xl">
            Three steps, and the loop repeats.
          </h2>
        </Reveal>

        <div ref={list} className="relative mt-14 border-t border-border">
          <div
            ref={line}
            aria-hidden="true"
            className="absolute left-0 top-0 h-full w-px origin-top bg-primary"
          />
        <ol>
          {steps.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 0.05}>
              <div
                className={`grid items-baseline gap-3 border-b border-border py-8 pl-5 sm:py-9 md:grid-cols-12 md:gap-8 ${indent[i] ?? ''}`}
              >
                <span className="font-display text-5xl font-medium leading-none text-primary sm:text-6xl md:col-span-2">
                  {s.n}
                </span>
                <h3 className="font-display text-2xl font-medium tracking-tight md:col-span-4">
                  {s.title}
                </h3>
                <p className="max-w-md leading-relaxed text-muted-foreground md:col-span-6">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
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
