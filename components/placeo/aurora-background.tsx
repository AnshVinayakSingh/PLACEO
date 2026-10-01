'use client'

/**
 * Quiet backdrop: a faint ruled grid that fades out downward. No orbs, no blur.
 * Kept under the old name so existing imports keep working.
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, oklch(0.95 0.015 85 / 0.05) 1px, transparent 1px)',
          backgroundSize: '96px 100%',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 85%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 85%)',
        }}
      />
    </div>
  )
}
