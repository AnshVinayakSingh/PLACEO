'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowRight, Play } from 'lucide-react'
import { AuroraBackground } from './aurora-background'
import { TiltCard } from './tilt-card'

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
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="font-display mt-2 text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Your <span className="text-gradient">Career Operating System</span>{' '}
            For Placements
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease }}
            className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0"
          >
            Plan your roadmap, practice mock interviews, track your skills, and
            get resume feedback — all in one place, built for students
            preparing for placements.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease }}
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
              See how it works
            </a>
          </motion.div>
        </div>

        {/* Right mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease }}
          className="relative [perspective:1200px]"
        >
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
        </motion.div>
      </div>
    </section>
  )
}
