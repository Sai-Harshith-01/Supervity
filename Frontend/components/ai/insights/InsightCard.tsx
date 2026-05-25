'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Icons } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

export type InsightSeverity = 'critical' | 'high' | 'warning' | 'medium' | 'low' | 'info'
export type InsightType = 'pattern' | 'anomaly' | 'recommendation' | 'trend' | 'alert'

export interface Insight {
  id: string
  type: InsightType
  severity: InsightSeverity
  title: string
  description: string
  data?: Record<string, unknown>
  suggested_action?: string
  action_type?: string
  confidence?: number
  created_at: string
  is_dismissed?: boolean
  is_actioned?: boolean
  is_demo?: boolean
}

interface InsightCardProps {
  insight: Insight
  onAction?: (insight: Insight) => void
  onDismiss?: (id: string) => void
}

/**
 * Premium White CRM Theme status configurations with high-contrast text.
 */
export function getSeverityConfig(severity: InsightSeverity) {
  const configs = {
    critical: {
      icon: Icons.alertCircle,
      bg: 'bg-white border-slate-200 hover:border-red-300',
      accent: 'bg-red-650',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600 dark:text-red-600',
      badge: 'bg-red-50 text-red-700 dark:text-red-700 border border-red-200/60',
      glow: 'hover:shadow-[0_6px_20px_rgba(239,68,68,0.08)]',
    },
    high: {
      icon: Icons.alertCircle,
      bg: 'bg-white border-slate-200 hover:border-red-300',
      accent: 'bg-red-500',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500 dark:text-red-500',
      badge: 'bg-red-50 text-red-600 dark:text-red-600 border border-red-100',
      glow: 'hover:shadow-[0_6px_15px_rgba(239,68,68,0.06)]',
    },
    warning: {
      icon: Icons.alertTriangle,
      bg: 'bg-white border-slate-200 hover:border-amber-300',
      accent: 'bg-amber-500',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600 dark:text-amber-600',
      badge: 'bg-amber-50 text-amber-700 dark:text-amber-700 border border-amber-200/60',
      glow: 'hover:shadow-[0_6px_20px_rgba(245,158,11,0.08)]',
    },
    medium: {
      icon: Icons.alertTriangle,
      bg: 'bg-white border-slate-200 hover:border-amber-300',
      accent: 'bg-amber-400',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500 dark:text-amber-500',
      badge: 'bg-amber-50 text-amber-600 dark:text-amber-600 border border-amber-100',
      glow: 'hover:shadow-[0_6px_15px_rgba(245,158,11,0.06)]',
    },
    low: {
      icon: Icons.info,
      bg: 'bg-white border-slate-200 hover:border-blue-300',
      accent: 'bg-blue-400',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500 dark:text-blue-500',
      badge: 'bg-blue-50 text-blue-600 dark:text-blue-600 border border-blue-100',
      glow: 'hover:shadow-[0_6px_15px_rgba(59,130,246,0.06)]',
    },
    info: {
      icon: Icons.info,
      bg: 'bg-white border-slate-200 hover:border-blue-350',
      accent: 'bg-blue-600',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600 dark:text-blue-600',
      badge: 'bg-blue-50 text-blue-700 dark:text-blue-700 border border-blue-200/60',
      glow: 'hover:shadow-[0_6px_20px_rgba(59,130,246,0.08)]',
    },
  }
  return configs[severity] || configs.info
}

const typeConfig: Record<InsightType, { label: string; icon: typeof Icons.activity; color: string; badgeBg: string }> = {
  pattern: { label: 'Pattern Detection', icon: Icons.activity, color: 'text-purple-700 dark:text-purple-700', badgeBg: 'bg-purple-50 border-purple-200/60' },
  anomaly: { label: 'System Anomaly', icon: Icons.alertTriangle, color: 'text-red-700 dark:text-red-700', badgeBg: 'bg-red-50 border-red-200/60' },
  recommendation: { label: 'Policy Suggestion', icon: Icons.lightbulb, color: 'text-amber-700 dark:text-amber-700', badgeBg: 'bg-amber-50 border-amber-200/60' },
  trend: { label: 'Performance Trend', icon: Icons.trendingUp, color: 'text-emerald-700 dark:text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-200/60' },
  alert: { label: 'Security Alert', icon: Icons.bell, color: 'text-blue-700 dark:text-blue-700', badgeBg: 'bg-blue-50 border-blue-200/60' },
}

