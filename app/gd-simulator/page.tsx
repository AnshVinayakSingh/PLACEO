'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Clock, MessagesSquare, Play, Users } from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'

const topics = [
  { title: 'Is AI a threat to jobs?', category: 'Technology', participants: 5 },
  { title: 'Should college attendance be mandatory?', category: 'Education', participants: 4 },
  { title: 'Startups vs corporate jobs for freshers', category: 'Startups', participants: 5 },
  { title: 'Social media: boon or bane?', category: 'Social', participants: 6 },
  { title: 'Is remote work the future?', category: 'Current Affairs', participants: 4 },
  { title: 'Should exams be abolished?', category: 'Education', participants: 5 },
]

export default function GdSimulatorPage() {
  const [selected, setSelected] = useState(topics[0].title)

  return (
    <PageShell
      title="AI Group Discussion Simulator"
      description="Practice with AI participants in a realistic, timed GD environment."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {topics.map((t, i) => (
          <motion.button
            key={t.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            onClick={() => setSelected(t.title)}
            whileHover={{ y: -3 }}
            className={`glass rounded-2xl p-5 text-left transition-colors ${
              selected === t.title ? 'glow-ring ring-2 ring-brand-purple/50' : ''
            }`}
          >
            <span className="rounded-full bg-brand-purple/15 px-2.5 py-1 text-[11px] font-medium text-brand-purple">
              {t.category}
            </span>
            <h3 className="mt-3 text-sm font-semibold leading-snug">{t.title}</h3>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" /> {t.participants} AI participants · 10 min round
            </p>
          </motion.button>
        ))}
      </div>

      <div className="glass mt-4 flex flex-col items-center justify-between gap-4 rounded-2xl p-6 sm:flex-row">
        <div className="flex items-center gap-4">
          <span className="brand-gradient glow-ring flex size-12 items-center justify-center rounded-xl text-primary-foreground">
            <MessagesSquare className="size-6" />
          </span>
          <div>
            <p className="text-sm font-semibold">{selected}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" /> 10-minute timed round · Voice interaction enabled
            </p>
          </div>
        </div>
        <button className="brand-gradient glow-ring flex shrink-0 items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]">
          <Play className="size-4" />
          Start Discussion
        </button>
      </div>
    </PageShell>
  )
}
