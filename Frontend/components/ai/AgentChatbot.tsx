'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { Icons } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
  agent?: string
}

// ─── Agent Labels ────────────────────────────────────────────────────────────

const AGENT_TAGS = [
  { keyword: 'orchestrat', label: '🧠 Orchestrator', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { keyword: 'enrich', label: '🔍 Enrichment', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { keyword: 'outreach', label: '✉️ Outreach', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { keyword: 'governance', label: '🛡️ Governance', color: 'text-amber-600 bg-amber-50 border-amber-200' },
]

function detectAgent(content: string): { label: string; color: string } | null {
  const lower = content.toLowerCase()
  return AGENT_TAGS.find(a => lower.includes(a.keyword)) ?? null
}

// ─── Inline markdown renderer ────────────────────────────────────────────────

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    const trim = line.trim()
    if (!trim) return <div key={i} className="h-1" />
    if (trim.startsWith('### ')) return <p key={i} className="font-bold text-slate-800 text-[13px] mt-2 first:mt-0">{trim.slice(4)}</p>
    if (trim.startsWith('## ')) return <p key={i} className="font-bold text-slate-900 text-sm mt-2 first:mt-0">{trim.slice(3)}</p>
    if (trim.startsWith('* ') || trim.startsWith('- ')) {
      return (
        <div key={i} className="flex gap-2 items-start text-[13px]">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
          <span className="text-slate-600">{formatInline(trim.slice(2))}</span>
        </div>
      )
    }
    if (/^\d+\.\s/.test(trim)) {
      const match = trim.match(/^(\d+)\.\s(.*)/)
      if (match) return (
        <div key={i} className="flex gap-2 text-[13px]">
          <span className="text-blue-500 font-bold shrink-0">{match[1]}.</span>
          <span className="text-slate-600">{formatInline(match[2])}</span>
        </div>
      )
    }
    if (trim.startsWith('|')) {
      return <p key={i} className="text-[12px] font-mono text-slate-600 leading-5">{trim}</p>
    }
    return <p key={i} className="text-[13px] text-slate-700 leading-relaxed">{formatInline(trim)}</p>
  })
}

function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*)|(`[^`]+`)|(\*[^*]+\*)/g
  let last = 0
  let m
  let k = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const seg = m[0]
    if (seg.startsWith('**')) parts.push(<strong key={k++} className="font-semibold text-slate-800">{seg.slice(2, -2)}</strong>)
    else if (seg.startsWith('`')) parts.push(<code key={k++} className="px-1 py-0.5 bg-slate-100 rounded text-[11px] font-mono text-blue-700">{seg.slice(1, -1)}</code>)
    else parts.push(<em key={k++} className="italic">{seg.slice(1, -1)}</em>)
    last = regex.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

// ─── Quick Action Chips ──────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Active agents', msg: 'Show all active agents' },
  { label: 'System telemetry', msg: 'Get system telemetry report' },
  { label: 'Workbench queue', msg: 'What exceptions are in the Workbench?' },
  { label: 'Talk to Governance', msg: 'Talk to Governance Agent' },
]

// ─── Chat Widget ─────────────────────────────────────────────────────────────

