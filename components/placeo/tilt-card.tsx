'use client'

import type { ReactNode } from 'react'

type TiltCardProps = {
  children: ReactNode
  className?: string
}

/**
 * Formerly a 3D mouse-tilt wrapper. The tilt is gone (it read as a template
 * effect); the component stays as a plain container so call sites don't break.
 */
export function TiltCard({ children, className }: TiltCardProps) {
  return <div className={className}>{children}</div>
}