export function InsightCard({ insight, onAction, onDismiss }: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isActionRunning, setIsActionRunning] = useState(false)
  const [isActionCompleted, setIsActionCompleted] = useState(false)

  const severity = getSeverityConfig(insight.severity)
  const type = typeConfig[insight.type] || typeConfig.recommendation
  const SeverityIcon = severity.icon

  const handleApplyAction = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent collapsing card
    setIsActionRunning(true)
    setTimeout(() => {
      setIsActionRunning(false)
      setIsActionCompleted(true)
      setTimeout(() => {
        onAction?.(insight)
      }, 1000)
    }, 1500)
  }

  const getAgentReasoningTrace = () => {
    if (insight.type === 'anomaly') {
      return [
        { status: 'completed', time: '0.0s', msg: 'Orchestrator initiated continuous system monitoring' },
        { status: 'warning', time: '0.4s', msg: 'Security Operator flagged threshold spike (exceeded by 3.4x)' },
        { status: 'completed', time: '0.9s', msg: 'CRM Guardrail Policy evaluated & violation caught' },
        { status: 'active', time: '1.2s', msg: 'Exception logged & human workbench action drafted' }
      ]
    } else if (insight.type === 'recommendation') {
      return [
        { status: 'completed', time: '0.0s', msg: 'Orchestrator queried database audit execution logs' },
        { status: 'completed', time: '0.5s', msg: 'Insight Agent clustered 23 redundant manual invoices' },
        { status: 'completed', time: '0.8s', msg: 'Policy Engine verified zero compliance violations' },
        { status: 'active', time: '1.1s', msg: 'Drafted Auto-Approve policy refinement recommendation' }
      ]
    }
    return [
      { status: 'completed', time: '0.0s', msg: 'Orchestrator synchronized live dashboard data feeds' },
      { status: 'completed', time: '0.6s', msg: 'Trend Operator discovered key patterns' },
      { status: 'completed', time: '1.0s', msg: 'Generated system optimization checklist recommendation' }
    ]
  }

  return (
    <motion.div
      layout
      className={cn(
        'rounded-xl border bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all duration-300 cursor-pointer overflow-hidden relative',
        severity.bg,
        severity.glow
      )}
      onClick={() => setIsExpanded(!isExpanded)}
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
    >
      {/* Accent Indicator bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-[4px] transition-colors', severity.accent)} />

      <div className="p-5">
        <div className="flex gap-4">
          
          {/* Status Icon Badge */}
          <div className={cn(
            'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-300 border border-slate-200/60',
            severity.iconBg,
            isExpanded ? 'scale-105' : ''
          )}>
            <SeverityIcon className={cn('h-5 w-5', severity.iconColor)} strokeWidth={2.5} />
          </div>

          {/* Core Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Explicit text-slate-900 dark:text-slate-900 to override global dark-mode white triggers */}
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-900 tracking-tight text-[1rem]">{insight.title}</h4>
                  
                  <span className={cn(
                    'rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                    severity.badge
                  )}>
                    {insight.severity}
                  </span>
                  
                  {insight.confidence && (
                    <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-md px-1.5 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-600">
                        {Math.round(insight.confidence * 100)}% Match
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2 text-[11px]">
                  <span className={cn('flex items-center gap-1 font-bold px-1.5 py-0.5 rounded border', type.color, type.badgeBg)}>
                    <type.icon className="h-3 w-3" strokeWidth={2.5} />
                    {type.label}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1 font-bold text-slate-500 dark:text-slate-500">
                    <Icons.clock className="h-3 w-3 text-slate-400" strokeWidth={2} />
                    {new Date(insight.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                {onDismiss && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDismiss(insight.id)}
                    className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg h-8 w-8"
                  >
                    <Icons.close className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-450 hover:text-slate-700 rounded-lg h-8 w-8"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? <Icons.chevronUp className="h-4 w-4" /> : <Icons.chevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Explicit dark:text-slate-700 to guarantee crisp charcoal text */}
            <p className="mt-3 text-[0.875rem] leading-relaxed text-slate-700 dark:text-slate-700 font-medium">
              {insight.description}
            </p>

            {/* Key Data Values Grid */}
            {insight.data && Object.keys(insight.data).length > 0 && (
              <div className="mt-3.5 flex flex-wrap gap-2">
                {Object.entries(insight.data).map(([key, value]) => (
                  <div
                    key={key}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1',
                      'bg-slate-50 border border-slate-200/80 text-[11px] text-slate-800 dark:text-slate-800'
                    )}
                  >
                    <span className="text-slate-500 dark:text-slate-500 font-bold capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-900">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expandable Section: Agent Trace & Details */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 20 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden border-t border-slate-150 pt-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid gap-5 md:grid-cols-12">
                
                {/* Agent Reasoning Stream */}
                <div className="md:col-span-7 space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Icons.brain className="h-4 w-4 text-purple-650" strokeWidth={2} />
                    <span className="label-mono text-purple-700 dark:text-purple-700 font-extrabold text-[10px]">Orchestrator Execution Trace</span>
                  </div>
                  
                  <div className="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-3.5 pt-1">
                    {getAgentReasoningTrace().map((step, idx) => (
                      <div key={idx} className="relative">
                        {/* Timeline Status Bullet */}
                        <div className={cn(
                          'absolute -left-[22.5px] top-[4px] h-3.5 w-3.5 rounded-full border-2 bg-white flex items-center justify-center transition-all',
                          step.status === 'completed' ? 'border-emerald-500' :
                          step.status === 'warning' ? 'border-amber-500' :
                          'border-blue-500'
                        )}>
                          {step.status === 'completed' && <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />}
                          {step.status === 'warning' && <span className="h-1.5 w-1.5 bg-amber-500 rounded-full" />}
                          {step.status === 'active' && <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-ping" />}
                        </div>
                        
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-xs text-slate-700 dark:text-slate-700 font-semibold leading-relaxed">{step.msg}</p>
                          <span className="font-mono text-[9px] text-slate-400 select-none font-bold">{step.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metadata JSON & Action Button */}
                <div className="md:col-span-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icons.settings className="h-3.5 w-3.5 text-slate-450" />
                      <span className="label-mono text-slate-500 dark:text-slate-500 font-extrabold text-[10px]">Raw Signal Payload</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 max-h-[140px] overflow-y-auto scrollbar-hide">
                      <pre className="font-mono text-[10px] text-slate-700 dark:text-slate-700 leading-relaxed font-bold">
                        <code>{JSON.stringify(insight.data || { id: insight.id, type: insight.type }, null, 2)}</code>
                      </pre>
                    </div>
                  </div>

                  {/* Dynamic Action Trigger */}
                  {insight.suggested_action && (
                    <div className="pt-1">
                      <Button
                        className={cn(
                          'w-full shadow-sm border-0 py-5 transition-all text-xs font-bold rounded-xl flex items-center justify-center gap-2',
                          isActionCompleted 
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 dark:text-emerald-700' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        )}
                        onClick={handleApplyAction}
                        disabled={isActionRunning || isActionCompleted}
                      >
                        {isActionRunning ? (
                          <>
                            <Icons.loader className="h-3.5 w-3.5 animate-spin mr-1 text-white/80" />
                            Executing...
                          </>
                        ) : isActionCompleted ? (
                          <>
                            <Icons.check className="h-4 w-4 text-emerald-700 animate-bounce" />
                            Completed Successfully
                          </>
                        ) : (
                          <>
                            <Icons.zap className="h-4 w-4" />
                            {insight.suggested_action}
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
