'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { Bot, Loader2, Send, Sparkles, User } from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'

type Message = { role: 'user' | 'model'; text: string }

const STARTERS = [
  'Make me a 4-week DSA revision plan',
  'How do I answer "Tell me about yourself"?',
  'What skills do I need for a Full Stack role?',
  'Review my placement readiness honestly',
]

export default function AiMentorChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: "Hey! I'm your PLACEO AI Mentor. Ask me anything about interview prep, DSA, resumes, or your career roadmap — I'll give you direct, practical guidance.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    const nextMessages: Message[] = [...messages, { role: 'user', text }]
    setMessages(nextMessages)
    setInput('')
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        setLoading(false)
        return
      }
      setMessages((prev) => [...prev, { role: 'model', text: data.reply }])
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <PageShell title="AI Mentor Chat" description="Your always-on career mentor, powered by Gemini.">
      <div className="glass-strong flex h-[70vh] min-h-[480px] flex-col overflow-hidden rounded-2xl">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                  m.role === 'user'
                    ? 'bg-secondary text-muted-foreground'
                    : 'brand-gradient glow-ring text-primary-foreground'
                }`}
              >
                {m.role === 'user' ? <User className="size-4" /> : <Bot className="size-4" />}
              </span>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-brand-blue/15 text-foreground'
                    : 'glass text-foreground'
                }`}
              >
                {m.text}
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <span className="brand-gradient glow-ring flex size-8 shrink-0 items-center justify-center rounded-full text-primary-foreground">
                <Bot className="size-4" />
              </span>
              <div className="glass flex items-center gap-1.5 rounded-2xl px-4 py-3">
                <Loader2 className="size-3.5 animate-spin text-brand-cyan" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        {/* Starter prompts — shown only at the start of the conversation */}
        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3 sm:px-6">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Sparkles className="size-3 text-brand-cyan" />
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3 sm:p-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your AI mentor anything..."
            disabled={loading}
            className="glass h-11 flex-1 rounded-xl px-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="brand-gradient glow-ring flex size-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            aria-label="Send message"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </PageShell>
  )
}
