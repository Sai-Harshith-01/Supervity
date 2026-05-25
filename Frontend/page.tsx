'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Icons } from '@/components/ui/icons'
import { ActivityChart } from '@/components/ActivityChart'
import { cn } from '@/lib/utils'
import { useAI } from '@/context/AIContext'

// ─── Dynamic Icon Resolver ───────────────────────────────────────────────────

const getIconByName = (name: string) => {
  switch (name) {
    case 'mail': return Icons.mail
    case 'search': return Icons.search
    case 'sparkles': return Icons.sparkles
    case 'table': return Icons.table
    case 'shield': return Icons.shield
    case 'messageSquare': return Icons.messageSquare
    case 'zap': return Icons.zap
    case 'network': return Icons.network
    case 'users': return Icons.users
    case 'activity': return Icons.activity
    case 'checkCircle': return Icons.checkCircle
    default: return Icons.activity
  }
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedNumber({
  value,
  suffix = '',
  duration = 1200,
}: {
  value: number
  suffix?: string
  duration?: number
}) {
  const [displayValue, setDisplayValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!isInView || hasAnimated.current) return
    hasAnimated.current = true
    const startTime = performance.now()
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(2, -10 * progress)
      setDisplayValue(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(animate)
      else setDisplayValue(value)
    }
    requestAnimationFrame(animate)
  }, [value, duration, isInView])

  const formatValue = (num: number): string => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <span ref={ref}>
      {formatValue(displayValue)}
      {suffix}
    </span>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: number
  suffix?: string
  icon: React.ElementType
  trend?: { value: string; positive: boolean }
  accentColor: string
  glowColor: string
  delay?: number
}

function StatCard({
  title,
  value,
  suffix = '',
  icon: Icon,
  trend,
  accentColor,
  glowColor,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className="relative h-full overflow-hidden cursor-default glass glass-hover p-0.5">
        {/* Soft dynamic glow */}
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-10 dark:opacity-20 blur-xl transition-all duration-300 group-hover:scale-125"
          style={{ backgroundColor: glowColor }}
        />
        <CardContent className="relative z-10 p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              {/* Label */}
              <p className="label-mono text-slate-500 dark:text-slate-400 font-bold transition-colors">
                {title}
              </p>
              {/* Value */}
              <p className="font-display text-3xl font-extrabold leading-none tracking-tight text-slate-900 dark:text-white">
                <AnimatedNumber value={value} suffix={suffix} />
              </p>

              {/* Sparkline Graphic */}
              <div className="mt-3 h-5 w-32 opacity-70 group-hover:opacity-100 transition-opacity">
                <svg className="h-full w-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path
                    d={
                      title === 'Total Users'
                        ? 'M0 25 Q15 12, 30 22 T60 10 T90 4 T100 8'
                        : title === 'Active Sessions'
                        ? 'M0 28 Q15 22, 30 20 T60 14 T90 6 T100 10'
                        : title === 'Success Rate'
                        ? 'M0 8 Q15 10, 30 6 T60 4 T90 2 T100 4'
                        : 'M0 22 Q15 20, 30 16 T60 18 T90 6 T100 4'
                    }
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Trend */}
              {trend && (
                <motion.p
                  className={cn(
                    'flex items-center gap-1 text-[11px] font-semibold mt-2.5',
                    trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                  )}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + 0.2 }}
                >
                  {trend.positive ? (
                    <Icons.trendingUp className="h-3 w-3" strokeWidth={2.5} />
                  ) : (
                    <Icons.trendingUp className="h-3 w-3 rotate-180" strokeWidth={2.5} />
                  )}
                  {trend.value}
                </motion.p>
              )}
            </div>
            {/* Icon badge */}
            <motion.div
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/50 dark:border-white/[0.06]"
              whileHover={{ scale: 1.1, rotate: 3 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <Icon className="h-4.5 w-4.5" style={{ color: accentColor }} strokeWidth={1.8} />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <motion.div
      className="relative py-4 space-y-3 overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-blue-50/20 via-white to-indigo-50/10 dark:from-white/[0.01] dark:to-transparent border border-slate-200/50 dark:border-white/[0.03]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Decorative ambient blobs */}
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-3xl" />
      <div className="absolute left-1/3 bottom-0 h-32 w-32 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl" />

      {/* Section tag */}
      <div className="flex items-center gap-2 relative z-10">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 pulse-dot" />
        <span className="label-mono text-emerald-600 dark:text-emerald-400 font-extrabold">Autonomous Engine: Active</span>
      </div>

      <h1 className="text-display-3 font-extrabold tracking-tight text-slate-900 dark:text-white lg:text-display-2 leading-[1.1] relative z-10">
        AI Command{' '}
        <span className="text-gradient">Center</span>
      </h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-xl text-sm md:text-base font-semibold leading-relaxed relative z-10">
        Orchestrate, govern, and monitor your multi-agent enterprise workforce from a single pane of glass. Optimized for business workflows.
      </p>
    </motion.div>
  )
}

