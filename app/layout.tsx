import { Analytics } from '@vercel/analytics/next'
import { SmoothScrollProvider } from '@/components/smooth-scroll-provider'
import { GDInviteProvider } from '@/components/gd-simulator/gd-invite-provider'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Onest, Bricolage_Grotesque, Instrument_Serif, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const onest = Onest({
  subsets: ['latin'],
  variable: '--font-onest',
  display: 'swap',
})

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
})

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PLACEO — Your AI Career Operating System',
  description:
    'PLACEO is the AI career operating system for students. Build an AI roadmap, simulate interviews, analyze your skills and resume, and land your dream job faster.',
  keywords: [
    'AI career platform',
    'student careers',
    'interview simulator',
    'resume analyzer',
    'skill analyzer',
    'placement preparation',
  ],
  openGraph: {
    title: 'PLACEO — Your AI Career Operating System',
    description:
      'The AI career operating system for students. Roadmaps, interview simulation, skill and resume analysis — all in one platform.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#171513',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark ${onest.variable} ${bricolage.variable} ${instrument.variable} ${plexMono.variable}`}
    >
      <body className="bg-background antialiased">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <GDInviteProvider />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