export function AgentChatbot() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [unread, setUnread] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200)
      setUnread(0)
    }
  }, [isOpen])

  // Escape to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) setIsOpen(false) }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen])

  const addMsg = useCallback((msg: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => {
      if (msg.role === 'assistant' && !msg.isLoading) {
        const filtered = prev.filter(m => !m.isLoading)
        return [...filtered, { ...msg, id: crypto.randomUUID(), timestamp: new Date() }]
      }
      return [...prev, { ...msg, id: crypto.randomUUID(), timestamp: new Date() }]
    })
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    const text = content.trim()
    if (!text) return
    setInput('')
    addMsg({ role: 'user', content: text })
    addMsg({ role: 'assistant', content: '', isLoading: true })
    setIsTyping(true)

    try {
      const data = await apiClient.post<{ response: string }>('/api/ai/chat', {
        message: text,
        history: messages
          .filter(m => !m.isLoading)
          .slice(-10)
          .map(m => ({ role: m.role, content: m.content })),
        context: { source: 'chatbot-widget', page: window.location.pathname },
      })
      const agent = detectAgent(data.response)
      addMsg({ role: 'assistant', content: data.response || 'No response.', agent: agent?.label })
      if (!isOpen) setUnread(u => u + 1)
    } catch {
      addMsg({ role: 'assistant', content: 'Sorry, I couldn\'t connect to the agent network. Please try again.' })
    } finally {
      setIsTyping(false)
    }
  }, [addMsg, messages, isOpen])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className={cn(
              'fixed bottom-24 right-6 z-50',
              'w-[380px] h-[560px]',
              'bg-white rounded-2xl shadow-2xl shadow-slate-300/60',
              'border border-slate-200',
              'flex flex-col overflow-hidden',
            )}
            id="agent-chatbot-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <Icons.sparkles className="h-5 w-5 text-white" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">AutoPilot AI</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-[10px] font-semibold text-blue-100">Multi-Agent Network · 4 agents online</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMessages([])}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="Clear chat"
                >
                  <Icons.trash className="h-4 w-4 text-white/70" strokeWidth={1.8} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="Close (Esc)"
                >
                  <Icons.close className="h-4 w-4 text-white/70" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Agent System Banner */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 shrink-0">
              <Icons.network className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Communicating via Supervity Workflow Engine
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center text-center pt-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 mb-4">
                    <Icons.messageSquare className="h-8 w-8 text-blue-500" strokeWidth={1.5} />
                  </div>
                  <p className="font-semibold text-slate-700 text-sm">How can I help you?</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[260px]">
                    I coordinate 4 AI agents — Orchestrator, Enrichment, Outreach, and Governance.
                  </p>
                  {/* Quick action chips */}
                  <div className="mt-5 flex flex-wrap gap-2 justify-center">
                    {QUICK_ACTIONS.map(a => (
                      <button
                        key={a.label}
                        onClick={() => sendMessage(a.msg)}
                        className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all"
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-2.5',
                      msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    )}
                  >
                    {/* Avatar */}
                    <div className="shrink-0 mt-0.5">
                      {msg.role === 'user' ? (
                        <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold">
                          {(session?.user?.name?.[0] || 'U').toUpperCase()}
                        </div>
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                          <Icons.sparkles className="h-3.5 w-3.5 text-white" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>

                    {/* Bubble */}
                    <div className={cn('flex flex-col max-w-[82%]', msg.role === 'user' ? 'items-end' : 'items-start')}>
                      {/* Agent tag */}
                      {msg.agent && (
                        <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border mb-1', detectAgent(msg.content)?.color)}>
                          {msg.agent}
                        </span>
                      )}

                      <div className={cn(
                        'rounded-2xl px-3.5 py-2.5',
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-slate-50 border border-slate-200 rounded-bl-sm',
                        msg.isLoading && 'animate-pulse'
                      )}>
                        {msg.isLoading ? (
                          <div className="flex items-center gap-1.5 py-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            <span className="text-[12px] text-slate-400 ml-1">Thinking…</span>
                          </div>
                        ) : msg.role === 'user' ? (
                          <p className="text-[13px] leading-relaxed text-white">{msg.content}</p>
                        ) : (
                          <div className="space-y-1">{renderMarkdown(msg.content)}</div>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                        {msg.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-slate-100 px-3 py-3 bg-white">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus-within:border-blue-400 focus-within:bg-white transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isTyping}
                  placeholder="Ask the agent network…"
                  className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-800 placeholder-slate-400 disabled:opacity-50"
                  id="chatbot-input"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isTyping}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                    input.trim() && !isTyping
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <Icons.arrowRight className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
              <p className="text-center text-[10px] text-slate-300 mt-2">
                Powered by Supervity · Enter to send
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Toggle Button */}
      <motion.button
        id="agent-chatbot-toggle"
        onClick={() => setIsOpen(o => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'flex h-14 w-14 items-center justify-center rounded-full',
          'bg-gradient-to-br from-blue-600 to-indigo-600',
          'shadow-xl shadow-blue-500/30',
          'text-white',
          'transition-all duration-300',
          isOpen && 'from-slate-700 to-slate-800'
        )}
        aria-label="Toggle AI assistant"
        title="Open AutoPilot AI"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Icons.close className="h-6 w-6" strokeWidth={2} />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Icons.sparkles className="h-6 w-6" strokeWidth={1.8} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unread badge */}
        <AnimatePresence>
          {unread > 0 && !isOpen && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm"
            >
              {unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  )
}
