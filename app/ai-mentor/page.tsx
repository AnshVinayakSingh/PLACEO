'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { Bot, Check, Copy, CornerUpLeft, Loader2, Send, Sparkles, User, X } from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'

type Message = { role: 'user' | 'model'; text: string; quotedText?: string }

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
      text: "Hey! 👋 I'm your PLACEO AI Mentor. Ask me anything about interview prep, DSA, resumes, or your career roadmap — I'll give you direct, practical guidance (with a bit of fun along the way 🚀).",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text: string, quotedText?: string) {
    if (!text.trim() || loading) return
    const userMessage: Message = { role: 'user', text, quotedText }
    const nextMessages: Message[] = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setReplyTo(null)
    setError('')
    setLoading(true)

    // The model only needs to see the quote context on the final message —
    // the UI keeps quote and reply text visually separate.
    const payloadMessages = nextMessages.map((m, i) =>
      i === nextMessages.length - 1 && quotedText
        ? { role: m.role, text: `Replying to this earlier point: "${quotedText}"\n\n${m.text}` }
        : { role: m.role, text: m.text },
    )

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages }),
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
    sendMessage(input, replyTo ?? undefined)
  }

  function handleCopy(text: string, index: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex((v) => (v === index ? null : v)), 1600)
    })
  }

  return (
    <PageShell title="AI Mentor Chat" description="Your always-on career mentor, powered by Gemini.">
      <div className="glass-strong flex h-[70vh] min-h-[480px] flex-col overflow-hidden rounded-2xl">
        {/* Messages */}
        <div ref={scrollRef} data-lenis-prevent className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`group flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
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

              <div className={`flex max-w-[80%] flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                {m.quotedText && (
                  <div className="max-w-full truncate rounded-lg border-l-2 border-brand-cyan/50 bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground">
                    ↪ {m.quotedText}
                  </div>
                )}
                <div
                  className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user' ? 'bg-brand-blue/15 text-foreground' : 'glass text-foreground'
                  }`}
                >
                  {m.text}
                </div>

                {/* Actions — shown on hover (or always on touch devices) */}
                <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    onClick={() => setReplyTo(m.text)}
                    className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <CornerUpLeft className="size-3" />
                    Reply
                  </button>
                  {m.role === 'model' && (
                    <button
                      onClick={() => handleCopy(m.text, i)}
                      className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      {copiedIndex === i ? (
                        <>
                          <Check className="size-3 text-emerald-400" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" /> Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
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
            <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>
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

        {/* Reply preview */}
        {replyTo && (
          <div className="flex items-center justify-between gap-2 border-t border-border bg-secondary/40 px-4 py-2 sm:px-6">
            <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
              <CornerUpLeft className="size-3.5 shrink-0" />
              Replying to: <span className="truncate">{replyTo}</span>
            </p>
            <button
              onClick={() => setReplyTo(null)}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Cancel reply"
            >
              <X className="size-3.5" />
            </button>
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
