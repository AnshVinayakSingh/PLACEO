'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger)

const links = [
  { label: 'Modules', href: '#modules' },
  { label: 'How it works', href: '#process' },
  { label: 'Students', href: '#students' },
  { label: 'FAQ', href: '#faq' },
]

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-xl font-semibold tracking-tight', className)}>
      placeo<span className="text-primary">.</span>
    </span>
  )
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = bar.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const tween = gsap.fromTo(
      el,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.2 },
      },
    )
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200',
        scrolled
          ? 'border-border bg-background/95'
          : 'border-transparent bg-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl 2xl:max-w-7xl items-center justify-between px-5">
        <a href="#top" aria-label="placeo home">
          <Wordmark />
        </a>

        <div className="hidden items-center gap-9 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="brand-gradient hidden rounded-md px-4 py-2 text-sm font-medium sm:inline-flex"
          >
            Start free
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="inline-flex size-11 items-center justify-center rounded-md border border-border md:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>
      <div
        ref={bar}
        aria-hidden="true"
        className="absolute inset-x-0 bottom-[-1px] h-px origin-left scale-x-0 bg-primary"
      />

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto flex max-w-6xl 2xl:max-w-7xl flex-col px-5 py-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-border/60 py-3 text-sm text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <div className="flex gap-2 pt-4">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-md border border-border py-2.5 text-center text-sm"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="brand-gradient flex-1 rounded-md py-2.5 text-center text-sm font-medium"
              >
                Start free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
