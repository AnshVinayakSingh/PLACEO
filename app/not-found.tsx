import Link from 'next/link'

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6"
    >
      <p className="eyebrow">404</p>
      <h1 className="font-display mt-4 text-5xl font-semibold leading-[1] tracking-[-0.03em] sm:text-6xl">
        That page does not <span className="text-gradient">exist</span>.
      </h1>
      <p className="mt-5 text-muted-foreground">
        The link may be old, or the address was typed wrong. Your plan is still where you left it.
      </p>
      <div className="mt-8 flex gap-5 text-sm">
        <Link href="/dashboard" className="brand-gradient rounded-md px-5 py-3 font-medium">
          Go to dashboard
        </Link>
        <Link href="/" className="self-center underline decoration-border underline-offset-[6px] hover:decoration-primary">
          Back to home
        </Link>
      </div>
    </main>
  )
}
