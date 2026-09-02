import { Analytics } from '@vercel/analytics/next'
import { SmoothScrollProvider } from '@/components/smooth-scroll-provider'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PLACEO — Your AI Career Operating System',
  description:
    'PLACEO is the AI career operating system for students. Build an AI roadmap, simulate interviews, analyze your skills and resume, and land your dream job faster.',
  generator: 'v0.app',
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
  themeColor: '#0a0a16',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${spaceGrotesk.variable}`}
    >
      <body className="bg-background antialiased">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
