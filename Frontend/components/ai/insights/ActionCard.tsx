'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Icons } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

export interface ActionItem {
  title: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimated_impact: string
  action_type?: string
  action_config?: Record<string, unknown>
  is_demo?: boolean
}

interface ActionCardProps {
  action: ActionItem
  onApply?: (action: ActionItem) => void
}

const priorityConfig = {
  critical: {
    color: 'text-red-700 dark:text-red-700',
    bg: 'bg-red-50 border-red-150',
    badge: 'bg-red-50 text-red-700 dark:text-red-700 border border-red-200/60',
    glow: 'hover:shadow-[0_4px_12px_rgba(239,68,68,0.04)]',
  },
  high: {
    color: 'text-amber-700 dark:text-amber-700',
    bg: 'bg-amber-50 border-amber-150',
    badge: 'bg-amber-50 text-amber-750 dark:text-amber-750 border border-amber-200/60',
    glow: 'hover:shadow-[0_4px_12px_rgba(245,158,11,0.04)]',
  },
  medium: {
    color: 'text-blue-750 dark:text-blue-750',
    bg: 'bg-blue-50 border-blue-150',
    badge: 'bg-blue-50 text-blue-750 dark:text-blue-750 border border-blue-200/60',
    glow: 'hover:shadow-[0_4px_12px_rgba(59,130,246,0.04)]',
  },
  low: {
    color: 'text-emerald-700 dark:text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-150',
    badge: 'bg-emerald-50 text-emerald-700 dark:text-emerald-700 border border-emerald-200/60',
    glow: 'hover:shadow-[0_4px_12px_rgba(16,185,129,0.04)]',
  },
}

export function ActionCard({ action, onApply }: ActionCardProps) {
  const [isApplying, setIsApplying] = useState(false)
  const [isDone, setIsDone] = useState(false)
  
  const priority = priorityConfig[action.priority] || priorityConfig.medium

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsApplying(true)
    setTimeout(() => {
      setIsApplying(false)
      setIsDone(true)
      setTimeout(() => {
        onApply?.(action)
      }, 800)
    }, 1200)
  }

  return (
    <div className={cn(
      'flex items-center gap-4 rounded-xl p-4 bg-white border border-slate-200 relative overflow-hidden transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-slate-350',
      priority.glow
    )}>
      
      {/* Accent Indicator bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-[4px]', 
        action.priority === 'critical' ? 'bg-red-500' :
        action.priority === 'high' ? 'bg-amber-500' :
        action.priority === 'medium' ? 'bg-blue-500' :
        'bg-emerald-500'
      )} />

      {/* Icon Badge */}
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 transition-all duration-300',
        priority.bg
      )}>
        <Icons.zap className={cn('h-5 w-5', priority.color)} strokeWidth={2} />
      </div>

      {/* Main Contents */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          {/* Explicit dark:text-slate-900 to override light-default on white cards */}
          <h4 className="font-extrabold text-slate-900 dark:text-slate-900 truncate text-[0.975rem] tracking-tight">{action.title}</h4>
          
          <span className={cn(
            'rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider flex-shrink-0',
            priority.badge
          )}>
            {action.priority}
          </span>
        </div>
        
        <p className="mt-1.5 text-xs flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-500">
          <Icons.trendingUp className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-700" strokeWidth={2} />
          <span className="text-slate-450 dark:text-slate-450 font-bold">Estimated impact:</span>
          <span className="font-extrabold text-emerald-700 dark:text-emerald-700">{action.estimated_impact}</span>
        </p>
      </div>

      {/* Interactive Apply Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleApply}
        disabled={isApplying || isDone}
        className={cn(
          'flex-shrink-0 transition-all rounded-lg text-xs font-bold px-4 border-slate-200 bg-white text-slate-700 dark:text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:hover:text-slate-900',
          isDone ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:text-emerald-700' : ''
        )}
      >
        {isApplying ? (
          <>
            <Icons.loader className="h-3.5 w-3.5 animate-spin mr-1.5 text-slate-500" />
            Applying...
          </>
        ) : isDone ? (
          <>
            <Icons.check className="h-3.5 w-3.5 mr-1.5 text-emerald-700 animate-bounce" />
            Applied
          </>
        ) : (
          <>
            Apply Playbook
            <Icons.arrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={2} />
          </>
        )}
      </Button>
    </div>
  )
}