// ─── Feature Pillars ──────────────────────────────────────────────────────────

interface Pillar {
  icon: React.ElementType
  title: string
  subtitle: string
  description: string
  href: string
  accentColor: string
  glowColor: string
  tag: string
  delay: number
}

const PILLARS: Pillar[] = [
  {
    icon: Icons.brain,
    title: 'AI Manager',
    subtitle: 'The Control Center',
    description:
      'Where your core logic lives. Build and orchestrate your multi-agent system. Define how the Orchestrator passes stateful context to Operators.',
    href: '/ai',
    accentColor: '#2563EB',
    glowColor: '#3b82f6',
    tag: 'Orchestration',
    delay: 0.1,
  },
  {
    icon: Icons.shield,
    title: 'Dynamic AI Policies',
    subtitle: 'The Guardrails',
    description:
      "Plain-language business rules your agents cannot violate. Example: 'Never mark a deal Closed-Won without a signed contract attached.'",
    href: '/ai/policies',
    accentColor: '#7C3AED',
    glowColor: '#7c3aed',
    tag: 'Governance',
    delay: 0.2,
  },
  {
    icon: Icons.wrench,
    title: 'AI Workbench',
    subtitle: 'Exception Management',
    description:
      'When an API fails or data is missing, the agent must pause, route the work item here, and let a human resolve. This is THE most critical pillar.',
    href: '/workbench',
    accentColor: '#059669',
    glowColor: '#34d399',
    tag: 'Human-in-the-loop',
    delay: 0.3,
  },
  {
    icon: Icons.lineChart,
    title: 'AI Insights',
    subtitle: 'Visibility & ROI',
    description:
      'Live execution logs, reasoning traces, and ROI metrics. A CTO will only deploy AI they can monitor — show them what good looks like.',
    href: '/ai/insights',
    accentColor: '#0ea5e9',
    glowColor: '#38bdf8',
    tag: 'Observability',
    delay: 0.4,
  },
]

