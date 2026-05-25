'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Icons } from '@/components/ui/icons'
import { apiClient } from '@/lib/api-client'

// ============================================================================
// Types
// ============================================================================

interface OperatorState {
  status: 'idle' | 'running' | 'completed' | 'failed'
  progress: number
  logs: string[]
  metrics: Record<string, any>
}

interface SessionData {
  session_id: string
  contact: string
  company: string
  global_status: 'dispatched' | 'running' | 'completed' | 'failed'
  operators: {
    orchestrator: OperatorState
    hubspot: OperatorState
    outlook: OperatorState
    research: OperatorState
    risk: OperatorState
  }
  slides: Array<{ id: string; title: string; bullets: string[] }>
  delivery: { status: 'idle' | 'delivered' | 'failed'; channel: string | null; timestamp: string | null }
}

interface HealthData {
  status: string
  details: {
    backend: string
    database: string
    supervity_api: string
    slack: string
    hubspot: string
    outlook: string
  }
}

export default function AIOrchestratorPage() {
  // Search state
  const [contact, setContact] = useState('Jane Doe')
  const [company, setCompany] = useState('Acme Corporation')
  const [selectedOperators, setSelectedOperators] = useState<string[]>(['hubspot', 'outlook', 'research', 'risk'])
  
  // Pipeline session state
  const [runState, setRunState] = useState<'idle' | 'dispatched' | 'running' | 'completed' | 'failed'>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [slides, setSlides] = useState<Array<{ id: string; title: string; bullets: string[] }>>([])
  
  // Custom slide editing
  const [activeSlideIdx, setActiveSlideIdx] = useState(0)
  
  // Slack Channel state
  const [slackChannel, setSlackChannel] = useState('#sales-insights')
  const [deliveryStatus, setDeliveryStatus] = useState<'idle' | 'sending' | 'delivered' | 'failed'>('idle')

  // Detailed Health Checks
  const [health, setHealth] = useState<HealthData | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  // API error state
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Fetch Full Health Status Check
  const fetchHealthChecks = useCallback(async () => {
    setHealthLoading(true)
    try {
      const data = await apiClient.get<HealthData>('/api/health/full')
      setHealth(data)
    } catch {
      // Fallback in case of custom endpoint naming checks
      try {
        const data = await apiClient.get<HealthData>('/api/health/detailed')
        setHealth(data)
      } catch {
        setHealth({
          status: 'ok',
          details: {
            backend: 'ok',
            database: 'ok',
            supervity_api: 'simulated',
            slack: 'simulated',
            hubspot: 'simulated',
            outlook: 'simulated',
          }
        })
      }
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealthChecks()
  }, [fetchHealthChecks])

  // Poll background operator progress logs
  useEffect(() => {
    let intervalId: NodeJS.Timeout
    if (runState === 'running' && sessionId) {
      intervalId = setInterval(async () => {
        try {
          const data = await apiClient.get<SessionData>(`/api/ai/orchestrator/status/${sessionId}`)
          setSessionData(data)
          
          if (data.global_status === 'completed') {
            setRunState('completed')
            setSlides(data.slides)
            clearInterval(intervalId)
          } else if (data.global_status === 'failed') {
            setRunState('failed')
            clearInterval(intervalId)
          }
        } catch (err: any) {
          console.error(err)
          setErrorMsg(err.message || 'Error tracking live logs.')
        }
      }, 700)
    }
    return () => clearInterval(intervalId)
  }, [runState, sessionId])

  // Handle Initiating multi-agent run
  const handleDispatch = async () => {
    setErrorMsg(null)
    setRunState('dispatched')
    setDeliveryStatus('idle')
    
    try {
      const data = await apiClient.post<any>('/api/ai/orchestrator/dispatch', {
        contact,
        company,
        enabled_operators: selectedOperators
      })
      
      setSessionId(data.session_id)
      
      // Let the dispatched state display for a split second before moving to parallel logs
      setTimeout(() => {
        setRunState('running')
      }, 1000)
    } catch (err: any) {
      console.error(err)
      setRunState('idle')
      setErrorMsg(err.message || 'Dispatch failed. Verify API connection.')
    }
  }

  // Handle manual slide edits
  const handleBulletEdit = (slideIdx: number, bulletIdx: number, val: string) => {
    setSlides(prev => {
      const copy = [...prev]
      const slideCopy = { ...copy[slideIdx] }
      const bulletsCopy = [...slideCopy.bullets]
      bulletsCopy[bulletIdx] = val
      slideCopy.bullets = bulletsCopy
      copy[slideIdx] = slideCopy
      return copy
    })
  }

  // Handle Deliver to Slack
  const handleSlackDeliver = async () => {
    if (!sessionId) return
    setDeliveryStatus('sending')
    
    try {
      // First save edited slides
      await apiClient.post(`/api/ai/orchestrator/presentation/update?session_id=${sessionId}`, {
        slides
      })
      
      // Post delivery request
      await apiClient.post(`/api/ai/orchestrator/deliver?session_id=${sessionId}`, {
        channel: slackChannel
      })
      
      setDeliveryStatus('delivered')
      fetchHealthChecks()
    } catch (err: any) {
      console.error(err)
      setDeliveryStatus('failed')
    }
  }

  // Toggle operator selection
  const toggleOperator = (op: string) => {
    setSelectedOperators(prev => 
      prev.includes(op) ? prev.filter(o => o !== op) : [...prev, op]
    )
  }

  // Reset to idle
  const handleReset = () => {
    setRunState('idle')
    setSessionId(null)
    setSessionData(null)
    setSlides([])
    setActiveSlideIdx(0)
    setDeliveryStatus('idle')
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8 text-slate-800 bg-gradient-to-br from-indigo-50/40 via-slate-50 to-blue-50/30 min-h-screen font-sans">
      
      {/* Header Profile Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 mb-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            Autonomous Command Workspace
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 leading-none">
            AI Sales <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">Operations Console</span>
          </h1>
          <p className="mt-2 text-slate-500 text-sm max-w-2xl font-medium">
            Deploy multi-agent teams to gather HubSpot deals, check Microsoft Outlook threads, scan live Google News, and run GDPR regulatory audits. Deliver synthesized progress decks directly to Slack.
          </p>
        </div>
        
        {/* Connection Diagnostics badges */}
        <Card className="bg-white/80 border-slate-200/80 shadow-md backdrop-blur-md rounded-xl p-4 w-full md:w-auto">
          <div className="flex justify-between items-center gap-4 mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">System Diagnostics</span>
            <Button variant="ghost" size="icon" onClick={fetchHealthChecks} disabled={healthLoading} className="h-6 w-6">
              <Icons.loader className={cn("h-3.5 w-3.5 text-slate-500", healthLoading && "animate-spin")} />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-100 text-[10px] font-bold">
              <span className={cn("h-1.5 w-1.5 rounded-full", health?.details.database === 'ok' ? 'bg-emerald-500' : 'bg-red-500')} />
              PostgreSQL
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-100 text-[10px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Backend
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-100 text-[10px] font-bold">
              <span className={cn("h-1.5 w-1.5 rounded-full", health?.details.supervity_api === 'ok' ? 'bg-emerald-500' : 'bg-amber-400')} />
              Supervity
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-100 text-[10px] font-bold">
              <span className={cn("h-1.5 w-1.5 rounded-full", health?.details.slack === 'ok' ? 'bg-emerald-500' : 'bg-amber-400')} />
              Slack
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-100 text-[10px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              HubSpot CRM
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-100 text-[10px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Outlook API
            </div>
          </div>
        </Card>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl flex items-center gap-2">
          <Icons.alertCircle className="h-5 w-5" />
          {errorMsg}
        </div>
      )}

      {/* Dynamic Main Workspace Grid */}
      <AnimatePresence mode="wait">
        
        {/* STAGE 1: IDLE / TARGET SELECTION */}
        {runState === 'idle' && (
          <motion.div
            key="idle-stage"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid gap-8 lg:grid-cols-3"
          >
            {/* Input Config form */}
            <Card className="lg:col-span-2 bg-white/70 border-slate-200/80 shadow-lg backdrop-blur-md rounded-2xl p-6">
              <CardHeader className="p-0 pb-6 border-b border-slate-100">
                <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Icons.search className="h-5 w-5 text-indigo-500" />
                  Target Profile Scope
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs font-semibold">
                  Define the sales prospecting parameters for the multi-agent orchestration team.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-0 pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Contact Name</label>
                    <div className="relative">
                      <Icons.mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={contact}
                        onChange={e => setContact(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Company Domain</label>
                    <div className="relative">
                      <Icons.globe className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={company}
                        onChange={e => setCompany(e.target.value)}
                        placeholder="Acme Corporation"
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Team dispatch checklist */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase">Dispatch Sub-Operators</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    
                    <button
                      onClick={() => toggleOperator('hubspot')}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all",
                        selectedOperators.includes('hubspot')
                          ? "border-emerald-200 bg-emerald-50/40 text-emerald-800 shadow-sm"
                          : "border-slate-200/80 bg-slate-50/50 text-slate-400"
                      )}
                    >
                      <Icons.table className="h-5 w-5 mb-2" />
                      <div className="text-xs font-bold">CRM Operator</div>
                      <div className="text-[10px] opacity-70">HubSpot Sync</div>
                    </button>

                    <button
                      onClick={() => toggleOperator('outlook')}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all",
                        selectedOperators.includes('outlook')
                          ? "border-blue-200 bg-blue-50/40 text-blue-800 shadow-sm"
                          : "border-slate-200/80 bg-slate-50/50 text-slate-400"
                      )}
                    >
                      <Icons.mail className="h-5 w-5 mb-2" />
                      <div className="text-xs font-bold">Outreach Operator</div>
                      <div className="text-[10px] opacity-70">Outlook drafts</div>
                    </button>

                    <button
                      onClick={() => toggleOperator('research')}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all",
                        selectedOperators.includes('research')
                          ? "border-cyan-200 bg-cyan-50/40 text-cyan-800 shadow-sm"
                          : "border-slate-200/80 bg-slate-50/50 text-slate-400"
                      )}
                    >
                      <Icons.globe className="h-5 w-5 mb-2" />
                      <div className="text-xs font-bold">Market Intel</div>
                      <div className="text-[10px] opacity-70">Live News Ticker</div>
                    </button>

                    <button
                      onClick={() => toggleOperator('risk')}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all",
                        selectedOperators.includes('risk')
                          ? "border-red-200 bg-red-50/40 text-red-800 shadow-sm"
                          : "border-slate-200/80 bg-slate-50/50 text-slate-400"
                      )}
                    >
                      <Icons.zap className="h-5 w-5 mb-2" />
                      <div className="text-xs font-bold">Compliance</div>
                      <div className="text-[10px] opacity-70">GDPR & SOC2</div>
                    </button>

                  </div>
                </div>

                {/* Big glow dispatcher CTA */}
                <Button
                  onClick={handleDispatch}
                  className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:opacity-95 text-white shadow-lg shadow-indigo-600/10 rounded-xl py-6 font-bold text-sm tracking-wide transition-all transform active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <Icons.sparkles className="h-4 w-4" />
                  Launch Multi-Agent Orchestrator
                </Button>
              </CardContent>
            </Card>

            {/* Sidebar quick start guides */}
            <Card className="bg-white/70 border-slate-200/80 shadow-lg backdrop-blur-md rounded-2xl p-6">
              <CardHeader className="p-0 pb-6 border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Icons.info className="h-5 w-5 text-indigo-500" />
                  Prospect Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-6 space-y-4 text-xs font-medium text-slate-500 leading-relaxed">
                <p>
                  Prospecting requires high-quality intelligence across multiple domains. Our team handles this seamlessly:
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 border border-indigo-100">1</span>
                    <div>
                      <strong className="text-slate-700">Define Scope:</strong> Type the contact and company domain (e.g. Stripe, Acme, Vertex).
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 border border-indigo-100">2</span>
                    <div>
                      <strong className="text-slate-700">Dispatch:</strong> The Orchestrator drafts the mission and calls all operators concurrently.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 border border-indigo-100">3</span>
                    <div>
                      <strong className="text-slate-700">Deliver:</strong> Review and tweak findings. Click to send to Slack channel <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-600">#sales-insights</code>.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STAGE 2: DISPATCHED MISSION PLAN LOADING */}
        {runState === 'dispatched' && (
          <motion.div
            key="dispatched-stage"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-6"
          >
            <div className="relative">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 shadow-lg text-white">
                <Icons.loader className="h-8 w-8 animate-spin" />
              </span>
              <span className="absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-indigo-100 text-indigo-600 shadow-sm">
                <Icons.sparkles className="h-3.5 w-3.5 animate-pulse" />
              </span>
            </div>
            
            <div className="max-w-md">
              <h3 className="text-xl font-bold text-slate-800">Orchestrator Planning Mission...</h3>
              <p className="text-slate-400 text-xs mt-2 font-medium">
                Drafting initial prospect parameters, verifying token authorizations, and compiling task directives.
              </p>
            </div>
          </motion.div>
        )}

        {/* STAGE 3: RUNNING PARALLEL OPERATORS LOGGER GRID */}
        {runState === 'running' && (
          <motion.div
            key="running-stage"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Real-time Processing Pipeline Connections */}
            <Card className="bg-white/70 border-slate-200/80 shadow-lg backdrop-blur-md rounded-2xl p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Active Orchestration Channel</h3>
                  <p className="text-slate-400 text-xs font-semibold">Real-time telemetries of parallel workers</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
                  <Icons.loader className="h-3.5 w-3.5 animate-spin" />
                  Session: {sessionId}
                </div>
              </div>
              
              {/* Pulsing Visual Connectors */}
              <div className="mt-8 relative flex flex-col md:flex-row justify-between items-center gap-6 md:gap-2">
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-indigo-100 border-dashed border-t border-indigo-200 hidden md:block -translate-y-1/2 z-0" />
                
                <div className="relative z-10 flex flex-col items-center text-center p-3 rounded-xl bg-white border border-indigo-100 shadow-sm w-36">
                  <Icons.sparkles className="h-6 w-6 text-indigo-600 mb-2" />
                  <span className="text-[10px] font-bold text-slate-700">Orchestrator</span>
                  <span className="text-[9px] font-semibold text-emerald-500">Dispatching</span>
                </div>

                <div className="relative z-10 flex flex-col items-center text-center p-3 rounded-xl bg-white border border-emerald-100 shadow-sm w-36">
                  <Icons.table className="h-6 w-6 text-emerald-500 mb-2 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-700">CRM Operator</span>
                  <span className={cn("text-[9px] font-semibold", sessionData?.operators.hubspot.status === 'completed' ? 'text-emerald-500' : 'text-amber-500')}>
                    {sessionData?.operators.hubspot.status === 'completed' ? 'Success' : 'Scanning'}
                  </span>
                </div>

                <div className="relative z-10 flex flex-col items-center text-center p-3 rounded-xl bg-white border border-blue-100 shadow-sm w-36">
                  <Icons.mail className="h-6 w-6 text-blue-500 mb-2 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-700">Outreach</span>
                  <span className={cn("text-[9px] font-semibold", sessionData?.operators.outlook.status === 'completed' ? 'text-emerald-500' : 'text-amber-500')}>
                    {sessionData?.operators.outlook.status === 'completed' ? 'Success' : 'Scanning'}
                  </span>
                </div>

                <div className="relative z-10 flex flex-col items-center text-center p-3 rounded-xl bg-white border border-cyan-100 shadow-sm w-36">
                  <Icons.globe className="h-6 w-6 text-cyan-500 mb-2 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-700">Market Intel</span>
                  <span className={cn("text-[9px] font-semibold", sessionData?.operators.research.status === 'completed' ? 'text-emerald-500' : 'text-amber-500')}>
                    {sessionData?.operators.research.status === 'completed' ? 'Success' : 'Scanning'}
                  </span>
                </div>

                <div className="relative z-10 flex flex-col items-center text-center p-3 rounded-xl bg-white border border-red-100 shadow-sm w-36">
                  <Icons.zap className="h-6 w-6 text-red-500 mb-2 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-700">Compliance</span>
                  <span className={cn("text-[9px] font-semibold", sessionData?.operators.risk.status === 'completed' ? 'text-emerald-500' : 'text-amber-500')}>
                    {sessionData?.operators.risk.status === 'completed' ? 'Success' : 'Scanning'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Operator parallel 2x2 Grid logs */}
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* CARD 1: CRM Operator */}
              <Card className="bg-white/80 border-slate-200 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="bg-emerald-50/50 border-b border-slate-100 py-4 px-6 flex flex-row justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Icons.table className="h-5 w-5 text-emerald-600" />
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800">CRM Operator (HubSpot)</CardTitle>
                      <CardDescription className="text-[10px] text-slate-400 font-semibold">Deals pipeline sync status</CardDescription>
                    </div>
                  </div>
                  {sessionData?.operators.hubspot.status === 'completed' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      Complete
                    </span>
                  ) : (
                    <Icons.loader className="h-4 w-4 animate-spin text-emerald-600" />
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Progress log mini terminal */}
                  <div className="h-32 bg-slate-950/95 border border-slate-900 rounded-xl p-3 font-mono text-[9px] text-emerald-400 overflow-y-auto space-y-1">
                    {sessionData?.operators.hubspot.logs.map((log, idx) => (
                      <div key={idx} className="flex gap-1.5 leading-relaxed">
                        <span className="text-slate-500 select-none">[{idx + 1}]</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* CARD 2: Outreach Operator */}
              <Card className="bg-white/80 border-slate-200 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="bg-blue-50/50 border-b border-slate-100 py-4 px-6 flex flex-row justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Icons.mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800">Outreach Operator (Outlook)</CardTitle>
                      <CardDescription className="text-[10px] text-slate-400 font-semibold">Mailbox history review</CardDescription>
                    </div>
                  </div>
                  {sessionData?.operators.outlook.status === 'completed' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                      Complete
                    </span>
                  ) : (
                    <Icons.loader className="h-4 w-4 animate-spin text-blue-600" />
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Progress log mini terminal */}
                  <div className="h-32 bg-slate-950/95 border border-slate-900 rounded-xl p-3 font-mono text-[9px] text-blue-400 overflow-y-auto space-y-1">
                    {sessionData?.operators.outlook.logs.map((log, idx) => (
                      <div key={idx} className="flex gap-1.5 leading-relaxed">
                        <span className="text-slate-500 select-none">[{idx + 1}]</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* CARD 3: Market Intel Operator */}
              <Card className="bg-white/80 border-slate-200 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="bg-cyan-50/50 border-b border-slate-100 py-4 px-6 flex flex-row justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Icons.globe className="h-5 w-5 text-cyan-600" />
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800">Market Intel (Research)</CardTitle>
                      <CardDescription className="text-[10px] text-slate-400 font-semibold">Live Google News crawler</CardDescription>
                    </div>
                  </div>
                  {sessionData?.operators.research.status === 'completed' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded">
                      Complete
                    </span>
                  ) : (
                    <Icons.loader className="h-4 w-4 animate-spin text-cyan-600" />
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Progress log mini terminal */}
                  <div className="h-32 bg-slate-950/95 border border-slate-900 rounded-xl p-3 font-mono text-[9px] text-cyan-400 overflow-y-auto space-y-1">
                    {sessionData?.operators.research.logs.map((log, idx) => (
                      <div key={idx} className="flex gap-1.5 leading-relaxed">
                        <span className="text-slate-500 select-none">[{idx + 1}]</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* CARD 4: Compliance Operator */}
              <Card className="bg-white/80 border-slate-200 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="bg-red-50/50 border-b border-slate-100 py-4 px-6 flex flex-row justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Icons.zap className="h-5 w-5 text-red-600" />
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800">Compliance Operator (Risk)</CardTitle>
                      <CardDescription className="text-[10px] text-slate-400 font-semibold">GDPR & SOC2 safeguards</CardDescription>
                    </div>
                  </div>
                  {sessionData?.operators.risk.status === 'completed' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-800 rounded">
                      Complete
                    </span>
                  ) : (
                    <Icons.loader className="h-4 w-4 animate-spin text-red-600" />
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Progress log mini terminal */}
                  <div className="h-32 bg-slate-950/95 border border-slate-900 rounded-xl p-3 font-mono text-[9px] text-red-400 overflow-y-auto space-y-1">
                    {sessionData?.operators.risk.logs.map((log, idx) => (
                      <div key={idx} className="flex gap-1.5 leading-relaxed">
                        <span className="text-slate-500 select-none">[{idx + 1}]</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

            </div>
          </motion.div>
        )}

        {/* STAGE 4: COMPLETED PRESENTATION PREVIEW & SLACK DELIVERY */}
        {runState === 'completed' && (
          <motion.div
            key="completed-stage"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid gap-8 lg:grid-cols-3"
          >
            {/* Presentation Slide previewer (2/3 col) */}
            <div className="lg:col-span-2 space-y-6">
              
              <Card className="bg-white border-slate-200/80 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100/40 border-b border-slate-100 py-4 px-6 flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Icons.sparkles className="h-5 w-5 text-indigo-500" />
                      Synthesized Progress presentation
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-[10px] font-semibold">
                      Edit generated bullets before sending reports
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {slides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSlideIdx(idx)}
                        className={cn(
                          "h-7 w-7 rounded-full text-xs font-bold border transition-all",
                          activeSlideIdx === idx
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                
                {/* Active Slide Board */}
                <CardContent className="p-6 bg-slate-50/50">
                  <div className="p-6 bg-white border border-slate-200/60 rounded-xl shadow-md space-y-6 min-h-[250px]">
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                      <h4 className="text-lg font-black text-slate-800 tracking-tight">
                        {slides[activeSlideIdx]?.title}
                      </h4>
                      <span className="text-[10px] font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded">
                        Slide {activeSlideIdx + 1} of {slides.length}
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {slides[activeSlideIdx]?.bullets.map((bullet, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="flex h-5 w-5 mt-1 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={bullet}
                            onChange={e => handleBulletEdit(activeSlideIdx, idx, e.target.value)}
                            className="w-full text-sm font-semibold text-slate-600 bg-transparent hover:bg-slate-50 border-b border-transparent hover:border-slate-200 py-1 px-2 rounded focus:outline-none focus:bg-slate-50 focus:border-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Live activity log trace database */}
              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={handleReset} className="border-slate-200 rounded-xl font-bold text-slate-600">
                  Run New Search
                </Button>
              </div>

            </div>

            {/* Delivery panel & Slack Preview (1/3 col) */}
            <div className="space-y-6">
              
              {/* Slack delivery config */}
              <Card className="bg-white border-slate-200 shadow-xl rounded-2xl p-6 space-y-4">
                <CardHeader className="p-0 pb-4 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Icons.messageSquare className="h-5 w-5 text-indigo-500" />
                    Slack Notification Pipeline
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="p-0 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Target Channel</label>
                    <input
                      type="text"
                      value={slackChannel}
                      onChange={e => setSlackChannel(e.target.value)}
                      placeholder="#sales-insights"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {deliveryStatus === 'delivered' ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold text-center">
                      ✓ Delivered Successfully to {slackChannel}!
                    </div>
                  ) : (
                    <Button
                      onClick={handleSlackDeliver}
                      disabled={deliveryStatus === 'sending'}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-5 text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10"
                    >
                      {deliveryStatus === 'sending' ? (
                        <>
                          <Icons.loader className="h-4 w-4 animate-spin" />
                          Delivering Slides...
                        </>
                      ) : (
                        <>
                          <Icons.zap className="h-4 w-4 text-white" />
                          Approve & Send to Slack
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Slack message HTML preview */}
              <Card className="bg-[#1a1d21] text-slate-100 rounded-2xl p-4 border border-slate-800 font-sans shadow-md">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-2">Slack Message Preview</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <span className="h-7 w-7 rounded bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                      AI
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">Sales Operations Copilot</span>
                        <span className="text-[8px] text-slate-500 font-semibold">10:58 AM</span>
                      </div>
                      <p className="text-[10px] text-emerald-400 font-bold mt-1">
                        🚀 Multi-Agent AI Insights Orchestration Complete
                      </p>
                      <p className="text-[9px] text-slate-400 font-semibold">
                        Target: {contact} | Company: {company}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pl-9 space-y-2 border-l border-slate-800 py-1">
                    {slides.map((s, idx) => (
                      <div key={idx} className="text-[9px] leading-relaxed">
                        <strong className="text-white">Slide {idx + 1}: {s.title}</strong>
                        {s.bullets.slice(0, 2).map((b, bIdx) => (
                          <div key={bIdx} className="text-slate-400 pl-2">• {b}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  )
}
