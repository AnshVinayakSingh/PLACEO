'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, RotateCcw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
        <AlertTriangle className="size-7" />
      </span>
      <div>
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          That's on us — an unexpected error occurred. Try again, or head back to your dashboard.
        </p>
      </div>
      <div className="mt-2 flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/70"
        >
          <RotateCcw className="size-4" />
          Try again
        </button>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-xl bg-[oklch(0.62_0.2_265)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          <Home className="size-4" />
          Dashboard
        </Link>
      </div>
    </div>
  )
}
