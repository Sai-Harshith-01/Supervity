'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { Icons } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

interface LogLine {
  id: string
  text: string
  type: 'system' | 'input' | 'output' | 'success' | 'error' | 'warning' | 'info' | 'separator'
}

// ─── Command History Hook ───────────────────────────────────────────────────

function useCommandHistory() {
  const [history, setHistory] = useState<string[]>([])
  const [index, setIndex] = useState(-1)

  const push = (cmd: string) => {
    setHistory(prev => [cmd, ...prev.slice(0, 49)])
    setIndex(-1)
  }

  const navigateUp = useCallback((current: string, history: string[]) => {
    const next = index + 1
    if (next < history.length) {
      setIndex(next)
      return history[next]
    }
    return current
  }, [index])

  const navigateDown = useCallback((history: string[]) => {
    const next = index - 1
    if (next < 0) {
      setIndex(-1)
      return ''
    }
    setIndex(next)
    return history[next]
  }, [index])

  return { history, push, navigateUp, navigateDown }
}

// ─── Color-coded log line renderer ──────────────────────────────────────────

function LogLineView({ line }: { line: LogLine }) {
  const styles: Record<LogLine['type'], string> = {
    system: 'text-slate-500 font-mono',
    input: 'text-blue-600 font-mono font-semibold',
    output: 'text-slate-700 font-mono',
    success: 'text-emerald-600 font-mono',
    error: 'text-red-500 font-mono',
    warning: 'text-amber-600 font-mono',
    info: 'text-indigo-500 font-mono',
    separator: 'text-slate-300 font-mono',
  }

  if (line.type === 'separator') {
    return <div className="border-t border-slate-200 my-1 opacity-50" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.12 }}
      className={cn('text-[13px] leading-6 whitespace-pre-wrap break-all', styles[line.type])}
    >
      {line.text}
    </motion.div>
  )
}

// ─── Agent Status Bar ──────────────────────────────────────────────────────

const AGENTS = [
  { name: 'Orchestrator', status: 'active', color: 'bg-blue-500', dot: 'bg-blue-400' },
  { name: 'Enrichment', status: 'ready', color: 'bg-emerald-500', dot: 'bg-emerald-400' },
  { name: 'Outreach', status: 'ready', color: 'bg-purple-500', dot: 'bg-purple-400' },
  { name: 'Governance', status: 'active', color: 'bg-amber-500', dot: 'bg-amber-400' },
]

function AgentStatusBar() {
  return (
    <div className="flex items-center gap-4 px-6 py-2 bg-slate-50 border-b border-slate-200">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">Live Agents</span>
      {AGENTS.map(agent => (
        <div key={agent.name} className="flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', agent.dot)} />
          <span className="text-[11px] font-semibold text-slate-600">{agent.name}</span>
          <span className={cn(
            'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full text-white',
            agent.color
          )}>
            {agent.status}
          </span>
        </div>
      ))}
      <div className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Supervity Connected
      </div>
    </div>
  )
}

// ─── Main Terminal Page ─────────────────────────────────────────────────────

const WELCOME_LINES: LogLine[] = [
  { id: 'w1', type: 'separator', text: '' },
  { id: 'w2', type: 'system', text: '╔══════════════════════════════════════════════════════════════════════╗' },
  { id: 'w3', type: 'system', text: '║     AUTOPILOT ENTERPRISE · COMMAND LINE CENTER · v2.0              ║' },
  { id: 'w4', type: 'system', text: '║     Multi-Agent Workforce Interoperable Console                      ║' },
  { id: 'w5', type: 'system', text: '╚══════════════════════════════════════════════════════════════════════╝' },
  { id: 'w6', type: 'separator', text: '' },
  { id: 'w7', type: 'info', text: '[SYSTEM]  Interoperable AI Console active at http://localhost:8001' },
  { id: 'w8', type: 'info', text: '[SYSTEM]  Supervity Workflow Engine: CONNECTED (workflow: 019e332c)' },
  { id: 'w9', type: 'info', text: '[GOVT]    GDPR Article 17, SEC Rule 17a-4, SOC2 policy modules: ONLINE' },
  { id: 'w10', type: 'success', text: '[STATUS]  4 autonomous agents loaded and reporting ready.' },
  { id: 'w11', type: 'separator', text: '' },
  { id: 'w12', type: 'system', text: "Type 'help' to see available workforce operations." },
  { id: 'w13', type: 'separator', text: '' },
]

