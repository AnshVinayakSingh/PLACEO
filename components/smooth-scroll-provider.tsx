'use client'

import { useEffect, type ReactNode } from 'react'
import Lenis from 'lenis'

/** Site-wide buttery smooth scroll. Pure JS scroll interpolation — no WebGL cost. */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Reliable fix (per Lenis docs) so inner scrollable areas (chat windows,
      // dropdowns, etc.) scroll natively with the mouse wheel / trackpad
      // instead of being hijacked by the page-level smooth scroll.
      allowNestedScroll: true,
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    const id = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(id)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
