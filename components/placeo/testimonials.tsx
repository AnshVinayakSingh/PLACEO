'use client'

import Image from 'next/image'
import { Reveal } from './reveal'

type Testimonial = {
  quote: string
  name: string
  role: string
  avatar: string
}

const testimonials: Testimonial[] = [
  {
    quote:
      'My prep was scattered across five tabs. The roadmap put it in order, and the mock interviews made the real loop feel familiar.',
    name: 'Ananya Sharma',
    role: 'SDE Intern @ Google',
    avatar: '/avatar-1.png',
  },
  {
    quote:
      'The resume analyzer took my ATS score from 54 to 91. Callbacks started inside a week.',
    name: 'Marcus Johnson',
    role: 'Data Analyst @ Stripe',
    avatar: '/avatar-2.png',
  },
  {
    quote:
      'The skill chart showed exactly where I was weak. Three weeks of focused practice later I cleared the product round.',
    name: 'Mei Lin',
    role: 'APM @ Notion',
    avatar: '/avatar-3.png',
  },
  {
    quote:
      'Practising GDs with AI participants took the edge off my nerves. In the real one, I spoke first.',
    name: 'David Müller',
    role: 'Consultant @ McKinsey',
    avatar: '/avatar-4.png',
  },
]

export function Testimonials() {
  const [lead, ...rest] = testimonials
  return (
    <section id="students" className="relative px-5 py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="eyebrow">Students</p>
        </Reveal>

        <Reveal delay={0.05}>
          <blockquote className="mt-6 max-w-4xl">
            <p className="font-serif text-3xl leading-[1.15] tracking-[-0.01em] sm:text-5xl">
              &ldquo;{lead.quote}&rdquo;
            </p>
            <footer className="mt-8 flex items-center gap-4">
              <Image
                src={lead.avatar || '/placeholder.svg'}
                alt={lead.name}
                width={48}
                height={48}
                className="size-12 rounded-full object-cover grayscale"
              />
              <div className="text-sm">
                <div className="font-medium">{lead.name}</div>
                <div className="text-muted-foreground">{lead.role}</div>
              </div>
            </footer>
          </blockquote>
        </Reveal>

        <div className="mt-20 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {rest.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.05} className="flex flex-col justify-between bg-background p-7">
              <p className="leading-relaxed text-foreground/90">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-8 flex items-center gap-3">
                <Image
                  src={t.avatar || '/placeholder.svg'}
                  alt={t.name}
                  width={36}
                  height={36}
                  className="size-9 rounded-full object-cover grayscale"
                />
                <div className="text-sm">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