function PillarCard({ pillar }: { pillar: Pillar }) {
  const Icon = pillar.icon
  const { openManager } = useAI()

  const handleClick = (e: React.MouseEvent) => {
    if (pillar.href === '/ai') {
      e.preventDefault()
      openManager()
    }
  }

  return (
    <motion.div
      variants={itemVariants}
      transition={{ delay: pillar.delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Link href={pillar.href} onClick={handleClick} className="block h-full" tabIndex={0}>
        <Card className="group relative h-full cursor-pointer overflow-hidden glass glass-hover">
          {/* Ambient glow orb */}
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-5 dark:opacity-10 blur-3xl transition-opacity duration-500 group-hover:opacity-15"
            style={{ backgroundColor: pillar.glowColor }}
          />

          <CardContent className="relative z-10 p-6 space-y-4">
            {/* Header row */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3.5">
                {/* Icon badge */}
                <motion.div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/50 dark:border-white/[0.06]"
                  whileHover={{ scale: 1.08, rotate: 3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{ color: pillar.accentColor }}
                    strokeWidth={1.8}
                  />
                </motion.div>
                {/* Title block */}
                <div className="space-y-0.5 pt-0.5">
                  <p className="text-[0.95rem] font-bold leading-snug text-slate-800 dark:text-white tracking-tight">
                    {pillar.title}
                  </p>
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: pillar.accentColor }}
                  >
                    {pillar.subtitle}
                  </p>
                </div>
              </div>
              {/* Tag badge */}
              <span
                className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: `${pillar.glowColor}10`,
                  color: pillar.accentColor,
                  border: `1px solid ${pillar.accentColor}20`,
                }}
              >
                {pillar.tag}
              </span>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-200/60 dark:bg-white/[0.05]" />

            {/* Description */}
            <p className="text-[0.825rem] leading-relaxed text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-800 dark:group-hover:text-white transition-colors duration-300">
              {pillar.description}
            </p>

            {/* CTA row */}
            <div className="flex items-center gap-1 text-[11px] font-bold transition-all duration-200 group-hover:gap-2"
              style={{ color: pillar.accentColor }}
            >
              <span>Open Module</span>
              <Icons.arrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" style={{ color: pillar.accentColor }} strokeWidth={2.5} />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

function FeaturePillars() {
  return (
    <motion.div variants={itemVariants}>
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-4 w-px bg-blue-500/60 rounded-full" />
          <span className="label-mono text-slate-650 dark:text-slate-300 font-extrabold">Core Platform Pillars</span>
        </div>
        <span className="text-[0.75rem] text-slate-500 dark:text-slate-400 font-bold hidden sm:block">
          Evaluate each architectural core explicitly
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {PILLARS.map((pillar) => (
          <PillarCard key={pillar.title} pillar={pillar} />
        ))}
      </div>
    </motion.div>
  )
}

// ─── Workflow Flowchart Visualization ────────────────────────────────────────

function WorkflowNode({
  title,
  subtitle,
  icon: Icon,
  status,
  colorClass,
}: {
  title: string
  subtitle: string
  icon: React.ElementType
  status: 'completed' | 'active' | 'pending'
  colorClass: string
}) {
  return (
    <div className={cn(
      "flex flex-col items-center p-3 rounded-2xl border text-center transition-all duration-300 relative w-full sm:w-28",
      status === 'active'
        ? "bg-white dark:bg-slate-900 border-blue-500 dark:border-blue-400 shadow-md ring-1 ring-blue-500/20 scale-105"
        : status === 'completed'
        ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10"
        : "bg-slate-50/30 dark:bg-white/[0.01] border-slate-200/40 dark:border-white/[0.02] opacity-60"
    )}>
      {/* Status dot */}
      <span className={cn(
        "absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white shadow-sm",
        status === 'completed' ? "bg-emerald-500" : status === 'active' ? "bg-blue-500 animate-pulse" : "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
      )}>
        {status === 'completed' && '✓'}
        {status === 'active' && '●'}
        {status === 'pending' && '○'}
      </span>

      <div className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl mb-2",
        status === 'active'
          ? "bg-blue-500 text-white glow-blue"
          : status === 'completed'
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-slate-100 dark:bg-white/5 text-slate-400"
      )}>
        <Icon className="h-4.5 w-4.5" strokeWidth={2} />
      </div>
      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate w-full">{title}</p>
      <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5 truncate w-full">{subtitle}</p>
    </div>
  )
}

