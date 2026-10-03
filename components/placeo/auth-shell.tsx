'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion } from 'motion/react'
import { Wordmark } from './navbar'

const RoadmapScene = dynamic(() => import('@/components/three/roadmap-scene'), { ssr: false })

type AuthShellProps = {
  children: ReactNode
  quote?: string
}

export function AuthShell({ children, quote }: AuthShellProps) {
  return (
    <div className="relative flex min-h-dvh flex-col lg:flex-row">
      {/* Left: form */}
      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 inline-block" aria-label="placeo home">
            <Wordmark className="text-2xl" />
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-lg border border-border bg-card p-6 sm:p-8"
          >
            {children}
          </motion.div>
        </div>
      </div>

      {/* Right: editorial panel */}
      <div className="relative hidden flex-1 flex-col justify-between border-l border-border bg-card/50 p-14 lg:flex">
        <p className="eyebrow">placeo / career os</p>
        <div className="relative my-8 min-h-[16rem] flex-1">
          <RoadmapScene scrollDriven={false} className="absolute inset-0" />
        </div>
        <div>
          <p className="font-serif text-3xl leading-[1.15] tracking-[-0.01em] xl:text-4xl">
            {quote ??
              'A plan you can follow beats a hundred tabs you will never read.'}
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            Roadmaps, interviews, GDs and resume checks, in one place.
          </p>
        </div>
      </div>
    </div>
  )
}