const COMMANDS: Record<string, (arg: string) => LogLine[]> = {
  help: () => [
    { id: '', type: 'info', text: '┌─ AVAILABLE COMMANDS ─────────────────────────────────────────────────┐' },
    { id: '', type: 'output', text: '  help                        Display this workforce instruction manual.' },
    { id: '', type: 'output', text: '  agents                      List active autonomous agents.' },
    { id: '', type: 'output', text: '  policies                    Audit registered AI governance policies.' },
    { id: '', type: 'output', text: '  enrich <domain>             Execute lead profiling (GDPR compliant).' },
    { id: '', type: 'output', text: '  audit                       Query immutable system execution logs.' },
    { id: '', type: 'output', text: '  workbench                   List pending HITL exception queue.' },
    { id: '', type: 'output', text: '  workbench resolve <id>       Resolve a pending policy exception.' },
    { id: '', type: 'output', text: '  status                      Full system health & diagnostics.' },
    { id: '', type: 'output', text: '  clear                       Clear the console window.' },
    { id: '', type: 'output', text: '  <any text>                  Route query to Supervity AI backend.' },
    { id: '', type: 'info', text: '└──────────────────────────────────────────────────────────────────────┘' },
  ],

  agents: () => [
    { id: '', type: 'info', text: '🔍 ACTIVE WORKFORCE AGENTS (4 ONLINE):' },
    { id: '', type: 'separator', text: '' },
    { id: '', type: 'success', text: '  [●] Orchestrator Agent   ACTIVE  │ Session: #524  │ State: Smart Pitch' },
    { id: '', type: 'success', text: '  [●] Enrichment Agent     READY   │ Latency: 14ms  │ Target: Acme Corp' },
    { id: '', type: 'success', text: '  [●] Outreach Agent       READY   │ Mode: Sequencer│ SMTP: Outlook (OK)' },
    { id: '', type: 'warning', text: '  [●] Governance Agent     ACTIVE  │ Rules: 18      │ Exceptions: 3' },
  ],

  policies: () => [
    { id: '', type: 'info', text: '🛡️ REGISTERED GOVERNMENT COMPLIANCE & AI POLICIES:' },
    { id: '', type: 'separator', text: '' },
    { id: '', type: 'success', text: '  [1] GDPR Article 17 — Privacy Safeguard                  [ACTIVE]' },
    { id: '', type: 'output', text: '      Scans lead metadata. Masks personal PII automatically.' },
    { id: '', type: 'success', text: '      Compliance Audit: 100% ✓' },
    { id: '', type: 'separator', text: '' },
    { id: '', type: 'success', text: '  [2] SEC Rule 17a-4 — Immutable Record Retention            [ACTIVE]' },
    { id: '', type: 'output', text: '      Archives CRM synchronizations immutably to encrypted history.' },
    { id: '', type: 'success', text: '      Compliance Audit: 100% ✓' },
    { id: '', type: 'separator', text: '' },
    { id: '', type: 'warning', text: '  [3] SOC2 — Transaction Guardrail ($50K threshold)          [ACTIVE]' },
    { id: '', type: 'output', text: '      Intercepts purchases >$50K, routing to AI Workbench.' },
    { id: '', type: 'warning', text: '      Compliance Audit: 99.8% (3 exceptions logged)' },
  ],

  audit: () => [
    { id: '', type: 'info', text: '📜 IMMUTABLE AUDIT LOG (LAST 5 RECORDS):' },
    { id: '', type: 'separator', text: '' },
    { id: '', type: 'success', text: '  [2026-05-17 09:30:14] INFO     GDPR privacy safeguard audit passed (Acme Corp).' },
    { id: '', type: 'success', text: '  [2026-05-17 09:28:45] INFO     SEC Rule 17a-4 sync transaction immutably archived.' },
    { id: '', type: 'warning', text: '  [2026-05-17 09:20:12] WARNING  SOC2 Limit exceeded ($55,000) → exception routed.' },
    { id: '', type: 'info',    text: '  [2026-05-17 09:14:02] INFO     Lead Scorers initiated scoring calculation loop.' },
    { id: '', type: 'info',    text: '  [2026-05-17 09:08:44] INFO     SMTP Outlook handshake verified.' },
  ],

  workbench: (arg: string) => {
    if (arg.startsWith('resolve ')) {
      const id = arg.replace('resolve ', '').trim()
      if (!id) return [{ id: '', type: 'error', text: '  Error: Exception ID required. Usage: workbench resolve <id>' }]
      return [
        { id: '', type: 'info', text: `  [SYSTEM] Authorizing manual resolution override for exception #${id}...` },
        { id: '', type: 'info', text: '  [SOC2]   Registering human operator signature...' },
        { id: '', type: 'info', text: '  [SYSTEM] Overriding CFO Transaction threshold rule.' },
        { id: '', type: 'success', text: `  [STATUS] Exception #${id} resolved! Resuming workflow pipeline sync. ✓` },
      ]
    }
    return [
      { id: '', type: 'warning', text: '🛠️ AI WORKBENCH QUEUE SUMMARY (3 PENDING):' },
      { id: '', type: 'separator', text: '' },
      { id: '', type: 'error',   text: '  [#1209] Clearbit API token exception        Severity: LOW    │ 14m ago' },
      { id: '', type: 'error',   text: '  [#1208] Transaction CFO limit exceeded       Severity: HIGH   │ 1h ago' },
      { id: '', type: 'warning', text: '  [#1207] Outlook SMTP delivery bounce         Severity: MEDIUM │ 2h ago' },
      { id: '', type: 'separator', text: '' },
      { id: '', type: 'output',  text: "  Type 'workbench resolve <id>' to resolve an exception." },
    ]
  },

  status: () => [
    { id: '', type: 'info', text: '📊 SYSTEM HEALTH & DIAGNOSTICS:' },
    { id: '', type: 'separator', text: '' },
    { id: '', type: 'success', text: '  API Backend      http://localhost:8001    ● ONLINE' },
    { id: '', type: 'success', text: '  Supervity Engine https://auto-workflow-api ● CONNECTED' },
    { id: '', type: 'success', text: '  PostgreSQL DB    localhost:5432           ● CONNECTED' },
    { id: '', type: 'success', text: '  Clearbit API     clearbit.com             ● OPERATIONAL' },
    { id: '', type: 'success', text: '  Outlook SMTP     smtp.office365.com       ● CONNECTED' },
    { id: '', type: 'separator', text: '' },
    { id: '', type: 'success', text: '  Total Sessions   524 active loops' },
    { id: '', type: 'success', text: '  Success Rate     98.0%' },
    { id: '', type: 'success', text: '  Compliance Score 99.8% (SOC2 Certified)' },
  ],

  enrich: (arg: string) => {
    if (!arg) return [{ id: '', type: 'error', text: '  Error: Domain required. Usage: enrich <domain>  e.g. enrich acme.com' }]
    return [
      { id: '', type: 'info', text: `  [Enrichment] Triggering company profiling for domain: ${arg}...` },
      { id: '', type: 'info', text: '  [INFO]       Consulting Clearbit database metrics...' },
      { id: '', type: 'warning', text: '  [GDPR]       Article 17 check triggered.' },
      { id: '', type: 'success', text: '               Personal Details Scraped? NO (public B2B record)' },
      { id: '', type: 'success', text: '               Consent required? NOT REQUIRED (B2B)' },
      { id: '', type: 'success', text: '               Audit Status: COMPLIANT ✓ PII safety check passed.' },
      { id: '', type: 'success', text: `  [CRM]        Synchronizing metadata to HubSpot [SEC 17a-4 Compliant]` },
      { id: '', type: 'success', text: `  [STATUS]     Lead ${arg} enriched, scored, and synced successfully! ✓` },
    ]
  },
}

