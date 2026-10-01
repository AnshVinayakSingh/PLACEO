'use client'

import { useLayoutEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AuroraBackground } from './aurora-background'
import { sceneState } from '@/components/three/scene-state'

const RoadmapScene = dynamic(() => import('@/components/three/roadmap-scene'), { ssr: false })

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger)

export function Hero() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      if (!reduce) {
        gsap.from('[data-hero-line]', { yPercent: 105, duration: 0.95, ease: 'power3.out', stagger: 0.1 })
        gsap.from('[data-hero-fade]', { opacity: 0, y: 14, duration: 0.7, ease: 'power2.out', stagger: 0.08, delay: 0.5 })
        gsap.from('[data-hero-scene]', { opacity: 0, duration: 1.2, delay: 0.3, ease: 'power1.out' })
      }
      // Scrolling out of the hero pushes the roadmap line forward.
      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          sceneState.progress = self.progress
        },
      })
    }, el)

    return () => {
      ctx.revert()
      sceneState.progress = 0
    }
  }, [])

  return (
    <section
      id="top"
      ref={root}
      className="relative px-5 pb-20 pt-28 sm:pt-36 lg:flex lg:min-h-[100dvh] lg:items-center lg:pb-24 lg:pt-28"
    >
      <AuroraBackground />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 sm:gap-14 lg:grid-cols-12 lg:gap-16 2xl:max-w-7xl">
        <div className="lg:col-span-7">
          <p data-hero-fade className="eyebrow">
            Placement prep, in one place
          </p>

          <h1 className="font-display mt-5 text-[clamp(2.35rem,8.5vw,3.9rem)] font-semibold leading-[0.98] tracking-[-0.03em] lg:text-[clamp(3.25rem,5.4vw,5.25rem)]">
            <span className="block overflow-hidden pb-[0.1em] -mb-[0.1em]">
              <span data-hero-line className="block">
                Stop guessing
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.1em] -mb-[0.1em]">
              <span data-hero-line className="block">
                what to <span className="text-gradient">practise</span> next.
              </span>
            </span>
          </h1>

          <p
            data-hero-fade
            className="mt-6 max-w-[34rem] text-base leading-relaxed text-muted-foreground sm:mt-7 sm:text-lg"
          >
            placeo reads your skills and your target role, writes a week-by-week plan, and then
            lets you rehearse the real thing: mock interviews, group discussions, resume checks.
          </p>

          <div data-hero-fade className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 sm:mt-9">
            <Link
              href="/signup"
              className="brand-gradient group inline-flex min-h-12 items-center gap-2 rounded-md px-6 py-3.5 text-sm font-medium"
            >
              Build my plan
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#modules"
              className="py-2 text-sm text-foreground underline decoration-border underline-offset-[6px] transition-colors hover:decoration-primary"
            >
              See what is inside
            </a>
          </div>
        </div>

        {/* 3D roadmap + a card that overlaps its edge */}
        <div className="relative lg:col-span-5">
          <div
            data-hero-scene
            className="relative aspect-[5/4] overflow-hidden rounded-lg border border-border bg-card/40 sm:aspect-[16/9] lg:aspect-auto lg:h-[min(36rem,68dvh)]"
          >
            <RoadmapScene scrollDriven className="absolute inset-0" />
          </div>

          <div
            data-hero-fade
            className="relative z-10 mx-3 -mt-10 rounded-md border border-border bg-background/95 p-4 sm:mx-6 sm:max-w-xs lg:absolute lg:-left-10 lg:bottom-8 lg:mx-0 lg:mt-0 lg:w-72"
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow">Week 3 · SDE plan</span>
              <span className="font-mono text-xs tabular-nums text-primary">43%</span>
            </div>
            <p className="mt-3 text-sm">DP patterns: knapsack, LIS</p>
            <div className="mt-3 h-px w-full bg-border">
              <div className="h-px w-[43%] bg-primary" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Next: system design basics, 2 mock interviews. Sample plan.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
