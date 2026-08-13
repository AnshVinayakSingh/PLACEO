'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { Sparkles, Star } from 'lucide-react'
import { AuroraBackground } from './aurora-background'

type AuthShellProps = {
  children: ReactNode
  quote?: string
}

export function AuthShell({ children, quote }: AuthShellProps) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden lg:flex-row">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <AuroraBackground />
      </div>

      {/* Left: form */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center justify-center gap-2 lg:justify-start">
            <span className="brand-gradient flex size-9 items-center justify-center rounded-xl text-primary-foreground shadow-lg">
              <Sparkles className="size-4" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight">PLACEO</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-strong glow-ring rounded-2xl p-6 sm:p-8"
          >
            {children}
          </motion.div>
        </div>
      </div>

      {/* Right: visual panel */}
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden border-l border-border lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-float-orb absolute left-1/4 top-1/4 size-72 rounded-full bg-brand-blue/20 blur-3xl" />
          <div className="animate-float-orb absolute bottom-1/4 right-1/4 size-72 rounded-full bg-brand-purple/20 blur-3xl [animation-delay:-6s]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-md px-10 text-center"
        >
          <div className="glass-strong glow-ring mx-auto flex size-16 items-center justify-center rounded-2xl">
            <Sparkles className="size-7 text-brand-cyan" />
          </div>
          <h2 className="font-display mt-6 text-2xl font-bold leading-tight">
            Your AI Career <span className="text-gradient">Operating System</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {quote ??
              'Join 10,000+ students using AI to plan smarter, interview better, and land their dream placement.'}
          </p>
          <div className="mt-6 flex items-center justify-center gap-1 text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="size-4 fill-current" />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
