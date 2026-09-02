'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { AuthShell } from '@/components/placeo/auth-shell'
import { GoogleSignInButton } from '@/components/placeo/google-signin-button'
import { cn } from '@/lib/utils'

function getStrength(password: string) {
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { label: 'Weak', color: 'bg-destructive', width: '33%' }
  if (score <= 3) return { label: 'Medium', color: 'bg-amber-400', width: '66%' }
  return { label: 'Strong', color: 'bg-emerald-400', width: '100%' }
}

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const strength = useMemo(() => getStrength(password), [password])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (name.trim().length < 2) nextErrors.name = 'Enter your full name'
    if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = 'Enter a valid email address'
    if (password.length < 6) nextErrors.password = 'Password must be at least 6 characters'
    if (confirm !== password) nextErrors.confirm = 'Passwords do not match'
    if (!agree) nextErrors.agree = 'You must accept the terms to continue'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrors({ form: data.error || 'Signup failed. Please try again.' })
        setSubmitting(false)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setErrors({ form: 'Network error. Please check your connection and try again.' })
      setSubmitting(false)
    }
  }

  return (
    <AuthShell quote="Build your AI-powered career roadmap in minutes — free to start, no credit card required.">
      <h1 className="font-display text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start your AI-powered placement prep today.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {errors.form && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {errors.form}
          </div>
        )}
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            Full Name
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Riya Sharma"
              className={cn(
                'glass h-11 w-full rounded-xl pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60',
                errors.name && 'ring-2 ring-destructive/60',
              )}
            />
          </div>
          {errors.name && <p className="mt-1.5 text-xs text-destructive">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={cn(
                'glass h-11 w-full rounded-xl pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60',
                errors.email && 'ring-2 ring-destructive/60',
              )}
            />
          </div>
          {errors.email && <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={cn(
                'glass h-11 w-full rounded-xl pl-10 pr-10 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60',
                errors.password && 'ring-2 ring-destructive/60',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {password && (
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn('h-full rounded-full transition-all', strength.color)}
                  style={{ width: strength.width }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{strength.label} password</p>
            </div>
          )}
          {errors.password && (
            <p className="mt-1.5 text-xs text-destructive">{errors.password}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className={cn(
                'glass h-11 w-full rounded-xl pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60',
                errors.confirm && 'ring-2 ring-destructive/60',
              )}
            />
          </div>
          {errors.confirm && <p className="mt-1.5 text-xs text-destructive">{errors.confirm}</p>}
        </div>

        <div>
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 size-4 rounded border-border accent-[oklch(0.62_0.2_265)]"
            />
            I agree to the{' '}
            <Link href="#" className="text-brand-cyan hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="#" className="text-brand-cyan hover:underline">
              Privacy Policy
            </Link>
          </label>
          {errors.agree && <p className="mt-1.5 text-xs text-destructive">{errors.agree}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="brand-gradient glow-ring flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-60"
        >
          {submitting ? 'Creating account...' : 'Create Account'}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <GoogleSignInButton />
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-cyan hover:underline">
          Login
        </Link>
      </p>
    </AuthShell>
  )
}
