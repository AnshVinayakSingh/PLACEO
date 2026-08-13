'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowRight, Play, Sparkles, Star } from 'lucide-react'
import { AuroraBackground } from './aurora-background'
import { TiltCard } from './tilt-card'

const AiOrbScene = dynamic(
  () => import('@/components/three/ai-orb').then((m) => m.AiOrbScene),
  { ssr: false },
)

const ease = [0.21, 0.47, 0.32, 0.98] as const

export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden px-4 pb-20 pt-36 sm:pt-40 lg:pb-28"
    >
      <AuroraBackground />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left copy */}
        <div className="text-center lg:text-left">
          <motion.a
            href="#features"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="glass mx-auto inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground lg:mx-0"
          >
            <span className="brand-gradient flex size-4 items-center justify-center rounded-full">
              <Sparkles className="size-2.5 text-primary-foreground" />
            </span>
            Powered by next-gen AI career models
          </motion.a>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease }}
            className="font-display mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            The <span className="text-gradient">AI Career Operating System</span>{' '}
            For Students
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease }}
            className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0"
          >
            Plan your roadmap, ace mock interviews, analyze your skills and
            resume, and land your dream placement — all in one intelligent
            platform built for ambitious students.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
          >
            <Link
              href="/signup"
              className="brand-gradient glow-ring group inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] sm:w-auto"
            >
              Get Started Free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="glass inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-white/5 sm:w-auto"
            >
              <Play className="size-4" />
              Watch Demo
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease }}
            className="mt-8 flex items-center justify-center gap-3 lg:justify-start"
          >
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((n) => (
                <Image
                  key={n}
                  src={`/avatar-${n}.png`}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 rounded-full border-2 border-background object-cover"
                />
              ))}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="size-3.5 fill-current" />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Loved by 10,000+ students
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease }}
          className="relative [perspective:1200px]"
        >
          <div className="pointer-events-none absolute inset-[-25%] -z-10 opacity-90">
            <AiOrbScene className="h-full w-full" />
          </div>

          <TiltCard className="group">
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="glass-strong glow-ring relative rounded-2xl p-2 shadow-2xl"
            >
              <Image
                src="/placeo-dashboard.png"
                alt="PLACEO dashboard preview showing an AI career roadmap, skill radar, and interview scores"
                width={900}
                height={640}
                priority
                className="w-full rounded-xl"
                style={{ transform: 'translateZ(40px)' }}
              />
            </motion.div>
          </TiltCard>

          {/* floating chips */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="glass-strong absolute -left-4 top-10 hidden rounded-xl px-3 py-2 text-xs font-medium shadow-xl sm:block"
          >
            <span className="text-gradient font-semibold">95%</span> success rate
          </motion.div>
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            className="glass-strong absolute -right-3 bottom-12 hidden rounded-xl px-3 py-2 text-xs font-medium shadow-xl sm:block"
          >
            AI Roadmap ready
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
