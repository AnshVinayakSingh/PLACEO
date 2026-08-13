'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Search } from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'

const companies = [
  { name: 'Google', questions: 412, color: 'oklch(0.62 0.2 265)' },
  { name: 'Amazon', questions: 388, color: 'oklch(0.7 0.19 60)' },
  { name: 'Microsoft', questions: 356, color: 'oklch(0.62 0.2 245)' },
  { name: 'Adobe', questions: 210, color: 'oklch(0.62 0.22 25)' },
  { name: 'Uber', questions: 198, color: 'oklch(0.2 0 0)' },
  { name: 'Atlassian', questions: 176, color: 'oklch(0.62 0.2 265)' },
  { name: 'Netflix', questions: 165, color: 'oklch(0.62 0.22 25)' },
  { name: 'Meta', questions: 340, color: 'oklch(0.62 0.2 265)' },
  { name: 'Apple', questions: 289, color: 'oklch(0.85 0.01 275)' },
  { name: 'Goldman Sachs', questions: 154, color: 'oklch(0.7 0.15 235)' },
  { name: 'Flipkart', questions: 231, color: 'oklch(0.7 0.19 250)' },
  { name: 'Zomato', questions: 122, color: 'oklch(0.62 0.22 25)' },
]

const topics = ['All', 'Arrays', 'Trees', 'Graphs', 'DP', 'Strings', 'Sorting']

export default function CodingHubPage() {
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState('All')

  const filtered = companies.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <PageShell
      title="Company-wise Coding Questions Hub"
      description="Top 50 companies · curated question sets by frequency and topic."
    >
      <div className="glass mb-4 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies..."
            className="glass h-10 w-full rounded-xl pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                topic === t ? 'brand-gradient text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.04 }}
            whileHover={{ y: -3 }}
            className="glass cursor-pointer rounded-2xl p-5"
          >
            <span
              className="flex size-11 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: c.color }}
            >
              {c.name[0]}
            </span>
            <h3 className="mt-3 text-sm font-semibold">{c.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{c.questions} questions · Top 100</p>
            <div className="mt-3 flex gap-1.5">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">Frequent</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">Trending</span>
            </div>
          </motion.div>
        ))}
      </div>
    </PageShell>
  )
}
