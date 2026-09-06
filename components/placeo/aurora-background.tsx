'use client'

/**
 * Floating animated gradient orbs + subtle grid.
 * Purely decorative background layer.
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(to right, oklch(0.98 0.02 275 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.98 0.02 275 / 0.06) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage:
            'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
        }}
      />

      {/* orbs */}
      <div className="animate-float-orb absolute -left-24 top-[-6rem] h-[26rem] w-[26rem] rounded-full bg-[oklch(0.62_0.24_300_/_0.35)] blur-[110px]" />
      <div
        className="animate-float-orb absolute right-[-6rem] top-24 h-[24rem] w-[24rem] rounded-full bg-[oklch(0.62_0.2_265_/_0.4)] blur-[120px]"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="animate-float-orb absolute left-1/2 top-[22rem] h-[20rem] w-[20rem] rounded-full bg-[oklch(0.75_0.15_220_/_0.28)] blur-[120px]"
        style={{ animationDelay: '-12s' }}
      />
    </div>
  )
}
