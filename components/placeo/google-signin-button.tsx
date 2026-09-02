'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

export function GoogleSignInButton() {
  const router = useRouter()
  const buttonRef = useRef<HTMLDivElement>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const [error, setError] = useState('')
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!scriptReady || !clientId || !buttonRef.current || !window.google) return

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        setError('')
        try {
          const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential }),
          })
          const data = await res.json()
          if (!res.ok) {
            setError(data.error || 'Google Sign-In failed.')
            return
          }
          router.push('/dashboard')
          router.refresh()
        } catch {
          setError('Network error. Please try again.')
        }
      },
    })

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'filled_black',
      size: 'large',
      width: 320,
      shape: 'pill',
      text: 'continue_with',
    })
  }, [scriptReady, clientId, router])

  if (!clientId) {
    return (
      <div className="glass flex h-11 w-full items-center justify-center rounded-xl text-xs text-muted-foreground">
        Google Sign-In not configured
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={buttonRef} className="flex w-full justify-center" />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
