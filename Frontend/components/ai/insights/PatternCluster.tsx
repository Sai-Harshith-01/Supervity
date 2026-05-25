'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Icons } from '@/components/ui/icons'

export interface Pattern {
  name: string
  frequency: string
  confidence: number
  sample_size?: number
  description?: string
  is_demo?: boolean
}

interface PatternClusterProps {
  patterns: Pattern[]
}

export function PatternCluster({ patterns }: PatternClusterProps) {
  const [selectedPattern, setSelectedPattern] = useState<number | null>(null)

  if (patterns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className={cn(
          'mb-4 flex h-12 w-12 items-center justify-center rounded-xl',
          'bg-slate-50 border border-slate-200'
        )}>
          <Icons.activity className="h-6 w-6 text-slate-400" strokeWidth={1.5} />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-600 font-bold">No patterns detected yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {patterns.map((pattern, idx) => {
        const isSelected = selectedPattern === idx
        
        return (
          <motion.div
            layout
            key={idx}
            onClick={() => setSelectedPattern(isSelected ? null : idx)}
            className={cn(
              'rounded-xl border p-4 cursor-pointer relative transition-all duration-300 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)]',
              isSelected 
                ? 'border-purple-300 bg-purple-50/10 shadow-[0_4px_16px_rgba(147,51,234,0.05)]' 
                : 'border-slate-200 hover:border-slate-350'
            )}
            whileHover={{ y: -1 }}
          >
            {/* Status bar marker */}
            <div className={cn(
              'absolute left-0 top-0 bottom-0 w-[4px] rounded-l-xl transition-all duration-300',
              isSelected ? 'bg-purple-500' : 'bg-transparent'
            )} />

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                {/* Icon badge */}
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 border border-slate-200/80',
                  isSelected ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-slate-50 text-slate-500'
                )}>
                  <Icons.layers className="h-5 w-5" strokeWidth={2} />
                </div>

                {/* Primary Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-slate-900 dark:text-slate-900 leading-snug tracking-tight">{pattern.name}</h4>
                  {pattern.description && (
                    <p className="text-xs text-slate-650 dark:text-slate-650 mt-1 leading-relaxed font-semibold">{pattern.description}</p>
                  )}
                  
                  {/* Secondary info tags */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 text-purple-700 dark:text-purple-700 border border-purple-205/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      {pattern.frequency}
                    </span>
                    {pattern.sample_size && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 text-cyan-700 dark:text-cyan-700 border border-cyan-205/60 px-2 py-0.5 text-[9px] font-bold tracking-wider">
                        {pattern.sample_size.toLocaleString()} Instances
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Confidence Levels */}
              <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                <div className="flex flex-col sm:items-end">
                  <span className="text-sm font-black text-slate-800 dark:text-slate-850">
                    {Math.round(pattern.confidence * 100)}%
                  </span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-500 label-mono font-bold">Signal strength</span>
                </div>

                {/* Interactive Confidence Bar */}
                <div className="w-28 relative pt-1">
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-550 via-indigo-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${pattern.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Expandable Statistics Details */}
            <AnimatePresence initial={false}>
              {isSelected && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-t border-slate-150 pt-4 grid gap-4 grid-cols-2 sm:grid-cols-4"
                >
                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                    <p className="text-[9px] text-slate-500 dark:text-slate-500 label-mono font-bold">Significance</p>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-800 mt-0.5">High Probability</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                    <p className="text-[9px] text-slate-500 dark:text-slate-500 label-mono font-bold">Telemetry Source</p>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-800 mt-0.5">API Gateway Logs</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                    <p className="text-[9px] text-slate-500 dark:text-slate-500 label-mono font-bold">Stability Index</p>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-800 mt-0.5">94.8% Constant</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                    <p className="text-[9px] text-slate-500 dark:text-slate-500 label-mono font-bold">Auto-Routing Status</p>
                    <p className="text-xs font-bold text-purple-700 dark:text-purple-700 mt-0.5 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                      Optimized
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )
      })}
    </div>
  )
}
