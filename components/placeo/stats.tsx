'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'

type Stat = {
  value: number
  suffix: string
  label: string
}

const stats: Stat[] = [
  { value: 10000, suffix: '+', label: 'Students onboarded' },
  { value: 95, suffix: '%', label: 'Placement success rate' },
  { value: 500, suffix: '+', label: 'Hiring partners' },
  { value: 1200000, suffix: '+', label: 'AI sessions run' },
]

function formatValue(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}K`
  return `${n}`
}

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const duration = 1600
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(eased * value))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value])

  return (
    <span ref={ref} className="text-gradient font-display tabular-nums">
      {formatValue(display)}
      {suffix}
    </span>
  )
}

export function Stats() {
  return (
    <section className="relative px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="glass-strong grid gap-6 rounded-3xl p-8 sm:grid-cols-2 lg:grid-cols-4 lg:p-12">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="text-center"
            >
              <div className="text-4xl font-bold tracking-tight sm:text-5xl">
                <Counter value={s.value} suffix={s.suffix} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