export default function TerminalPage() {
  const [logs, setLogs] = useState<LogLine[]>(WELCOME_LINES)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { history, push, navigateUp, navigateDown } = useCommandHistory()

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs, isLoading])

  // Focus input on click anywhere on terminal
  const focusInput = () => inputRef.current?.focus()

  const addLines = (lines: Omit<LogLine, 'id'>[]) => {
    setLogs(prev => [
      ...prev,
      ...lines.map(l => ({ ...l, id: crypto.randomUUID() })),
    ])
  }

  const executeCommand = useCallback(async (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    push(trimmed)

    // Echo input
    addLines([{ type: 'input', text: `autopilot@command-center:~$ ${trimmed}` }])
    setIsLoading(true)

    await new Promise(r => setTimeout(r, 300))

    const parts = trimmed.split(' ')
    const cmd = parts[0].toLowerCase()
    const arg = parts.slice(1).join(' ')

    if (cmd === 'clear') {
      setLogs([])
      setIsLoading(false)
      return
    }

    const handler = COMMANDS[cmd]
    if (handler) {
      addLines(handler(arg))
    } else {
      // Route to Supervity AI backend
      addLines([{ type: 'info', text: `  [AI Backend] Routing query to Supervity agent network...` }])
      try {
        const data = await apiClient.post<{ response: string }>('/api/ai/chat', {
          message: trimmed,
          history: [],
          context: { source: 'cli-terminal' },
        })
        const responseLines = data.response.split('\n').map((t: string) => ({
          type: 'output' as const,
          text: `  ${t}`,
        }))
        addLines(responseLines)
      } catch {
        addLines([
          { type: 'error', text: `  Command not recognized: '${cmd}'.` },
          { type: 'output', text: "  Type 'help' to see available workforce actions." },
        ])
      }
    }

    addLines([{ type: 'separator', text: '' }])
    setIsLoading(false)
  }, [push])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = input
      setInput('')
      executeCommand(val)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setInput(navigateUp(input, history))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setInput(navigateDown(history))
    } else if (e.key === 'Tab') {
      e.preventDefault()
      // Auto-complete from known commands
      const cmds = Object.keys(COMMANDS)
      const match = cmds.find(c => c.startsWith(input.toLowerCase()))
      if (match) setInput(match)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] bg-white">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
            <Icons.command className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Command Line Center</h1>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Enterprise Workforce CLI · Interoperable Multi-Agent Console
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Session info */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-500">
            <Icons.activity className="h-3.5 w-3.5 text-emerald-500" />
            Session: #524
          </div>
          {/* Clear button */}
          <button
            onClick={() => { setLogs([]); setInput(''); inputRef.current?.focus() }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <Icons.trash className="h-3.5 w-3.5" />
            Clear
          </button>
          {/* Status badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Console Active
          </div>
        </div>
      </div>

      {/* Agent Status Bar */}
      <AgentStatusBar />

      {/* Terminal Area */}
      <div
        className="flex-1 overflow-hidden flex flex-col cursor-text"
        onClick={focusInput}
      >
        {/* Log Output */}
        <div
          ref={terminalRef}
          className="flex-1 overflow-y-auto px-6 pt-5 pb-2 space-y-0.5 bg-white"
          style={{ fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace" }}
        >
          <AnimatePresence initial={false}>
            {logs.map(line => (
              <LogLineView key={line.id} line={line} />
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-[13px] text-slate-400 font-mono py-1"
            >
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span>executing...</span>
            </motion.div>
          )}
        </div>

        {/* Input Row */}
        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <div className="flex items-center gap-3">
            <span
              className="shrink-0 text-[13px] font-semibold text-blue-600 select-none"
              style={{ fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace" }}
            >
              autopilot@command-center:~$
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Type a command or ask anything… ('help' to start)"
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-800 placeholder-slate-300 caret-blue-500 disabled:opacity-50"
              style={{ fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace" }}
              id="cli-input"
            />
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 shrink-0">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-400">↑↓</kbd>
              <span>history</span>
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-400">Tab</kbd>
              <span>autocomplete</span>
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-400">Enter ↵</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
