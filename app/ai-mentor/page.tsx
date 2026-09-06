'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Bot,
  Check,
  Copy,
  CornerUpLeft,
  History,
  Loader2,
  Pencil,
  Plus,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { PageShell } from '@/components/dashboard/page-shell'

type Message = { role: 'user' | 'model'; text: string; quotedText?: string }
type SessionSummary = { id: string; title: string; updatedAt: string }

const WELCOME: Message = {
  role: 'model',
  text: "Hey! 👋 I'm your PLACEO AI Mentor. Ask me anything — interview prep, DSA, resumes, your career roadmap, or honestly just life stuff. I'm here for all of it.",
}

const STARTERS = [
  'Make me a 4-week DSA revision plan',
  'How do I answer "Tell me about yourself"?',
  'What skills do I need for a Full Stack role?',
  'Review my placement readiness honestly',
]

function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`
}

export default function AiMentorChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<SessionSummary[] | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    autoGrow(textareaRef.current)
  }, [input])

  useEffect(() => {
    if (editingIndex !== null) autoGrow(editTextareaRef.current)
  }, [editingIndex, editValue])

  function loadHistory() {
    fetch('/api/chat-sessions')
      .then((res) => res.json())
      .then((data) => setHistory(data.sessions || []))
      .catch(() => setHistory([]))
  }

  function toggleHistory() {
    const next = !historyOpen
    setHistoryOpen(next)
    if (next && history === null) loadHistory()
  }

  async function openSession(id: string) {
    setHistoryOpen(false)
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/chat-sessions/${id}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not load that chat.')
        return
      }
      setMessages(data.messages?.length ? data.messages : [WELCOME])
      setSessionId(id)
    } catch {
      setError('Network error while loading that chat.')
    } finally {
      setLoading(false)
    }
  }

  function startNewChat() {
    setMessages([WELCOME])
    setSessionId(null)
    setReplyTo(null)
    setEditingIndex(null)
    setError('')
    setHistoryOpen(false)
  }

  async function sendMessage(text: string, quotedText?: string, historyOverride?: Message[]) {
    if (!text.trim() || loading) return
    const base = historyOverride ?? messages
    const userMessage: Message = { role: 'user', text, quotedText }
    const nextMessages: Message[] = [...base, userMessage]
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
        body: JSON.stringify({ messages: payloadMessages, sessionId: sessionId ?? undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        setLoading(false)
        return
      }
      setMessages((prev) => [...prev, { role: 'model', text: data.reply }])
      if (data.sessionId) setSessionId(data.sessionId)
      setHistory(null) // stale now — refetch next time the panel opens
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleTextareaKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input, replyTo ?? undefined)
    }
    // Shift+Enter: let the default newline behavior happen.
  }

  function handleCopy(text: string, index: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex((v) => (v === index ? null : v)), 1600)
    })
  }

  function startEdit(index: number, currentText: string) {
    setEditingIndex(index)
    setEditValue(currentText)
    setReplyTo(null)
  }

  function cancelEdit() {
    setEditingIndex(null)
    setEditValue('')
  }

  function saveEdit(index: number) {
    if (!editValue.trim()) return
    // Editing a message discards everything from that point onward (its old
    // reply included) and regenerates fresh, same as ChatGPT-style editing.
    const historyBeforeEdit = messages.slice(0, index)
    const quotedText = messages[index]?.quotedText
    setEditingIndex(null)
    setEditValue('')
    sendMessage(editValue, quotedText, historyBeforeEdit)
  }

  function handleEditKeyDown(e: KeyboardEvent<HTMLTextAreaElement>, index: number) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveEdit(index)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  return (
    <PageShell title="AI Mentor Chat" description="Your always-on career mentor, powered by Gemini.">
      <div className="glass-strong flex h-[70vh] min-h-[480px] flex-col overflow-hidden rounded-2xl">
        {/* Top bar: history + new chat */}
        <div className="relative flex items-center justify-between border-b border-border px-4 py-2.5 sm:px-6">
          <button
            onClick={toggleHistory}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <History className="size-3.5" />
            Recent chats
          </button>
          <button
            onClick={startNewChat}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Plus className="size-3.5" />
            New chat
          </button>

          <AnimatePresence>
            {historyOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="glass-strong glow-ring absolute left-4 top-11 z-20 w-72 rounded-xl p-2 sm:left-6"
              >
                <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Last 5 chats
                </p>
                {history === null && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {history?.length === 0 && (
                  <p className="px-2 py-2 text-xs text-muted-foreground">No previous chats yet.</p>
                )}
                {history?.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openSession(s.id)}
                    className={`w-full truncate rounded-lg px-2.5 py-2 text-left text-xs hover:bg-secondary ${
                      s.id === sessionId ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {s.title || 'Untitled chat'}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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

                {editingIndex === i ? (
                  <div className="w-full min-w-[240px]">
                    <textarea
                      ref={editTextareaRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, i)}
                      rows={1}
                      autoFocus
                      className="glass w-full resize-none rounded-2xl px-4 py-2.5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring/60"
                    />
                    <div className="mt-1.5 flex items-center justify-end gap-2">
                      <button
                        onClick={cancelEdit}
                        className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(i)}
                        disabled={!editValue.trim()}
                        className="brand-gradient rounded-md px-2.5 py-1 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        Save & regenerate
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
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
                      {m.role === 'user' && (
                        <button
                          onClick={() => startEdit(i, m.text)}
                          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Pencil className="size-3" />
                          Edit
                        </button>
                      )}
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
                  </>
                )}
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
        <div className="flex items-end gap-2 border-t border-border p-3 sm:p-4">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Ask your AI mentor anything... (Shift+Enter for a new line)"
            disabled={loading}
            rows={1}
            className="glass max-h-40 flex-1 resize-none rounded-xl px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60 disabled:opacity-60"
          />
          <button
            onClick={() => sendMessage(input, replyTo ?? undefined)}
            disabled={loading || !input.trim()}
            className="brand-gradient glow-ring flex size-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            aria-label="Send message"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </PageShell>
  )
}