function WorkflowViz({ data }: { data?: any[] }) {
  const defaultNodes = [
    {"title": "Lead Intake", "subtitle": "Webhooks & Form", "icon": "mail", "status": "completed"},
    {"title": "Enrichment", "subtitle": "Clearbit & AI", "icon": "search", "status": "completed"},
    {"title": "Smart Pitch", "subtitle": "Outreach Sequencer", "icon": "sparkles", "status": "active"},
    {"title": "CRM Sync", "subtitle": "HubSpot Push", "icon": "table", "status": "pending"},
    {"title": "Review Flag", "subtitle": "HITL Verification", "icon": "shield", "status": "pending"}
  ]

  const nodes = data || defaultNodes

  return (
    <Card className="glass relative h-full flex flex-col justify-between overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/[0.04] bg-slate-50/20 dark:bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Icons.network className="h-4 w-4 text-blue-500" strokeWidth={2} />
            Lead Intake & Sync Workflow
          </CardTitle>
          <span className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded">
            Active Loop
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-6 flex-1 flex flex-col justify-center">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-1.5 relative">
          {nodes.map((node: any, index: number) => {
            const Icon = getIconByName(node.icon)
            return (
              <div key={node.title} className="flex flex-col sm:flex-row items-center flex-1 w-full">
                <WorkflowNode
                  title={node.title}
                  subtitle={node.subtitle}
                  icon={Icon}
                  status={node.status}
                  colorClass="text-blue-500"
                />
                {index < nodes.length - 1 && (
                  <div className="hidden sm:block h-0.5 flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 relative mx-1">
                    {node.status === 'completed' && (
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Live Activity Feed ──────────────────────────────────────────────────────

function LiveActivityFeed({ data }: { data?: any[] }) {
  const defaultActivities = [
    {
      id: 1,
      title: 'Lead Enriched',
      description: 'Acme Corp profile updated with 14 custom fields.',
      time: '2m ago',
      icon: 'search',
      color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10',
      badge: 'AI Success',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    {
      id: 2,
      title: 'HubSpot Synced',
      description: 'Deals table updated for pipeline sync loop.',
      time: '8m ago',
      icon: 'table',
      color: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10',
      badge: 'API Push',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
    {
      id: 3,
      title: 'Human Review Requested',
      description: 'Clearbit API credit limits escalated.',
      time: '14m ago',
      icon: 'shield',
      color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10',
      badge: 'HITL Trigger',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
    {
      id: 4,
      title: 'Slack Message Routed',
      description: 'Lead notification pushed to sales group.',
      time: '25m ago',
      icon: 'messageSquare',
      color: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10',
      badge: 'Routed',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    },
  ]

  const activities = data || defaultActivities

  return (
    <Card className="glass relative h-full flex flex-col justify-between overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/[0.04] bg-slate-50/20 dark:bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Icons.activity className="h-4 w-4 text-emerald-500 animate-pulse" strokeWidth={2} />
            Live Activity Feed
          </CardTitle>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-4 flex-1">
        <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
          <AnimatePresence>
            {activities.map((act: any) => {
              const Icon = getIconByName(act.icon)
              return (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-3 text-xs leading-relaxed p-2.5 rounded-xl border border-slate-100 dark:border-white/[0.03] hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm", act.color)}>
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-bold text-slate-800 dark:text-slate-100">{act.title}</p>
                      <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 shrink-0">{act.time}</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold">{act.description}</p>
                    <div className="pt-1.5">
                      <span className={cn("inline-block rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase border", act.badgeColor)}>
                        {act.badge}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── AI Governance Status Monitor ────────────────────────────────────────────

function GovernanceCard({ data }: { data?: any }) {
  const gov = data || {
    compliance_score: 99.8,
    active_policies: 18,
    hitl_queue: 3,
    compliance_status: "Certified (SOC2)",
    escalation_rate: 0.8
  }

  return (
    <Card className="glass relative h-full flex flex-col justify-between overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/[0.04] bg-slate-50/20 dark:bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Icons.shield className="h-4 w-4 text-indigo-500" strokeWidth={2} />
            AI Governance & Guardrails
          </CardTitle>
          <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded">
            Secured
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-5 pb-5 space-y-4">
        {/* Compliance Rating */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-650 dark:text-slate-400">Model Compliance Score</span>
            <span className="text-emerald-600 dark:text-emerald-400">{gov.compliance_score}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/[0.04] overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-550 ease-out" style={{ width: `${gov.compliance_score}%` }} />
          </div>
        </div>

        {/* Governance Metrics Grid */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="rounded-xl border border-slate-100 dark:border-white/[0.03] p-3 text-left bg-slate-50/30 dark:bg-white/[0.01]">
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Policies</p>
            <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-1">{gov.active_policies} Rules</p>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-white/[0.03] p-3 text-left bg-slate-50/30 dark:bg-white/[0.01]">
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">HITL Review Queue</p>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{gov.hitl_queue} Pending</p>
              {gov.hitl_queue > 0 && <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-white/[0.03] p-3 text-left bg-slate-50/30 dark:bg-white/[0.01]">
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Compliance Status</p>
            <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{gov.compliance_status}</p>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-white/[0.03] p-3 text-left bg-slate-50/30 dark:bg-white/[0.01]">
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Escalation rate</p>
            <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-1">{gov.escalation_rate}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Integrations Grid ────────────────────────────────────────────────────────

function IntegrationsGrid({ data }: { data?: any[] }) {
  const defaultIntegrations = [
    { name: 'Slack', status: 'Connected', icon: 'messageSquare', color: 'text-amber-500' },
    { name: 'Outlook', status: 'Connected', icon: 'mail', color: 'text-blue-500' },
    { name: 'HubSpot', status: 'Connected', icon: 'table', color: 'text-orange-500' },
    { name: 'Supervity', status: 'Sync Active', icon: 'zap', color: 'text-purple-500' },
    { name: 'Webhooks', status: 'Operational', icon: 'network', color: 'text-emerald-500' },
  ]

  const integrations = data || defaultIntegrations

  return (
    <Card className="glass relative h-full flex flex-col justify-between overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/[0.04] bg-slate-50/20 dark:bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Icons.grid className="h-4 w-4 text-purple-500" strokeWidth={2} />
            Enterprise Integrations
          </CardTitle>
          <span className="text-[9px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-widest bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded">
            {integrations.length} Connected
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-4 flex-1">
        <div className="grid grid-cols-2 gap-2.5">
          {integrations.map((int: any) => {
            const Icon = getIconByName(int.icon)
            return (
              <div key={int.name} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-white/[0.03] bg-slate-50/20 dark:bg-white/[0.01] hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200/40 dark:border-white/[0.05]")}>
                  <Icon className={cn("h-4 w-4", int.color)} strokeWidth={2} />
                </div>
                <div className="min-w-0 font-display">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{int.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-dot" />
                    <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 truncate">{int.status}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── System Diagnostics CLI Terminal ──────────────────────────────────────────

function DiagnosticsCard({ onCommandSuccess }: { onCommandSuccess?: () => void }) {
  const [commandInput, setCommandInput] = useState('')
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    '========================================================================',
    '🤖 AUTOPILOT ENTERPRISE WORKFORCE COMMAND LINE CENTER (v2.0)',
    '========================================================================',
    '[SYSTEM]: Interoperable AI Console active at http://localhost:8001',
    '[GOVT]: GDPR Article 17, SEC Rule 17a-4, and SOC2 policy modules online.',
    '',
    "Type 'help' to inspect available workforce operations.",
    '------------------------------------------------------------------------',
  ])
  const [isLoading, setIsLoading] = useState(false)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // Keep terminal scrolled to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [consoleLogs])

  const executeCommand = async (cmd: string) => {
    const trimmed = cmd.trim()
    if (!trimmed) return

    setConsoleLogs((prev) => [...prev, `autopilot@command-center:~$ ${trimmed}`])
    setIsLoading(true)
    
    // Simulate natural response lag for console
    await new Promise((resolve) => setTimeout(resolve, 400))

    let output: string[] = []

    try {
      // Hit the real backend CLI executor!
      const res = await apiClient.post<{ output: string[] }>('/api/ai/execute-cli', {
        command: trimmed
      })
      
      if (res.output && res.output.length > 0 && res.output[0] === "CLEAR") {
        setConsoleLogs([])
        setIsLoading(false)
        return
      }
      
      output = res.output || []
      
      // Trigger a state update on the parent page so cards, workflow nodes, and activities reload in real-time!
      if (onCommandSuccess) {
        onCommandSuccess()
      }
    } catch (err) {
      output = [
        `Error: Failed to connect to core API server: ${(err as Error).message}`,
        "Please ensure the backend server is running on http://localhost:8001"
      ]
    }

    setConsoleLogs((prev) => [...prev, ...output, ''])
    setIsLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = commandInput
      setCommandInput('')
      executeCommand(value)
    }
  }

  return (
    <Card className="relative col-span-12 h-full overflow-hidden glass">
      <CardHeader className="relative z-10 pb-3 border-b border-slate-100 dark:border-white/[0.04] bg-slate-50/20 dark:bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Icons.command className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.8} />
            </div>
            Enterprise Workforce CLI Command Terminal
          </CardTitle>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/40 dark:border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Interoperable Console: Active
            </span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
          Communicate directly with autonomous operators, query dynamic compliance records, and resolve Human-in-the-loop (HITL) workbench exceptions using native command lines.
        </p>

        {/* Screen */}
        <div className="bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl p-4 h-72 overflow-y-auto flex flex-col gap-1 border border-slate-900 shadow-inner scrollbar-thin scrollbar-thumb-emerald-950">
          {consoleLogs.map((logLine, idx) => (
            <div key={idx} className="whitespace-pre-wrap min-h-[14px]">
              {logLine}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-1.5 text-emerald-500">
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span>executing query...</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Console Input Bar */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.02]">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 shrink-0 font-mono select-none">
            autopilot@command-center:~$
          </span>
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-0 outline-none p-0 text-xs font-mono text-slate-800 dark:text-emerald-400 placeholder-slate-400 dark:placeholder-emerald-950 caret-emerald-500"
            placeholder="Type command (e.g. 'help', 'agents', 'policies', 'enrich vertex.com')..."
            disabled={isLoading}
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-250 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2 py-0.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 select-none font-mono">
            Enter ↵
          </kbd>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function HomePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = async () => {
    try {
      const res = await apiClient.get<any>('/api/ai/dashboard-data')
      setData(res)
    } catch (err) {
      console.error("Failed to fetch backend telemetry:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Header */}
      <HeroSection />

      {/* Stats Cards Row */}
      <motion.div variants={itemVariants} className="space-y-3.5">
        <div className="flex items-center gap-3">
          <div className="h-4 w-px bg-blue-500/60 rounded-full" />
          <span className="label-mono text-slate-650 dark:text-slate-300 font-extrabold">Real-Time Performance (Backend Telemetry)</span>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={data?.stats?.total_users?.value ?? 10400}
            icon={Icons.users}
            trend={data?.stats?.total_users?.trend ? { value: data.stats.total_users.trend, positive: data.stats.total_users.positive } : { value: '+12% this month', positive: true }}
            accentColor="#2563EB"
            glowColor="#2563EB"
            delay={0.05}
          />
          <StatCard
            title="Active Sessions"
            value={data?.stats?.active_sessions?.value ?? 524}
            icon={Icons.activity}
            trend={data?.stats?.active_sessions?.trend ? { value: data.stats.active_sessions.trend, positive: data.stats.active_sessions.positive } : { value: '+8% vs yesterday', positive: true }}
            accentColor="#059669"
            glowColor="#059669"
            delay={0.1}
          />
          <StatCard
            title="Success Rate"
            value={data?.stats?.success_rate?.value ?? 98}
            suffix="%"
            icon={Icons.checkCircle}
            trend={data?.stats?.success_rate?.trend ? { value: data.stats.success_rate.trend, positive: data.stats.success_rate.positive } : { value: '+2% this week', positive: true }}
            accentColor="#7C3AED"
            glowColor="#7C3AED"
            delay={0.15}
          />
          <StatCard
            title="AI Confidence"
            value={data?.stats?.ai_confidence?.value ?? 96}
            suffix="%"
            icon={Icons.sparkles}
            trend={data?.stats?.ai_confidence?.trend ? { value: data.stats.ai_confidence.trend, positive: data.stats.ai_confidence.positive } : { value: 'Stable — nominal', positive: true }}
            accentColor="#0ea5e9"
            glowColor="#0ea5e9"
            delay={0.2}
          />
        </div>
      </motion.div>

      {/* Main Core pillars */}
      <FeaturePillars />

      {/* Workflow Flowchart & Live Activity Section */}
      <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-7 h-full">
          <WorkflowViz data={data?.workflow} />
        </div>
        <div className="md:col-span-5 h-full">
          <LiveActivityFeed data={data?.activities} />
        </div>
      </motion.div>

      {/* Governance & Integrations Row */}
      <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-6 h-full">
          <GovernanceCard data={data?.governance} />
        </div>
        <div className="md:col-span-6 h-full">
          <IntegrationsGrid data={data?.integrations} />
        </div>
      </motion.div>

      {/* Activity Chart Row */}
      <motion.div variants={itemVariants}>
        <div className="mb-4 flex items-center gap-3">
          <div className="h-4 w-px bg-blue-500/60 rounded-full" />
          <span className="label-mono text-slate-650 dark:text-slate-300 font-extrabold">Weekly Telemetry Overview</span>
        </div>
        <ActivityChart className="col-span-12" />
      </motion.div>

      {/* Connection verification panel */}
      <motion.div
        className="grid gap-6 lg:grid-cols-12"
        variants={itemVariants}
      >
        <DiagnosticsCard onCommandSuccess={fetchDashboardData} />
      </motion.div>
    </motion.div>
  )
}
